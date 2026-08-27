"""
Plant Disease Image Model - Phase 3 Targeted Fine-Tuning
"""

import os
import sys
import json
import time
import shutil
import numpy as np
import pandas as pd
import tensorflow as tf
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint, ReduceLROnPlateau
from sklearn.metrics import classification_report, confusion_matrix
import matplotlib.pyplot as plt
import seaborn as sns
from datetime import datetime

# ── Config ────────────────────────────────────────────────────────────────────
RANDOM_SEED = 42
np.random.seed(RANDOM_SEED)
tf.random.set_seed(RANDOM_SEED)

IMG_SIZE = (224, 224)
BATCH_SIZE = 32

RAW_BASE = r"C:\Projects\SmartAgri\datasets"
SPLITS_DIR = r"C:\Projects\SmartAgri\datasets\plant_disease_splits"
WEIGHTS_JSON = r"C:\Projects\SmartAgri\reports\plant_disease_class_weights.json"

MODEL_DIR = r"C:\Projects\SmartAgri\ai-service\models"
REPORT_DIR = r"C:\Projects\SmartAgri\reports\plant_disease\phase3_targeted"

PHASE2_CHECKPOINT = os.path.join(MODEL_DIR, "plant_disease_mobilenetv2_full_training.keras")
PHASE3_CHECKPOINT = os.path.join(MODEL_DIR, "plant_disease_mobilenetv2_phase3.keras")

# Create report directory
os.makedirs(REPORT_DIR, exist_ok=True)

# Backup phase 2 model
if not os.path.exists(PHASE2_CHECKPOINT):
    print(f"Error: Phase 2 checkpoint not found at {PHASE2_CHECKPOINT}")
    sys.exit(1)

shutil.copy2(PHASE2_CHECKPOINT, PHASE2_CHECKPOINT + ".bak")
print("Created safe backup of Phase 2 model.")

start_time = time.time()

# ── Load Data ─────────────────────────────────────────────────────────────────
print("Loading split manifests...")
train_df = pd.read_csv(os.path.join(SPLITS_DIR, "train.csv"))
val_df = pd.read_csv(os.path.join(SPLITS_DIR, "validation.csv"))
test_df = pd.read_csv(os.path.join(SPLITS_DIR, "test.csv"))

# ── Load Class Weights ────────────────────────────────────────────────────────
print("Loading class weights...")
with open(WEIGHTS_JSON, "r") as f:
    cw_data = json.load(f)
class_index = cw_data["class_index"]
num_classes = len(class_index)

class_weight = {class_index[k]: v for k, v in cw_data["class_weights"].items()}

# Apply targeted multipliers for weak classes conservatively (1.5x - 1.7x)
weak_classes_multipliers = {
    "Tomato___Early_blight": 1.7,
    "Tomato___Target_Spot": 1.7,
    "Tomato___Late_blight": 1.5,
    "Tomato___Leaf_Mold": 1.5,
    "Tomato___Septoria_leaf_spot": 1.5,
    "Tomato___Spider_mites Two-spotted_spider_mite": 1.5,
    "Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot": 1.5,
    "Corn_(maize)___Northern_Leaf_Blight": 1.5
}

for cls, mult in weak_classes_multipliers.items():
    if cls in class_index:
        idx = class_index[cls]
        class_weight[idx] *= mult

print("Applied targeted multipliers to weak classes.")

# ── Data Generators ───────────────────────────────────────────────────────────
print("Initializing Data Generators...")
train_datagen = ImageDataGenerator(
    rescale=1./255,
    rotation_range=15,
    width_shift_range=0.1,
    height_shift_range=0.1,
    zoom_range=0.1,
    horizontal_flip=True,
    brightness_range=[0.9, 1.1]
)
val_test_datagen = ImageDataGenerator(rescale=1./255)

train_df['absolute_path'] = train_df['image_path'].apply(lambda x: os.path.join(RAW_BASE, x.replace('\\', '/')))
val_df['absolute_path'] = val_df['image_path'].apply(lambda x: os.path.join(RAW_BASE, x.replace('\\', '/')))
test_df['absolute_path'] = test_df['image_path'].apply(lambda x: os.path.join(RAW_BASE, x.replace('\\', '/')))

