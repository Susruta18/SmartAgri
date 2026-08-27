# PlantVillage Dataset

## Dataset Information

| Field | Details |
|-------|---------|
| **Name** | PlantVillage Dataset |
| **Source** | https://github.com/spMohanty/PlantVillage-Dataset |
| **HuggingFace** | https://huggingface.co/datasets/mohanty/PlantVillage |
| **License** | Open Access (CC BY 4.0) — see Citation section |
| **Download Date** | 2026-08-25 |
| **Downloaded By** | SmartAgri AI Pipeline |

## Paper Citation

> Mohanty, S. P., Hughes, D. P., & Salathé, M. (2016).
> *Using Deep Learning for Image-Based Plant Disease Detection.*
> Frontiers in Plant Science, 7, 1419.
> https://doi.org/10.3389/fpls.2016.01419

**BibTeX:**
```bibtex
@article{Mohanty_Hughes_Salathe_2016,
    title   = {Using deep learning for image-based plant disease detection},
    volume  = {7},
    DOI     = {10.3389/fpls.2016.01419},
    journal = {Frontiers in Plant Science},
    author  = {Mohanty, Sharada P. and Hughes, David P. and Salathé, Marcel},
    year    = {2016},
    month   = {Sep}
}
```

---

## Dataset Summary

| Metric | Value |
|--------|-------|
| **Total Images** | 54,305 |
| **Total Classes** | 38 |
| **Healthy Classes** | 12 |
| **Disease Classes** | 26 |
| **Unique Crops** | 14 |
| **Image Size** | 256×256 pixels |
| **Image Format** | JPEG (99.9%), PNG (trace) |
| **Corrupt Images** | 0 |
| **Largest Class** | Orange___Haunglongbing (5,507 images) |
| **Smallest Class** | Potato___healthy (152 images) |
| **Class Imbalance Ratio** | 36.2× (max/min) |

---

## Crops Covered

Apple, Blueberry, Cherry, Corn (Maize), Grape, Orange, Peach, Pepper, Potato, Raspberry, Soybean, Squash, Strawberry, Tomato

---

## Directory Structure

```
datasets/
└── plant_disease_raw/          ← Git-cloned PlantVillage repo (DO NOT DELETE)
    ├── raw/
    │   └── color/              ← 54,305 images in 38 class subdirectories
    │       ├── Apple___Apple_scab/
    │       ├── Apple___Black_rot/
    │       ├── Apple___healthy/
    │       ├── Tomato___Late_blight/
    │       ├── Tomato___healthy/
    │       └── ... (38 folders total)
    ├── leaf_grouping/          ← Leaf-level split metadata
    ├── leaf-map.json           ← Image → leaf-group mapping (for split integrity)
    ├── README.md
    └── .git/                   ← Git repo (images retrieved via git clone)
```

> **Note:** Images are stored inside `plant_disease_raw/raw/color/`. The `plant_disease/` folder is reserved for future processed/split datasets.

---

## Class List (38 Classes)

