# PlantVillage Dataset Inspection Report

**Generated:** 2026-08-25 22:36:49  
**Dataset Location:** `C:\Projects\SmartAgri\datasets\plant_disease_raw\raw\color`  
**Source:** https://github.com/spMohanty/PlantVillage-Dataset  

---

## Summary

| Metric | Value |
|--------|-------|
| Total Images | 54,305 |
| Total Classes | 38 |
| Healthy Classes | 12 |
| Disease Classes | 26 |
| Unique Crops | 14 |
| Image Formats | .jpg(54303), .png(1), .jpeg(1) |
| Corrupt Images | 0 |
| Zero-Byte Files | 0 |
| Git LFS Pointers (not downloaded) | 0 |
| Largest Class | Orange___Haunglongbing_(Citrus_greening) (5,507 images) |
| Smallest Class | Potato___healthy (152 images) |

## Sample Image Dimensions

- Apple___Apple_scab: 256x256 RGB
- Apple___Black_rot: 256x256 RGB
- Apple___Cedar_apple_rust: 256x256 RGB
- Apple___healthy: 256x256 RGB
- Blueberry___healthy: 256x256 RGB

## Class Details (Crop | Disease | Image Count)

| # | Class Name | Crop | Disease/Condition | Count | Type |
|---|-----------|------|-------------------|-------|------|
| 1 | `Orange___Haunglongbing_(Citrus_greening)` | Orange | Haunglongbing_(Citrus_greening) | 5,507 | 🔴 Disease |
| 2 | `Tomato___Tomato_Yellow_Leaf_Curl_Virus` | Tomato | Tomato_Yellow_Leaf_Curl_Virus | 5,357 | 🔴 Disease |
| 3 | `Soybean___healthy` | Soybean | healthy | 5,090 | ✅ Healthy |
| 4 | `Peach___Bacterial_spot` | Peach | Bacterial_spot | 2,297 | 🔴 Disease |
| 5 | `Tomato___Bacterial_spot` | Tomato | Bacterial_spot | 2,127 | 🔴 Disease |
| 6 | `Tomato___Late_blight` | Tomato | Late_blight | 1,909 | 🔴 Disease |
| 7 | `Squash___Powdery_mildew` | Squash | Powdery_mildew | 1,835 | 🔴 Disease |
| 8 | `Tomato___Septoria_leaf_spot` | Tomato | Septoria_leaf_spot | 1,771 | 🔴 Disease |
| 9 | `Tomato___Spider_mites Two-spotted_spider_mite` | Tomato | Spider_mites Two-spotted_spider_mite | 1,676 | 🔴 Disease |
| 10 | `Apple___healthy` | Apple | healthy | 1,645 | ✅ Healthy |
| 11 | `Tomato___healthy` | Tomato | healthy | 1,591 | ✅ Healthy |
| 12 | `Blueberry___healthy` | Blueberry | healthy | 1,502 | ✅ Healthy |
| 13 | `Pepper,_bell___healthy` | Pepper,_bell | healthy | 1,478 | ✅ Healthy |
| 14 | `Tomato___Target_Spot` | Tomato | Target_Spot | 1,404 | 🔴 Disease |
| 15 | `Grape___Esca_(Black_Measles)` | Grape | Esca_(Black_Measles) | 1,383 | 🔴 Disease |
| 16 | `Corn_(maize)___Common_rust_` | Corn_(maize) | Common_rust_ | 1,192 | 🔴 Disease |
| 17 | `Grape___Black_rot` | Grape | Black_rot | 1,180 | 🔴 Disease |
| 18 | `Corn_(maize)___healthy` | Corn_(maize) | healthy | 1,162 | ✅ Healthy |
| 19 | `Strawberry___Leaf_scorch` | Strawberry | Leaf_scorch | 1,109 | 🔴 Disease |
| 20 | `Grape___Leaf_blight_(Isariopsis_Leaf_Spot)` | Grape | Leaf_blight_(Isariopsis_Leaf_Spot) | 1,076 | 🔴 Disease |
| 21 | `Cherry_(including_sour)___Powdery_mildew` | Cherry_(including_sour) | Powdery_mildew | 1,052 | 🔴 Disease |
| 22 | `Potato___Early_blight` | Potato | Early_blight | 1,000 | 🔴 Disease |
| 23 | `Potato___Late_blight` | Potato | Late_blight | 1,000 | 🔴 Disease |
| 24 | `Tomato___Early_blight` | Tomato | Early_blight | 1,000 | 🔴 Disease |
| 25 | `Pepper,_bell___Bacterial_spot` | Pepper,_bell | Bacterial_spot | 997 | 🔴 Disease |
| 26 | `Corn_(maize)___Northern_Leaf_Blight` | Corn_(maize) | Northern_Leaf_Blight | 985 | 🔴 Disease |
| 27 | `Tomato___Leaf_Mold` | Tomato | Leaf_Mold | 952 | 🔴 Disease |
| 28 | `Cherry_(including_sour)___healthy` | Cherry_(including_sour) | healthy | 854 | ✅ Healthy |
| 29 | `Apple___Apple_scab` | Apple | Apple_scab | 630 | 🔴 Disease |
| 30 | `Apple___Black_rot` | Apple | Black_rot | 621 | 🔴 Disease |
| 31 | `Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot` | Corn_(maize) | Cercospora_leaf_spot Gray_leaf_spot | 513 | 🔴 Disease |
| 32 | `Strawberry___healthy` | Strawberry | healthy | 456 | ✅ Healthy |
| 33 | `Grape___healthy` | Grape | healthy | 423 | ✅ Healthy |
| 34 | `Tomato___Tomato_mosaic_virus` | Tomato | Tomato_mosaic_virus | 373 | 🔴 Disease |
| 35 | `Raspberry___healthy` | Raspberry | healthy | 371 | ✅ Healthy |
| 36 | `Peach___healthy` | Peach | healthy | 360 | ✅ Healthy |
| 37 | `Apple___Cedar_apple_rust` | Apple | Cedar_apple_rust | 275 | 🔴 Disease |
| 38 | `Potato___healthy` | Potato | healthy | 152 | ✅ Healthy |

