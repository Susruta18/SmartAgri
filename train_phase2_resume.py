"""
Plant Disease Image Model - Phase 2 Resume
==========================================
Loads the saved Phase 1 model and runs Phase 2 (fine-tuning).
Generates the final reports after completion.
"""

import os
import sys
import json
import time
import numpy as np
import pandas as pd
import tensorflow as tf
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint, ReduceLROnPlateau
from sklearn.metrics import classification_report, confusion_matrix
import matplotlib.pyplot as plt
import seaborn as sns

# ── Config ────────────────────────────────────────────────────────────────────
RANDOM_SEED = 42
np.random.seed(RANDOM_SEED)
tf.random.set_seed(RANDOM_SEED)

IMG_SIZE = (224, 224)
BATCH_SIZE = 32

RAW_BASE    = r"C:\Projects\SmartAgri\datasets"
SPLITS_DIR  = r"C:\Projects\SmartAgri\datasets\plant_disease_splits"
WEIGHTS_JSON = r"C:\Projects\SmartAgri\reports\plant_disease_class_weights.json"
BASELINE_METRICS_JSON = r"C:\Projects\SmartAgri\reports\plant_disease_baseline_metrics.json"

MODEL_DIR   = r"C:\Projects\SmartAgri\ai-service\models"
REPORT_DIR  = r"C:\Projects\SmartAgri\reports\plant_disease_full_training"
FINAL_REPORT = r"C:\Projects\SmartAgri\reports\plant_disease_full_training_report.md"
COMPARISON_REPORT = r"C:\Projects\SmartAgri\reports\plant_disease_full_training_comparison.md"
CHECKPOINT_PATH = os.path.join(MODEL_DIR, "plant_disease_mobilenetv2_full_training.keras")

start_time = time.time()

# ── Load Data ─────────────────────────────────────────────────────────────────
print("Loading split manifests...")
train_df = pd.read_csv(os.path.join(SPLITS_DIR, "train.csv"))
val_df   = pd.read_csv(os.path.join(SPLITS_DIR, "validation.csv"))
test_df  = pd.read_csv(os.path.join(SPLITS_DIR, "test.csv"))

# ── Load Class Weights ────────────────────────────────────────────────────────
print("Loading class weights...")
with open(WEIGHTS_JSON, "r") as f:
    cw_data = json.load(f)
class_index = cw_data["class_index"]
num_classes = len(class_index)
class_weight = {class_index[k]: v for k, v in cw_data["class_weights"].items()}

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
if not os.path.exists(CHECKPOINT_PATH):
    print(f"Error: Could not find Phase 1 checkpoint at {CHECKPOINT_PATH}")
    sys.exit(1)

print("\nLoading Phase 1 model...")
model = load_model(CHECKPOINT_PATH)

# ── Training Phase 2 ──────────────────────────────────────────────────────────
print("\nStarting Phase 2 Training (Fine-tuning)...")

# Unfreeze last 30 layers of the base model plus the 4 added classification layers
model.trainable = True
for layer in model.layers[:-34]:
    layer.trainable = False


model.compile(
    optimizer=tf.keras.optimizers.Adam(learning_rate=1e-5),
    loss='categorical_crossentropy',
    metrics=['accuracy']
)

callbacks_p2 = [
    EarlyStopping(monitor='val_loss', patience=4, restore_best_weights=True),
    ModelCheckpoint(CHECKPOINT_PATH, monitor='val_loss', save_best_only=True),
    ReduceLROnPlateau(monitor='val_loss', factor=0.5, patience=2, min_lr=1e-7, verbose=1)
]

history_p2 = model.fit(
    train_generator,
    epochs=1,  # Same as original script
    validation_data=val_generator,
    class_weight=class_weight,
    callbacks=callbacks_p2
)

training_duration = time.time() - start_time

# ── Evaluate on Test Set ──────────────────────────────────────────────────────
print("\nEvaluating on Test Set...")
model.load_weights(CHECKPOINT_PATH)
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

report_df = pd.DataFrame(report_dict).transpose()
report_df.to_csv(os.path.join(REPORT_DIR, "classification_report.csv"))

cm = confusion_matrix(y_true, y_pred)
plt.figure(figsize=(20, 18))
sns.heatmap(cm, annot=False, cmap='Blues', xticklabels=class_labels, yticklabels=class_labels)
plt.title('Confusion Matrix (Phase 2 Resume)')
plt.xlabel('Predicted')
plt.ylabel('True')
plt.xticks(rotation=90)
plt.tight_layout()
plt.savefig(os.path.join(REPORT_DIR, "confusion_matrix.png"), dpi=300)
plt.close()

with open(BASELINE_METRICS_JSON, "r") as f:
    baseline_metrics = json.load(f)

b_mf1 = baseline_metrics['macro_f1']
min_per_class_recall = min([report_dict[cls]['recall'] for cls in class_labels])

# Output metrics
print(f"\nNEW MACRO F1: {macro_f1:.4f}")
print(f"NEW MACRO RECALL: {macro_recall:.4f}")
print(f"NEW ACCURACY: {test_acc:.4f}")
print(f"MINIMUM PER-CLASS RECALL: {min_per_class_recall:.4f}")

metadata = {
    "experiment": "phase2_resume",
    "final_test_metrics": {
        "accuracy": test_acc,
        "macro_precision": macro_precision,
        "macro_recall": macro_recall,
        "macro_f1": macro_f1
    }
}
with open(os.path.join(MODEL_DIR, "phase2_resume_metadata.json"), "w") as f:
    json.dump(metadata, f, indent=4)

print("\nPhase 2 Complete. Report generated.")
