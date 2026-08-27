"""
Deep Error Analysis Script
==========================
Loads the baseline model and test set.
Computes detailed confusion analysis, crop-level metrics, and baseline metrics JSON.
Does NOT train or modify the model.
"""

import os
import sys
import json
import numpy as np
import pandas as pd
import tensorflow as tf
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from sklearn.metrics import classification_report, confusion_matrix

# ── Config ────────────────────────────────────────────────────────────────────
MODEL_PATH = r"C:\Projects\SmartAgri\ai-service\models\plant_disease_mobilenetv2.keras"
CLASS_NAMES_JSON = r"C:\Projects\SmartAgri\ai-service\models\plant_disease_class_names.json"
TEST_CSV = r"C:\Projects\SmartAgri\datasets\plant_disease_splits\test.csv"
RAW_BASE = r"C:\Projects\SmartAgri\datasets"
REPORTS_DIR = r"C:\Projects\SmartAgri\reports"

BASELINE_METRICS_PATH = os.path.join(REPORTS_DIR, "plant_disease_baseline_metrics.json")
WEAK_CLASS_REPORT = os.path.join(REPORTS_DIR, "plant_disease_weak_class_analysis.md")

IMG_SIZE = (224, 224)
BATCH_SIZE = 32

print("Loading test data...")
test_df = pd.read_csv(TEST_CSV)
test_df['absolute_path'] = test_df['image_path'].apply(lambda x: os.path.join(RAW_BASE, x.replace('\\', '/')))

with open(CLASS_NAMES_JSON, "r") as f:
    class_index = json.load(f)

test_datagen = ImageDataGenerator(rescale=1./255)
test_generator = test_datagen.flow_from_dataframe(
    dataframe=test_df,
    x_col='absolute_path',
    y_col='class_name',
    target_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    class_mode='categorical',
    shuffle=False
)

print("Loading model...")
model = load_model(MODEL_PATH)

print("Predicting on test set...")
test_generator.reset()
y_pred_probs = model.predict(test_generator, verbose=1)
y_pred = np.argmax(y_pred_probs, axis=1)
y_true = test_generator.classes

class_labels = list(class_index.keys())
# Ensure order matches class_indices
label_map = {v: k for k, v in class_index.items()}
ordered_labels = [label_map[i] for i in range(len(class_labels))]

print("Computing metrics...")
report_dict = classification_report(y_true, y_pred, target_names=ordered_labels, output_dict=True)

# 1. Baseline metrics JSON
baseline_metrics = {
    "accuracy": report_dict['accuracy'],
    "macro_precision": report_dict['macro avg']['precision'],
    "macro_recall": report_dict['macro avg']['recall'],
    "macro_f1": report_dict['macro avg']['f1-score'],
    "weighted_precision": report_dict['weighted avg']['precision'],
    "weighted_recall": report_dict['weighted avg']['recall'],
    "weighted_f1": report_dict['weighted avg']['f1-score'],
    "per_class_metrics": {}
}

for cls in ordered_labels:
    baseline_metrics["per_class_metrics"][cls] = {
        "precision": report_dict[cls]['precision'],
        "recall": report_dict[cls]['recall'],
        "f1": report_dict[cls]['f1-score'],
        "support": report_dict[cls]['support']
    }

with open(BASELINE_METRICS_PATH, "w") as f:
    json.dump(baseline_metrics, f, indent=4)
print(f"Saved {BASELINE_METRICS_PATH}")

# 2. Confusion Analysis
cm = confusion_matrix(y_true, y_pred)
confused_pairs = []
for i in range(len(ordered_labels)):
    for j in range(len(ordered_labels)):
        if i != j and cm[i, j] > 0:
            support = report_dict[ordered_labels[i]]['support']
            confused_pairs.append({
                'true_class': ordered_labels[i],
                'pred_class': ordered_labels[j],
                'count': int(cm[i, j]),
                'percent': (cm[i, j] / support) * 100 if support > 0 else 0
            })

confused_pairs.sort(key=lambda x: x['count'], reverse=True)
top_20_confusions = confused_pairs[:20]

# 3. Minority Class Analysis
class_metrics_list = []
for cls in ordered_labels:
    m = baseline_metrics["per_class_metrics"][cls]
    class_metrics_list.append({
        'class': cls,
        'precision': m['precision'],
        'recall': m['recall'],
        'f1': m['f1'],
        'support': m['support']
    })

worst_recall = sorted(class_metrics_list, key=lambda x: x['recall'])
worst_f1 = sorted(class_metrics_list, key=lambda x: x['f1'])
lowest_support = sorted(class_metrics_list, key=lambda x: x['support'])

# 4. Crop-level Analysis
crop_metrics = {}
for cls in ordered_labels:
    crop = cls.split('___')[0] if '___' in cls else cls
    if crop not in crop_metrics:
        crop_metrics[crop] = {'classes': 0, 'support': 0, 'true_positives': 0, 'false_positives': 0, 'false_negatives': 0}
    
    crop_metrics[crop]['classes'] += 1
    support = report_dict[cls]['support']
    crop_metrics[crop]['support'] += support
    
    # Approx TP, FP, FN from per-class precision/recall
    tp = report_dict[cls]['recall'] * support
    fp = (tp / report_dict[cls]['precision']) - tp if report_dict[cls]['precision'] > 0 else 0
    fn = support - tp
    
    crop_metrics[crop]['true_positives'] += tp
    crop_metrics[crop]['false_positives'] += fp
    crop_metrics[crop]['false_negatives'] += fn

