"""
Plant Disease Image Model - Training Script
===========================================
Model: MobileNetV2
Input: 224x224x3
Classes: 38
"""

import os
import sys
import json
import argparse
import numpy as np
import pandas as pd
import tensorflow as tf
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.layers import Dense, GlobalAveragePooling2D, Dropout
from tensorflow.keras.models import Model
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

RAW_BASE    = r"C:\Projects\SmartAgri\datasets"
SPLITS_DIR  = r"C:\Projects\SmartAgri\datasets\plant_disease_splits"
WEIGHTS_JSON = r"C:\Projects\SmartAgri\reports\plant_disease_class_weights.json"

MODEL_DIR   = r"C:\Projects\SmartAgri\ai-service\models"
REPORT_DIR  = r"C:\Projects\SmartAgri\reports\plant_disease_training"
ERROR_REPORT = r"C:\Projects\SmartAgri\reports\plant_disease_error_analysis.md"
FINAL_REPORT = r"C:\Projects\SmartAgri\reports\plant_disease_training_report.md"

os.makedirs(MODEL_DIR, exist_ok=True)
os.makedirs(REPORT_DIR, exist_ok=True)

# ── Args ──────────────────────────────────────────────────────────────────────
parser = argparse.ArgumentParser()
parser.add_argument("--sanity-check", action="store_true", help="Run a fast sanity check only")
parser.add_argument("--epochs1", type=int, default=15, help="Phase 1 epochs")
parser.add_argument("--epochs2", type=int, default=30, help="Phase 2 epochs")
args = parser.parse_args()

if args.sanity_check:
    print(">>> RUNNING IN SANITY CHECK MODE <<<")
    args.epochs1 = 1
    args.epochs2 = 1
    BATCH_SIZE = 8

# ── Print Environment ─────────────────────────────────────────────────────────
print("=" * 60)
print(f"TensorFlow Version: {tf.__version__}")
gpus = tf.config.list_physical_devices('GPU')
if gpus:
    print(f"GPUs Available: {[g.name for g in gpus]}")
else:
    print("GPUs Available: None (Running on CPU)")
print("=" * 60)

# ── Load Data ─────────────────────────────────────────────────────────────────
print("Loading split manifests...")
train_df = pd.read_csv(os.path.join(SPLITS_DIR, "train.csv"))
val_df   = pd.read_csv(os.path.join(SPLITS_DIR, "validation.csv"))
test_df  = pd.read_csv(os.path.join(SPLITS_DIR, "test.csv"))

if args.sanity_check:
    # Take a small subset for sanity check to make it fast
    train_df = train_df.groupby('class_name').head(2).reset_index(drop=True)
    val_df   = val_df.groupby('class_name').head(1).reset_index(drop=True)
    test_df  = test_df.groupby('class_name').head(1).reset_index(drop=True)

# ── Load Class Weights ────────────────────────────────────────────────────────
print("Loading class weights...")
with open(WEIGHTS_JSON, "r") as f:
    cw_data = json.load(f)
class_weights_dict = cw_data["class_weights"]
class_index = cw_data["class_index"]
num_classes = len(class_index)
print(f"Found {num_classes} classes in weights file.")

# Convert string keys to int indices for Keras
class_weight = {class_index[k]: v for k, v in class_weights_dict.items()}

# ── Data Generators ───────────────────────────────────────────────────────────
print("Initializing Data Generators...")

# Data augmentation for training
train_datagen = ImageDataGenerator(
    rescale=1./255,
    rotation_range=15,
    width_shift_range=0.1,
    height_shift_range=0.1,
    zoom_range=0.1,
    horizontal_flip=True,
    brightness_range=[0.9, 1.1]
)

# No augmentation for validation/test
val_test_datagen = ImageDataGenerator(rescale=1./255)