train_generator = train_datagen.flow_from_dataframe(
    dataframe=train_df, x_col='absolute_path', y_col='class_name', target_size=IMG_SIZE,
    batch_size=BATCH_SIZE, class_mode='categorical', seed=RANDOM_SEED, shuffle=True
)
val_generator = val_test_datagen.flow_from_dataframe(
    dataframe=val_df, x_col='absolute_path', y_col='class_name', target_size=IMG_SIZE,
    batch_size=BATCH_SIZE, class_mode='categorical', seed=RANDOM_SEED, shuffle=False
)
test_generator = val_test_datagen.flow_from_dataframe(
    dataframe=test_df, x_col='absolute_path', y_col='class_name', target_size=IMG_SIZE,
    batch_size=BATCH_SIZE, class_mode='categorical', seed=RANDOM_SEED, shuffle=False
)

# ── Load Model ────────────────────────────────────────────────────────────────
print("\nLoading Phase 2 model...")
model = load_model(PHASE2_CHECKPOINT)

# Print architecture info
total_layers = len(model.layers)
print(f"Total layers: {total_layers}")

# Unfreeze roughly the top 55 layers of the model
for layer in model.layers:
    layer.trainable = True
for layer in model.layers[:-55]:
    layer.trainable = False

trainable_layers = sum([1 for l in model.layers if l.trainable])
frozen_layers = total_layers - trainable_layers

trainable_params = sum([tf.keras.backend.count_params(w) for w in model.trainable_weights])
non_trainable_params = sum([tf.keras.backend.count_params(w) for w in model.non_trainable_weights])
total_params = trainable_params + non_trainable_params

print(f"Trainable layers: {trainable_layers}")
print(f"Frozen layers: {frozen_layers}")
print(f"Trainable parameter count: {trainable_params:,}")
print(f"Total parameter count: {total_params:,}")

# ── Training Phase 3 ──────────────────────────────────────────────────────────
print("\nStarting Phase 3 Training (Targeted Fine-tuning)...")

model.compile(
    optimizer=tf.keras.optimizers.Adam(learning_rate=5e-6),
    loss='categorical_crossentropy',
    metrics=['accuracy']
)

callbacks_p3 = [
    EarlyStopping(monitor='val_loss', patience=2, restore_best_weights=True),
    ModelCheckpoint(PHASE3_CHECKPOINT, monitor='val_loss', save_best_only=True),
    ReduceLROnPlateau(monitor='val_loss', factor=0.5, patience=1, min_lr=1e-7, verbose=1)
]

history_p3 = model.fit(
    train_generator,
    epochs=3,
    validation_data=val_generator,
    class_weight=class_weight,
    callbacks=callbacks_p3
)

# ── Evaluate on Test Set ──────────────────────────────────────────────────────
print("\nEvaluating on Test Set...")
model.load_weights(PHASE3_CHECKPOINT)
test_generator.reset()
test_loss, test_acc = model.evaluate(test_generator)

print("Generating predictions...")
test_generator.reset()
y_pred_probs = model.predict(test_generator)
y_pred = np.argmax(y_pred_probs, axis=1)
y_true = test_generator.classes

# ── Metrics ───────────────────────────────────────────────────────────────────
class_labels = list(class_index.keys())
report_dict = classification_report(y_true, y_pred, target_names=class_labels, output_dict=True)

macro_precision = report_dict['macro avg']['precision']
macro_recall = report_dict['macro avg']['recall']
macro_f1 = report_dict['macro avg']['f1-score']

weighted_precision = report_dict['weighted avg']['precision']
weighted_recall = report_dict['weighted avg']['recall']
weighted_f1 = report_dict['weighted avg']['f1-score']

report_df = pd.DataFrame(report_dict).transpose()
report_df.to_csv(os.path.join(REPORT_DIR, "classification_report.csv"))

cm = confusion_matrix(y_true, y_pred)
plt.figure(figsize=(20, 18))
sns.heatmap(cm, annot=False, cmap='Blues', xticklabels=class_labels, yticklabels=class_labels)
plt.title('Confusion Matrix (Phase 3 Targeted)')
plt.xlabel('Predicted')
plt.ylabel('True')
plt.xticks(rotation=90)
plt.tight_layout()
plt.savefig(os.path.join(REPORT_DIR, "confusion_matrix.png"), dpi=300)
plt.close()

class_recs = []
for cls in class_labels:
    class_recs.append({'class': cls, 'recall': report_dict[cls]['recall']})
