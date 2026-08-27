# Plant Disease Model Training Report

## 1. Dataset & 2. Split
- Training images: 43353
- Validation images: 5474
- Test images: 5478
- Split: Leakage-safe leaf group mapping applied.

## 3. Model Architecture
- MobileNetV2 (pretrained ImageNet base)
- GlobalAveragePooling2D + Dense(256, relu) + Dropout(0.3) + Dense(38, softmax)

## 4. Data Augmentation
- Rotation: 15 deg, Shift: 10%, Zoom: 10%, Horizontal Flip, Brightness (0.9-1.1)

## 5. Class Weighting
- Applied using weights computed exclusively from training split.

## 6. Phase 1 & 7. Phase 2 Training
- Phase 1 (Frozen Base): 15 epochs
- Phase 2 (Fine-tuning last 30 layers): 30 epochs

## 8. Best Validation Performance
- Validation Loss: 1.0253
- Validation Accuracy: 0.7812

## 9. Final Test Performance
- Accuracy: 0.7946
- Macro Precision: 0.7751
- Macro Recall: 0.7594
- Macro F1: 0.7299

## 10. Minority-class Performance
### Potato___healthy
- Precision: 0.3103
- Recall: 0.5625
- F1: 0.4000
- Support: 16.0

## Limitations & Recommendations
- **Limitations**: Lab-controlled images, class imbalance still limits tail class recall.
- **Recommendations**: Do not rely purely on overall accuracy. Review F1 scores for rare classes. Gather field data.