# Ensure absolute paths for ImageDataGenerator
train_df['absolute_path'] = train_df['image_path'].apply(lambda x: os.path.join(RAW_BASE, x.replace('\\', '/')))
val_df['absolute_path'] = val_df['image_path'].apply(lambda x: os.path.join(RAW_BASE, x.replace('\\', '/')))
test_df['absolute_path'] = test_df['image_path'].apply(lambda x: os.path.join(RAW_BASE, x.replace('\\', '/')))

train_generator = train_datagen.flow_from_dataframe(
    dataframe=train_df,
    x_col='absolute_path',
    y_col='class_name',
    target_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    class_mode='categorical',
    seed=RANDOM_SEED,
    shuffle=True
)

# Enforce same class indices as the class_weights mapping
if train_generator.class_indices != class_index:
    print("Warning: ImageDataGenerator class indices differ from class_weights json!")
    # Workaround: we know the json is sorted alphabetically, which flow_from_dataframe also uses by default.
    assert train_generator.class_indices == class_index, "Class index mismatch"

val_generator = val_test_datagen.flow_from_dataframe(
    dataframe=val_df,
    x_col='absolute_path',
    y_col='class_name',
    target_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    class_mode='categorical',
    seed=RANDOM_SEED,
    shuffle=False
)

test_generator = val_test_datagen.flow_from_dataframe(
    dataframe=test_df,
    x_col='absolute_path',
    y_col='class_name',
    target_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    class_mode='categorical',
    seed=RANDOM_SEED,
    shuffle=False
)

if args.sanity_check:
    print("Data loading sanity check passed.")

# ── Build Model ───────────────────────────────────────────────────────────────
print("\nBuilding MobileNetV2 model...")
base_model = MobileNetV2(
    input_shape=(IMG_SIZE[0], IMG_SIZE[1], 3),
    include_top=False,
    weights='imagenet'
)

# Phase 1: Freeze base
base_model.trainable = False

x = base_model.output
x = GlobalAveragePooling2D()(x)
x = Dense(256, activation='relu')(x)
x = Dropout(0.3)(x)
predictions = Dense(num_classes, activation='softmax')(x)

model = Model(inputs=base_model.input, outputs=predictions)

model.compile(
    optimizer=tf.keras.optimizers.Adam(learning_rate=1e-3),
    loss='categorical_crossentropy',
    metrics=['accuracy']
)

if args.sanity_check:
    print("Model compilation sanity check passed.")
    print("Running dummy forward pass...")
    batch_x, batch_y = next(iter(train_generator))
    preds = model.predict(batch_x)
    print(f"Output shape: {preds.shape}, Expected: {(BATCH_SIZE, num_classes)}")
    
    print("Running 1 epoch sanity training...")
    history = model.fit(
        train_generator,
        steps_per_epoch=1,
        epochs=1,
        validation_data=val_generator,
        validation_steps=1,
        class_weight=class_weight,
        verbose=1
    )
    print("\nSANITY CHECK SUCCESSFUL")
    sys.exit(0)

# ── Training Phase 1 ──────────────────────────────────────────────────────────
print("\nStarting Phase 1 Training (Frozen Base)...")

checkpoint_path = os.path.join(MODEL_DIR, "plant_disease_mobilenetv2.keras")
callbacks_p1 = [
    EarlyStopping(monitor='val_loss', patience=5, restore_best_weights=True),
    ModelCheckpoint(checkpoint_path, monitor='val_loss', save_best_only=True)
]

history_p1 = model.fit(
    train_generator,
    epochs=args.epochs1,
    steps_per_epoch=10,
    validation_data=val_generator,
    validation_steps=5,
    class_weight=class_weight,
    callbacks=callbacks_p1
)

# ── Training Phase 2 ──────────────────────────────────────────────────────────
print("\nStarting Phase 2 Training (Fine-tuning)...")

# Unfreeze last 30 layers
base_model.trainable = True
for layer in base_model.layers[:-30]:
    layer.trainable = False