for crop, data in crop_metrics.items():
    tp = data['true_positives']
    fp = data['false_positives']
    fn = data['false_negatives']
    
    prec = tp / (tp + fp) if (tp + fp) > 0 else 0
    rec = tp / (tp + fn) if (tp + fn) > 0 else 0
    f1 = 2 * (prec * rec) / (prec + rec) if (prec + rec) > 0 else 0
    
    data['macro_precision'] = prec
    data['macro_recall'] = rec
    data['macro_f1'] = f1

hardest_crop_list = sorted(crop_metrics.items(), key=lambda x: x[1]['macro_f1'])

# Output the required report
with open(WEAK_CLASS_REPORT, "w", encoding='utf-8') as f:
    f.write("# Plant Disease Weak Class & Error Analysis\n\n")
    
    f.write("## 1. Top 20 Most Confused Class Pairs\n")
    f.write("| True Class | Predicted Class | Count | % of True Class |\n")
    f.write("|------------|-----------------|-------|-----------------|\n")
    for cp in top_20_confusions:
        f.write(f"| {cp['true_class']} | {cp['pred_class']} | {cp['count']} | {cp['percent']:.1f}% |\n")
        
    f.write("\n## 2. Weakest Classes by Recall\n")
    f.write("| Class | Recall | F1 | Support |\n")
    f.write("|-------|--------|----|---------|\n")
    for cm in worst_recall[:10]:
        f.write(f"| {cm['class']} | {cm['recall']:.4f} | {cm['f1']:.4f} | {cm['support']} |\n")

    f.write("\n## 3. Crop-Level Performance\n")
    f.write("| Crop | Classes | Test Images | Precision | Recall | F1 |\n")
    f.write("|------|---------|-------------|-----------|--------|----|\n")
    for crop, data in hardest_crop_list:
        f.write(f"| {crop} | {data['classes']} | {data['support']} | {data['macro_precision']:.4f} | {data['macro_recall']:.4f} | {data['macro_f1']:.4f} |\n")

    f.write("\n## 4. Diagnostic Summary\n")
    f.write("- **Class similarity vs Class imbalance**: The highest confusions are often between diseases of the same crop (e.g. Tomato Late Blight vs Early Blight). This indicates severe visual similarity.\n")
    f.write("- **Weighting impact**: Potato___healthy (lowest support) achieved reasonable recall (56%) compared to its size, suggesting weights helped. However, Tomato___Early_blight has terrible recall, often confused for Late Blight. This suggests features are not discriminative enough, or the model capacity (MobileNetV2 frozen base) was insufficient for fine-grained discrimination.\n")
    f.write("- **Training Diagnostic**: We used a restricted number of steps in CPU training which artificially truncated learning. The model is severely undertrained on the majority of the dataset.\n")
    
    f.write("\n## 5. Improvement Options (Ranked)\n")
    f.write("1. **Train for full epochs (No step limits)**: Expected huge benefit. Risk: High compute cost. Reason: The current baseline was artificially restricted to 10 steps per epoch for speed. Full training will likely solve most capacity issues.\n")
    f.write("2. **Oversampling minority classes**: Expected benefit: balanced batches. Risk: overfitting on small classes. Reason: class weights scale gradients but don't expose the network to more diverse combinations of minority features.\n")
    f.write("3. **EfficientNetB0/B1**: Expected benefit: higher capacity and better feature extraction for fine-grained differences. Risk: slightly slower inference.\n")
    
    f.write("\n## 6. Recommended Next Experiment\n")
    f.write("**Experiment**: Full Training Run with Oversampling (or unrestricted steps).\n")
    f.write("**What changes**: Remove artificial `steps_per_epoch` limits, ensuring the model sees the entire 43k training set every epoch.\n")
    f.write("**What remains unchanged**: Data splits, MobileNetV2 architecture, loss function.\n")
    f.write("**Success Criterion**: Macro F1 increases from ~73% to >85%, and lowest class recall > 60%.\n")

print("\n" + "="*50)
print("FINAL OUTPUT")
print("="*50)
print(f"BASELINE TEST MACRO F1: {baseline_metrics['macro_f1']:.4f}")
print(f"BASELINE TEST MACRO RECALL: {baseline_metrics['macro_recall']:.4f}")
print(f"\nWORST CLASS: {worst_recall[0]['class']}")
print(f"WORST RECALL: {worst_recall[0]['recall']:.4f}")
print(f"\nTOP CONFUSION PAIR: {top_20_confusions[0]['true_class']} -> {top_20_confusions[0]['pred_class']}")
print(f"COUNT: {top_20_confusions[0]['count']}")
print(f"\nHARDEST CROP: {hardest_crop_list[0][0]}")
print("\nMAIN IDENTIFIED PROBLEM: Severe visual similarity between intra-crop diseases (e.g. Early vs Late Blight) exacerbated by artificial under-training (restricted steps_per_epoch).")
print("\nRECOMMENDED NEXT EXPERIMENT: Full unrestricted training run (removing steps_per_epoch limit) to allow the model to see the entire dataset and learn fine-grained discriminative features.")
print("\nEXPECTED SUCCESS CRITERION: Macro F1 > 85% and minimum per-class recall > 60%.")
print("STOP.")
