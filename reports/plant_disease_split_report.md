# PlantVillage Dataset — Leakage-Safe Split Report

**Generated:** 2026-08-25 22:43:08  
**Random Seed:** 42  

---

## 1. Dataset Summary

| Metric | Value |
|--------|-------|
| Source | `plant_disease_raw/raw/color/` |
| Total Images | 54,305 |
| Total Classes | 38 |
| Total Leaf Groups | 20,789 |
| Images Mapped to CSV Leaf Groups | 41,111 |
| Singleton Groups (no CSV mapping) | 13,194 |

## 2. Leaf Group Mapping

The PlantVillage repository includes `leaf_grouping/leaf_maps/*.csv` files.
Each CSV contains two columns: `File Name` and `Leaf #`.

- `File Name` is the original image filename (before UUID prefix was added).
- `Leaf #` is a numeric ID identifying which physical leaf the image belongs to.

**Key findings:**
- Actual image filenames follow the pattern `{uuid}___{OriginalName}` 
- The original name is extracted and matched against leaf CSVs
- Each `(class, leaf_number)` combination is treated as one leaf group
- Groups with no CSV match are treated as singletons (1 image = 1 group)
- **Most images (1 image per group)** — the leaf grouping is very granular
- Only ~2,172 groups contain >1 image (max 3 images per group)

| Metric | Value |
|--------|-------|
| Total leaf CSVs | 33 |
| Total leaf groups | 20,789 |
| Groups with 1 image | 38,156 |
| Groups with 2 images | 2,152 |
| Groups with 3 images | 20 |

## 3. Split Strategy

**Method:** Leaf-group stratified split  
**Ratios:** 80% train / 10% validation / 10% test  
**Seed:** 42  

**Rule:** All images from the same leaf group are assigned to the same split.
No leaf group ever appears in more than one split.
Splitting is performed at the leaf-group level *within each class* to preserve class distribution.

## 4. Train / Validation / Test Counts

| Split | Images | Leaf Groups |
|-------|--------|-------------|
| Train      | 43,353 | 16,629 |
| Validation | 5,474 | 2,080 |
| Test       | 5,478 | 2,080 |
| **Total**  | **54,305** | **20,789** |

## 5. Class Distribution

| Class | Train | Val | Test | Total |
|-------|-------|-----|------|-------|
| `Apple___Apple_scab` | 497 | 76 | 57 | 630 |
| `Apple___Black_rot` | 502 | 53 | 66 | 621 |
| `Apple___Cedar_apple_rust` | 219 | 28 | 28 | 275 |
| `Apple___healthy` | 1321 | 161 | 163 | 1645 |
| `Blueberry___healthy` | 1177 | 165 | 160 | 1502 |
| `Cherry_(including_sour)___Powdery_mildew` | 850 | 104 | 98 | 1052 |
| `Cherry_(including_sour)___healthy` | 687 | 84 | 83 | 854 |
| `Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot` | 411 | 51 | 51 | 513 |
| `Corn_(maize)___Common_rust_` | 954 | 119 | 119 | 1192 |
| `Corn_(maize)___Northern_Leaf_Blight` | 789 | 98 | 98 | 985 |
| `Corn_(maize)___healthy` | 930 | 116 | 116 | 1162 |
| `Grape___Black_rot` | 940 | 120 | 120 | 1180 |
| `Grape___Esca_(Black_Measles)` | 1103 | 140 | 140 | 1383 |
| `Grape___Leaf_blight_(Isariopsis_Leaf_Spot)` | 860 | 108 | 108 | 1076 |
| `Grape___healthy` | 339 | 42 | 42 | 423 |
| `Orange___Haunglongbing_(Citrus_greening)` | 4473 | 550 | 484 | 5507 |
| `Peach___Bacterial_spot` | 1837 | 231 | 229 | 2297 |
| `Peach___healthy` | 285 | 36 | 39 | 360 |
| `Pepper,_bell___Bacterial_spot` | 774 | 109 | 114 | 997 |
| `Pepper,_bell___healthy` | 1165 | 157 | 156 | 1478 |
| `Potato___Early_blight` | 800 | 100 | 100 | 1000 |
| `Potato___Late_blight` | 800 | 100 | 100 | 1000 |
| `Potato___healthy` | 120 | 16 | 16 | 152 |
| `Raspberry___healthy` | 296 | 31 | 44 | 371 |
| `Soybean___healthy` | 4069 | 473 | 548 | 5090 |
| `Squash___Powdery_mildew` | 1467 | 184 | 184 | 1835 |
| `Strawberry___Leaf_scorch` | 863 | 119 | 127 | 1109 |
| `Strawberry___healthy` | 360 | 48 | 48 | 456 |
| `Tomato___Bacterial_spot` | 1703 | 212 | 212 | 2127 |
| `Tomato___Early_blight` | 801 | 100 | 99 | 1000 |
| `Tomato___Late_blight` | 1518 | 203 | 188 | 1909 |
| `Tomato___Leaf_Mold` | 760 | 96 | 96 | 952 |
| `Tomato___Septoria_leaf_spot` | 1408 | 162 | 201 | 1771 |
| `Tomato___Spider_mites Two-spotted_spider_mite` | 1340 | 168 | 168 | 1676 |
| `Tomato___Target_Spot` | 1124 | 140 | 140 | 1404 |
| `Tomato___Tomato_Yellow_Leaf_Curl_Virus` | 4266 | 554 | 537 | 5357 |
| `Tomato___Tomato_mosaic_virus` | 299 | 37 | 37 | 373 |
| `Tomato___healthy` | 1246 | 183 | 162 | 1591 |