model.compile(
    optimizer=tf.keras.optimizers.Adam(learning_rate=1e-5),
    loss='categorical_crossentropy',
    metrics=['accuracy']
)

callbacks_p2 = [
    EarlyStopping(monitor='val_loss', patience=7, restore_best_weights=True),
    ModelCheckpoint(checkpoint_path, monitor='val_loss', save_best_only=True),
    ReduceLROnPlateau(monitor='val_loss', factor=0.5, patience=3, min_lr=1e-7, verbose=1)
]

history_p2 = model.fit(
    train_generator,
    epochs=args.epochs2,
    steps_per_epoch=10,
    validation_data=val_generator,
    validation_steps=5,
    class_weight=class_weight,
    callbacks=callbacks_p2
)

# ── Evaluate on Test Set ──────────────────────────────────────────────────────
print("\nEvaluating on Test Set...")
model.load_weights(checkpoint_path) # Ensure best weights

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
report_str = classification_report(y_true, y_pred, target_names=class_labels)

macro_precision = report_dict['macro avg']['precision']
macro_recall = report_dict['macro avg']['recall']
macro_f1 = report_dict['macro avg']['f1-score']

weighted_precision = report_dict['weighted avg']['precision']
weighted_recall = report_dict['weighted avg']['recall']
weighted_f1 = report_dict['weighted avg']['f1-score']

# ── Save Classification Report ────────────────────────────────────────────────
report_df = pd.DataFrame(report_dict).transpose()
report_df.to_csv(os.path.join(REPORT_DIR, "classification_report.csv"))

# ── Save Confusion Matrix ─────────────────────────────────────────────────────
cm = confusion_matrix(y_true, y_pred)
plt.figure(figsize=(20, 18))
sns.heatmap(cm, annot=False, cmap='Blues', xticklabels=class_labels, yticklabels=class_labels)
plt.title('Confusion Matrix')
plt.xlabel('Predicted')
plt.ylabel('True')
plt.xticks(rotation=90)
plt.tight_layout()
plt.savefig(os.path.join(REPORT_DIR, "confusion_matrix.png"), dpi=300)
plt.close()

# ── Save Training Curves ──────────────────────────────────────────────────────
def plot_history(hist1, hist2, metric, title, filename):
    plt.figure(figsize=(10, 6))
    val1 = hist1.history[metric]
    val_val1 = hist1.history[f'val_{metric}']
    
    val2 = hist2.history[metric]
    val_val2 = hist2.history[f'val_{metric}']
    
    plt.plot(val1 + val2, label=f'Train {metric}')
    plt.plot(val_val1 + val_val2, label=f'Val {metric}')
    
    plt.axvline(x=len(val1)-1, color='r', linestyle='--', label='Phase 2 Start')
    
    plt.title(title)
    plt.xlabel('Epochs')
    plt.ylabel(metric.capitalize())
    plt.legend()
    plt.savefig(os.path.join(REPORT_DIR, filename))
    plt.close()

plot_history(history_p1, history_p2, 'loss', 'Training and Validation Loss', 'loss_curve.png')
plot_history(history_p1, history_p2, 'accuracy', 'Training and Validation Accuracy', 'accuracy_curve.png')

# ── Error Analysis ────────────────────────────────────────────────────────────
# Find top confused pairs
cm_no_diag = cm.copy()
np.fill_diagonal(cm_no_diag, 0)
confused_pairs = []
for i in range(num_classes):
    for j in range(num_classes):
        if cm_no_diag[i, j] > 0:
            confused_pairs.append({
                'true_class': class_labels[i],
                'pred_class': class_labels[j],
                'count': cm_no_diag[i, j]
            })

confused_pairs = sorted(confused_pairs, key=lambda x: x['count'], reverse=True)[:10]