lowest_recs = sorted(class_recs, key=lambda x: x['recall'])[:5]
min_per_class_recall = lowest_recs[0]['recall']

metadata = {
    "experiment": "phase3_targeted",
    "training_configuration": {
        "learning_rate": 5e-6,
        "epochs": 3,
        "trainable_layer_count": trainable_layers,
        "trainable_parameter_count": trainable_params
    },
    "final_test_metrics": {
        "accuracy": test_acc,
        "macro_precision": macro_precision,
        "macro_recall": macro_recall,
        "macro_f1": macro_f1,
        "weighted_precision": weighted_precision,
        "weighted_recall": weighted_recall,
        "weighted_f1": weighted_f1,
        "min_per_class_recall": min_per_class_recall
    },
    "timestamp": datetime.now().isoformat(),
    "checkpoint_path": PHASE3_CHECKPOINT
}
with open(os.path.join(REPORT_DIR, "phase3_targeted_metadata.json"), "w") as f:
    json.dump(metadata, f, indent=4)

# ── Phase 2 vs Phase 3 Comparison ─────────────────────────────────────────────
p2_acc = 0.9235122307
p2_mrec = 0.9117295981
p2_mf1 = 0.9018948019
p2_min_rec = 0.6263

p2_classes = {
    "Tomato___Early_blight": 0.6263,
    "Tomato___Target_Spot": 0.6571,
    "Tomato___Late_blight": 0.7606,
    "Tomato___Leaf_Mold": 0.9375,
    "Tomato___Septoria_leaf_spot": 0.8159,
    "Tomato___Spider_mites Two-spotted_spider_mite": 0.8155,
    "Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot": 0.8039,
    "Corn_(maize)___Northern_Leaf_Blight": 0.7653
}

print("\n" + "="*60)
print("PHASE 2 vs PHASE 3")
print("="*60)
print(f"{'Metric':<35} {'Phase 2':<13} {'Phase 3':<13} {'Change':<13}")
print("-" * 60)
print(f"{'Accuracy':<35} {p2_acc:.2%}        {test_acc:.2%}        {test_acc - p2_acc:+.2%}")
print(f"{'Macro Recall':<35} {p2_mrec:.2%}        {macro_recall:.2%}        {macro_recall - p2_mrec:+.2%}")
print(f"{'Macro F1':<35} {p2_mf1:.2%}        {macro_f1:.2%}        {macro_f1 - p2_mf1:+.2%}")
print(f"{'Minimum Class Recall':<35} {p2_min_rec:.2%}        {min_per_class_recall:.2%}        {min_per_class_recall - p2_min_rec:+.2%}")
print("")
for cls, p2_val in p2_classes.items():
    p3_val = report_dict[cls]['recall']
    cls_short = cls.replace("Tomato___", "Tom_").replace("Corn_(maize)___", "Corn_")[:33]
    print(f"{cls_short:<35} {p2_val:.2%}        {p3_val:.2%}        {p3_val - p2_val:+.2%}")

print("\n" + "="*60)
print("PHASE 3 COMPLETE\n")

print(f"Phase 2 Accuracy: {p2_acc:.2%}")
print(f"Phase 3 Accuracy: {test_acc:.2%}\n")
print(f"Phase 2 Macro F1: {p2_mf1:.2%}")
print(f"Phase 3 Macro F1: {macro_f1:.2%}\n")
print(f"Phase 2 Macro Recall: {p2_mrec:.2%}")
print(f"Phase 3 Macro Recall: {macro_recall:.2%}\n")

print(f"Weakest Phase 2 class: Tomato___Early_blight")
print(f"Phase 2 Recall: {p2_classes['Tomato___Early_blight']:.2%}")
print(f"Phase 3 Recall: {report_dict['Tomato___Early_blight']['recall']:.2%}\n")

if macro_f1 >= p2_mf1 - 0.005 and report_dict['Tomato___Early_blight']['recall'] > p2_classes['Tomato___Early_blight']:
    print("RECOMMENDATION:\nUSE PHASE 3")
elif macro_f1 < p2_mf1 - 0.01 or min_per_class_recall < p2_min_rec - 0.01:
    print("RECOMMENDATION:\nKEEP PHASE 2")
else:
    print("RECOMMENDATION:\nUSE PHASE 3")