## 6. Class Weights (Training Split)

Computed using balanced formula: `weight = n_train / (n_classes × n_class_train)`

| Class | Train Count | Weight |
|-------|-------------|--------|
| `Apple___Apple_scab` | 497 | 2.2955 |
| `Apple___Black_rot` | 502 | 2.2726 |
| `Apple___Cedar_apple_rust` | 219 | 5.2094 |
| `Apple___healthy` | 1321 | 0.8636 |
| `Blueberry___healthy` | 1177 | 0.9693 |
| `Cherry_(including_sour)___Powdery_mildew` | 850 | 1.3422 |
| `Cherry_(including_sour)___healthy` | 687 | 1.6607 |
| `Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot` | 411 | 2.7758 |
| `Corn_(maize)___Common_rust_` | 954 | 1.1959 |
| `Corn_(maize)___Northern_Leaf_Blight` | 789 | 1.4460 |
| `Corn_(maize)___healthy` | 930 | 1.2267 |
| `Grape___Black_rot` | 940 | 1.2137 |
| `Grape___Esca_(Black_Measles)` | 1103 | 1.0343 |
| `Grape___Leaf_blight_(Isariopsis_Leaf_Spot)` | 860 | 1.3266 |
| `Grape___healthy` | 339 | 3.3654 |
| `Orange___Haunglongbing_(Citrus_greening)` | 4473 | 0.2551 |
| `Peach___Bacterial_spot` | 1837 | 0.6210 |
| `Peach___healthy` | 285 | 4.0030 |
| `Pepper,_bell___Bacterial_spot` | 774 | 1.4740 |
| `Pepper,_bell___healthy` | 1165 | 0.9793 |
| `Potato___Early_blight` | 800 | 1.4261 |
| `Potato___Late_blight` | 800 | 1.4261 |
| `Potato___healthy` | 120 | 9.5072 |
| `Raspberry___healthy` | 296 | 3.8543 |
| `Soybean___healthy` | 4069 | 0.2804 |
| `Squash___Powdery_mildew` | 1467 | 0.7777 |
| `Strawberry___Leaf_scorch` | 863 | 1.3220 |
| `Strawberry___healthy` | 360 | 3.1691 |
| `Tomato___Bacterial_spot` | 1703 | 0.6699 |
| `Tomato___Early_blight` | 801 | 1.4243 |
| `Tomato___Late_blight` | 1518 | 0.7516 |
| `Tomato___Leaf_Mold` | 760 | 1.5011 |
| `Tomato___Septoria_leaf_spot` | 1408 | 0.8103 |
| `Tomato___Spider_mites Two-spotted_spider_mite` | 1340 | 0.8514 |
| `Tomato___Target_Spot` | 1124 | 1.0150 |
| `Tomato___Tomato_Yellow_Leaf_Curl_Virus` | 4266 | 0.2674 |
| `Tomato___Tomato_mosaic_virus` | 299 | 3.8156 |
| `Tomato___healthy` | 1246 | 0.9156 |