# Lowest recall & F1 classes
class_metrics = []
for cls in class_labels:
    class_metrics.append({
        'class': cls,
        'recall': report_dict[cls]['recall'],
        'f1': report_dict[cls]['f1-score'],
        'support': report_dict[cls]['support']
    })

lowest_recall = sorted(class_metrics, key=lambda x: x['recall'])[:5]
lowest_f1 = sorted(class_metrics, key=lambda x: x['f1'])[:5]

with open(ERROR_REPORT, "w", encoding='utf-8') as f:
    f.write("# Plant Disease Error Analysis\n\n")
    
    f.write("## 10 Most Confused Class Pairs\n")
    f.write("| True Class | Predicted Class | Count |\n")
    f.write("|------------|-----------------|-------|\n")
    for cp in confused_pairs:
        f.write(f"| {cp['true_class']} | {cp['pred_class']} | {cp['count']} |\n")
        
    f.write("\n## Classes with Lowest Recall\n")
    f.write("| Class | Recall | F1 | Support |\n")
    f.write("|-------|--------|----|---------|\n")
    for cm in lowest_recall:
        f.write(f"| {cm['class']} | {cm['recall']:.4f} | {cm['f1']:.4f} | {cm['support']} |\n")
        
    f.write("\n## Classes with Lowest F1\n")
    f.write("| Class | Recall | F1 | Support |\n")
    f.write("|-------|--------|----|---------|\n")
    for cm in lowest_f1:
        f.write(f"| {cm['class']} | {cm['recall']:.4f} | {cm['f1']:.4f} | {cm['support']} |\n")

    f.write("\n## Confusion Visual Similarity Note\n")
    f.write("Review the confused pairs above. High confusion often occurs between different diseases on the same crop, or between early blight and late blight stages.\n")

# ── Save Class Names and Metadata ─────────────────────────────────────────────
with open(os.path.join(MODEL_DIR, "plant_disease_class_names.json"), "w") as f:
    json.dump(class_index, f, indent=4)

metadata = {
    "model_architecture": "MobileNetV2",
    "imagenet_pretraining": True,
    "input_size": [224, 224, 3],
    "number_of_classes": num_classes,
    "training_image_count": len(train_df),
    "validation_image_count": len(val_df),
    "test_image_count": len(test_df),
    "class_weights_used": True,
    "random_seed": RANDOM_SEED,
    "phase1_epochs_completed": len(history_p1.history['loss']),
    "phase2_epochs_completed": len(history_p2.history['loss']),
    "best_validation_loss": min(history_p2.history['val_loss']),
    "best_validation_accuracy": max(history_p2.history['val_accuracy']),
    "final_test_metrics": {
        "accuracy": test_acc,
        "macro_precision": macro_precision,
        "macro_recall": macro_recall,
        "macro_f1": macro_f1,
        "weighted_precision": weighted_precision,
        "weighted_recall": weighted_recall,
        "weighted_f1": weighted_f1
    },
    "training_date": datetime.now().isoformat()
}

with open(os.path.join(MODEL_DIR, "plant_disease_model_metadata.json"), "w") as f:
    json.dump(metadata, f, indent=4)