| Class Name | Count | Type |
|-----------|-------|------|
| Orange___Haunglongbing_(Citrus_greening) | 5,507 | 🔴 Disease |
| Tomato___Tomato_Yellow_Leaf_Curl_Virus | 5,357 | 🔴 Disease |
| Soybean___healthy | 5,090 | ✅ Healthy |
| Peach___Bacterial_spot | 2,297 | 🔴 Disease |
| Tomato___Bacterial_spot | 2,127 | 🔴 Disease |
| Tomato___Late_blight | 1,909 | 🔴 Disease |
| Squash___Powdery_mildew | 1,835 | 🔴 Disease |
| Tomato___Septoria_leaf_spot | 1,771 | 🔴 Disease |
| Tomato___Spider_mites Two-spotted_spider_mite | 1,676 | 🔴 Disease |
| Apple___healthy | 1,645 | ✅ Healthy |
| Tomato___healthy | 1,591 | ✅ Healthy |
| Blueberry___healthy | 1,502 | ✅ Healthy |
| Pepper,_bell___healthy | 1,478 | ✅ Healthy |
| Tomato___Target_Spot | 1,404 | 🔴 Disease |
| Grape___Esca_(Black_Measles) | 1,383 | 🔴 Disease |
| Corn_(maize)___Common_rust_ | 1,192 | 🔴 Disease |
| Grape___Black_rot | 1,180 | 🔴 Disease |
| Corn_(maize)___healthy | 1,162 | ✅ Healthy |
| Strawberry___Leaf_scorch | 1,109 | 🔴 Disease |
| Grape___Leaf_blight_(Isariopsis_Leaf_Spot) | 1,076 | 🔴 Disease |
| Cherry_(including_sour)___Powdery_mildew | 1,052 | 🔴 Disease |
| Potato___Early_blight | 1,000 | 🔴 Disease |
| Potato___Late_blight | 1,000 | 🔴 Disease |
| Tomato___Early_blight | 1,000 | 🔴 Disease |
| Pepper,_bell___Bacterial_spot | 997 | 🔴 Disease |
| Corn_(maize)___Northern_Leaf_Blight | 985 | 🔴 Disease |
| Tomato___Leaf_Mold | 952 | 🔴 Disease |
| Cherry_(including_sour)___healthy | 854 | ✅ Healthy |
| Apple___Apple_scab | 630 | 🔴 Disease |
| Apple___Black_rot | 621 | 🔴 Disease |
| Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot | 513 | 🔴 Disease |
| Strawberry___healthy | 456 | ✅ Healthy |
| Grape___healthy | 423 | ✅ Healthy |
| Tomato___Tomato_mosaic_virus | 373 | 🔴 Disease |
| Raspberry___healthy | 371 | ✅ Healthy |
| Peach___healthy | 360 | ✅ Healthy |
| Apple___Cedar_apple_rust | 275 | 🔴 Disease |
| Potato___healthy | 152 | ✅ Healthy |

---

## Important Limitations

1. **Controlled lab conditions**: All images were taken against a controlled background. Models trained purely on this dataset may not generalize well to field photos taken by ESP32 or smartphone cameras under natural lighting.

2. **Class imbalance**: The max/min ratio is 36.2× (Orange: 5,507 vs Potato healthy: 152). Training must use class-weighted loss or oversampling.

3. **Near-duplicate images**: Multiple photos of the same physical leaf exist across the dataset. Use the provided `leaf-map.json` and `leaf_grouping/` metadata for leakage-safe splits.

4. **No temporal or geospatial metadata**: Images are not time-stamped or geo-tagged.

5. **Dataset scope**: Covers 14 crops — not all crops in your `crop_yield.csv` (e.g., Rice, Wheat, Cotton, Coconut are not represented).

---

## Data Leakage Prevention

> ⚠️ **DO NOT use a simple random split** on this dataset.

The dataset contains multiple images of the same physical leaf. A naive random split can put near-duplicates in both train and test, artificially inflating test accuracy.

**Required strategy:**
1. Use `leaf-map.json` to identify which leaf each image belongs to
2. Assign all images from the same leaf to the same split
3. Create splits: `train/` (80%), `val/` (10%), `test/` (10%)
4. Save split manifest as CSV before training
5. Never re-randomize after splits are fixed

---

## Relationship to Other Project Datasets

| Dataset | Purpose | Format | DO NOT MIX |
|---------|---------|--------|-----------|
| `plant_disease_raw/` | Image disease detection | JPEG images | ✅ This dataset |
| `crop_health_training.csv` | ESP32 sensor stress model | Tabular CSV | ❌ Keep separate |
| `crop_yield.csv` | Yield prediction model | Tabular CSV | ❌ Keep separate |

---

## Usage in SmartAgri Project

This dataset is for **Component B: Plant Disease Image Model** only.

```
Plant Leaf Photo (256×256 RGB)
          ↓
    MobileNetV2 (fine-tuned)
          ↓
  Disease Class (e.g., Tomato___Late_blight)
          ↓
  Recommendation Layer
```

**Status:** ⏳ Dataset ready — awaiting training instruction.