Saved to: `reports/plant_disease_class_weights.json`

## 7. Leakage Validation

Run `datasets/validate_plantvillage_split.py` for full validation results.

## 8. Small-Class Analysis

| Split | Class | Image Count | Viable? |
|-------|-------|-------------|--------|
| test | `Potato___healthy` | 16 | ⚠️ Borderline — Include but monitor |
| val | `Potato___healthy` | 16 | ⚠️ Borderline — Include but monitor |

**Recommendation:** Do not remove small classes. Use class-weighted loss to compensate.

## 9. Future Model Training Plan

**Model:** MobileNetV2 (ImageNet pretrained)  
**Input:** 224×224 RGB  
**Framework:** TensorFlow/Keras  

### Phase 1 — Head Training
```
Base MobileNetV2 (frozen) → GlobalAveragePooling2D → Dense(256, relu) → Dropout(0.3) → Dense(38, softmax)
Optimizer: Adam(lr=1e-3)
Loss: categorical_crossentropy with class_weights
Epochs: 15 (early stopping patience=5)
```

### Phase 2 — Fine-Tuning
```
Unfreeze last 30 layers of MobileNetV2 base
Optimizer: Adam(lr=1e-5)
Loss: categorical_crossentropy with class_weights
Epochs: 30 (early stopping patience=7)
Model checkpoint: save best val_accuracy
LR reduction: ReduceLROnPlateau(factor=0.5, patience=3)
```

### Data Augmentation
```python
RandomFlip('horizontal_and_vertical')
RandomRotation(0.15)
RandomZoom(0.10)
RandomBrightness(0.1)
RandomContrast(0.1)
```

### Important Notes
- Use `train.csv` for training, `validation.csv` for checkpointing, `test.csv` ONLY for final evaluation
- Never re-randomize splits after creation
- Class weights from `reports/plant_disease_class_weights.json`

## 10. Future Evaluation Plan

Evaluate on **test split only** after all training is complete.

| Metric | Priority |
|--------|----------|
| Overall Accuracy | Baseline |
| **Macro F1-Score** | **Primary** (handles imbalance) |
| Macro Precision | Secondary |
| Macro Recall | Secondary |
| Per-class Precision | Per-class analysis |
| Per-class Recall | Per-class analysis |
| Per-class F1 | Per-class analysis |
| Confusion Matrix (38×38) | Error analysis |
| Minority class performance | Separate report |

**Key:** For imbalanced datasets, Macro F1 and per-class Recall for minority classes are the most important metrics.
Report minority classes (< 500 training images) separately.
## 11. Limitations

1. **Controlled lab images:** PlantVillage photos are taken against uniform backgrounds.
   Real-world field performance may be lower. Fine-tuning on field images is recommended.

2. **7 classes have no CSV leaf map** and are treated as singletons. These classes still
   receive correct group splits (each image is its own group), but leakage prevention
   relies on singleton uniqueness, which is safe.

3. **Class imbalance (36.2×):** Orange___Haunglongbing has 35× more images than Potato___healthy.
   Class-weighted loss mitigates but does not eliminate this imbalance.

4. **14 of 38 classes have no representation** in Tomato-specific diseases common in India.
   Consider supplementing with field data from your region.

5. **Separate from ESP32 sensor model:** This image model and the sensor-based stress model
   must remain completely separate in training and inference.