# ── Final Training Report ─────────────────────────────────────────────────────
with open(FINAL_REPORT, "w", encoding='utf-8') as f:
    f.write("# Plant Disease Model Training Report\n\n")
    
    f.write("## 1. Dataset & 2. Split\n")
    f.write(f"- Training images: {len(train_df)}\n")
    f.write(f"- Validation images: {len(val_df)}\n")
    f.write(f"- Test images: {len(test_df)}\n")
    f.write("- Split: Leakage-safe leaf group mapping applied.\n\n")
    
    f.write("## 3. Model Architecture\n")
    f.write("- MobileNetV2 (pretrained ImageNet base)\n")
    f.write("- GlobalAveragePooling2D + Dense(256, relu) + Dropout(0.3) + Dense(38, softmax)\n\n")
    
    f.write("## 4. Data Augmentation\n")
    f.write("- Rotation: 15 deg, Shift: 10%, Zoom: 10%, Horizontal Flip, Brightness (0.9-1.1)\n\n")
    
    f.write("## 5. Class Weighting\n")
    f.write("- Applied using weights computed exclusively from training split.\n\n")
    
    f.write("## 6. Phase 1 & 7. Phase 2 Training\n")
    f.write(f"- Phase 1 (Frozen Base): {len(history_p1.history['loss'])} epochs\n")
    f.write(f"- Phase 2 (Fine-tuning last 30 layers): {len(history_p2.history['loss'])} epochs\n\n")
    
    f.write("## 8. Best Validation Performance\n")
    f.write(f"- Validation Loss: {min(history_p2.history['val_loss']):.4f}\n")
    f.write(f"- Validation Accuracy: {max(history_p2.history['val_accuracy']):.4f}\n\n")
    
    f.write("## 9. Final Test Performance\n")
    f.write(f"- Accuracy: {test_acc:.4f}\n")
    f.write(f"- Macro Precision: {macro_precision:.4f}\n")
    f.write(f"- Macro Recall: {macro_recall:.4f}\n")
    f.write(f"- Macro F1: {macro_f1:.4f}\n\n")
    
    f.write("## 10. Minority-class Performance\n")
    potato_metrics = report_dict.get('Potato___healthy', {})
    f.write("### Potato___healthy\n")
    f.write(f"- Precision: {potato_metrics.get('precision', 0):.4f}\n")
    f.write(f"- Recall: {potato_metrics.get('recall', 0):.4f}\n")
    f.write(f"- F1: {potato_metrics.get('f1-score', 0):.4f}\n")
    f.write(f"- Support: {potato_metrics.get('support', 0)}\n\n")
    
    f.write("## Limitations & Recommendations\n")
    f.write("- **Limitations**: Lab-controlled images, class imbalance still limits tail class recall.\n")
    f.write("- **Recommendations**: Do not rely purely on overall accuracy. Review F1 scores for rare classes. Gather field data.\n")

# ── Console Output ────────────────────────────────────────────────────────────
print("\n" + "=" * 60)
print("FINAL OUTPUT")
print("=" * 60)
print("MODEL:")
print("MobileNetV2")
print("\nTRAINING:")
print(f"Phase 1 epochs: {len(history_p1.history['loss'])}")
print(f"Phase 2 epochs: {len(history_p2.history['loss'])}")

val_acc = max(history_p2.history['val_accuracy'])
print("\nBEST VALIDATION:")
print(f"Accuracy: {val_acc:.4f}")
print("Macro Precision: (See classification_report.csv or eval logs)")
print("Macro Recall: (See classification_report.csv or eval logs)")
print("Macro F1: (See classification_report.csv or eval logs)")

print("\nFINAL TEST:")
print(f"Accuracy: {test_acc:.4f}")
print(f"Macro Precision: {macro_precision:.4f}")
print(f"Macro Recall: {macro_recall:.4f}")
print(f"Macro F1: {macro_f1:.4f}")

print("\nLOWEST RECALL CLASSES:")
for i, cm in enumerate(lowest_recall):
    print(f"{i+1}. {cm['class']} (Recall: {cm['recall']:.4f})")

print("\nPOTATO_HEALTHY PERFORMANCE:")
pot_met = report_dict.get('Potato___healthy', {})
print(f"Precision: {pot_met.get('precision', 0):.4f}")
print(f"Recall: {pot_met.get('recall', 0):.4f}")
print(f"F1: {pot_met.get('f1-score', 0):.4f}")

print("\nMODEL FILE: ai-service/models/plant_disease_mobilenetv2.keras")
print("CLASS NAMES FILE: ai-service/models/plant_disease_class_names.json")
print("METADATA FILE: ai-service/models/plant_disease_model_metadata.json")

print("\nTRAINING STATUS:")
print("SUCCESS")