## Class Imbalance Analysis

- **Average images per class:** 1429
- **Max/Min ratio:** 36.2x
- **No classes with < 100 images** ✅

## Data Leakage Prevention Strategy

### Known PlantVillage Dataset Leakage Issue

The PlantVillage dataset is known to contain **near-duplicate images** from the same
physical leaf photographed multiple times. Images within the same class can share
the same background, lighting conditions, and even the same leaf specimen.

**Recommended Split Strategy:**

1. **Do NOT use random 80/10/10 split** — near-duplicates may end up in both train and test.
2. **Use a class-stratified split** at minimum (same class distribution in all splits).
3. **Preferred: Hash-based deduplication** before splitting:
   - Compute MD5/perceptual hash of each image
   - Group near-duplicates (hamming distance < 10 for pHash)
   - Assign entire duplicate groups to the same split
4. **Alternative: Use official PlantVillage paper splits** if available.
5. **At minimum:** Reserve a held-out test set that is fixed before any training begins.

**Implementation Plan:**
```
Before training:
  1. Compute pHash for all images (requires `imagehash` library)
  2. Cluster near-duplicates (hamming distance ≤ 8)
  3. Assign clusters → train/val/test (80/10/10)
  4. Save split manifest as CSV (image_path, class, split)
  5. Never re-randomize after splits are created
```

**Additional Notes:**
- PlantVillage images are taken against controlled backgrounds — this is a known limitation.
- Models trained purely on PlantVillage may not generalize well to field photos.
- Consider fine-tuning on your own field-captured images after initial training.
## Recommended Future Model

### MobileNetV2 (Primary Recommendation)

| Property | Value |
|----------|-------|
| Input Size | 224×224 RGB |
| Parameters | ~3.4M (lightweight) |
| Framework | TensorFlow/Keras or PyTorch |
| Strategy | Transfer Learning (ImageNet → PlantVillage fine-tune) |

**Why MobileNetV2:**
- Designed for mobile/embedded deployment — perfectly suited for the lightweight AI service
- Excellent accuracy-to-size tradeoff (top-1 accuracy ~72% on ImageNet)
- Depthwise separable convolutions → fast inference
- Well-supported by TensorFlow Lite for future Android deployment
- Widely benchmarked on PlantVillage — proven ~96%+ accuracy achievable

**Transfer Learning Strategy:**
1. Load MobileNetV2 with ImageNet weights (frozen base)
2. Add custom head: `GlobalAveragePooling2D → Dense(256) → Dropout(0.3) → Dense(38, softmax)`
3. Phase 1: Train only the custom head for 10 epochs (high LR)
4. Phase 2: Unfreeze last 30 layers of base, fine-tune with low LR (1e-5)

**Data Augmentation Strategy:**
```python
augmentation = Sequential([
    RandomFlip("horizontal_and_vertical"),
    RandomRotation(0.2),
    RandomZoom(0.15),
    RandomBrightness(0.1),
    RandomContrast(0.1),
])
```

**Evaluation Metrics:**
- Overall Accuracy
- Per-class Precision, Recall, F1-score
- Weighted macro F1 (important due to class imbalance)
- Confusion Matrix (38×38)
- Top-5 Accuracy

**Alternative: EfficientNetB0**
- Slightly higher accuracy, slightly larger model
- Use if MobileNetV2 accuracy is insufficient after fine-tuning
## Project Architecture — Two Separate AI Components

```
Smart Agriculture AI System
│
├── Component A: Sensor-Based Crop Stress Model (ESP32 data)
│   ├── Input: soilMoisture, airTemp, humidity, soilTemp, rain, light
│   ├── Algorithm: Random Forest / XGBoost (tabular data)
│   ├── Output: Healthy / Mild Stress / Moderate Stress / Severe Stress
│   ├── Training Data: ESP32 sensor readings + human labels (in progress)
│   └── Status: ⏳ Awaiting 500+ labelled observations
│
└── Component B: Plant Disease Image Model (this dataset)
    ├── Input: RGB photo of crop leaf (224×224)
    ├── Algorithm: MobileNetV2 (Transfer Learning)
    ├── Output: 38 disease class labels (e.g., Tomato___Late_blight)
    ├── Training Data: PlantVillage (54,306 images, 38 classes)
    └── Status: ⏳ Dataset ready — awaiting training instruction

Future Integration:
    Sensor Stress Score + Image Disease Class
              ↓
    AI Recommendation Layer
              ↓
    Actionable agricultural advice
```

**IMPORTANT:** These two models must remain **completely separate** in training,
data pipelines, and inference. Do NOT mix PlantVillage image data with ESP32 sensor CSV data.
## Dataset Quality Assessment

✅ **54,305 images found across 38 classes.**

✅ No corrupt images detected in sampled set.
