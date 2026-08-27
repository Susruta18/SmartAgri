"""
PlantVillage Dataset Inspection Script
Run after dataset is cloned/downloaded.
Generates report at: reports/plant_disease_dataset_inspection.md
"""
import os
import sys
import json
import hashlib
import collections
from pathlib import Path
from datetime import datetime

DATASET_ROOT = Path(r"C:\Projects\SmartAgri\datasets\plant_disease_raw\raw\color")
RAW_ROOT = Path(r"C:\Projects\SmartAgri\datasets\plant_disease_raw")
REPORTS_DIR = Path(r"C:\Projects\SmartAgri\reports")
REPORT_FILE = REPORTS_DIR / "plant_disease_dataset_inspection.md"

REPORTS_DIR.mkdir(parents=True, exist_ok=True)

# Try both possible locations
if not DATASET_ROOT.exists():
    # Maybe still in raw format
    for candidate in [
        RAW_ROOT / "raw" / "color",
        RAW_ROOT / "raw" / "Color",
        Path(r"C:\Projects\SmartAgri\datasets\plant_disease_raw\raw\color"),
    ]:
        if candidate.exists():
            DATASET_ROOT = candidate
            print(f"Using raw dataset at: {DATASET_ROOT}")
            break

if not DATASET_ROOT.exists():
    print(f"ERROR: Dataset not found at {DATASET_ROOT}")
    print("Please run download_plantvillage.py first.")
    sys.exit(1)

print("=" * 70)
print("PlantVillage Dataset Inspection")
print(f"Location: {DATASET_ROOT}")
print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print("=" * 70)

# ── Scan all image files ──────────────────────────────────────────────────────
VALID_EXTS = {'.jpg', '.jpeg', '.png', '.JPG', '.JPEG', '.PNG', '.bmp', '.BMP'}

class_stats = {}       # class_name -> list of (path, size_bytes)
corrupt_files = []     # files that couldn't be read
zero_byte_files = []   # zero-byte files
total_images = 0
formats = collections.Counter()
suspicious_lfs = []    # LFS pointer files (not real images)

print("\nScanning dataset directory...")
for class_dir in sorted(DATASET_ROOT.iterdir()):
    if not class_dir.is_dir():
        continue
    class_name = class_dir.name
    class_stats[class_name] = []

    for img_file in class_dir.rglob("*"):
        if img_file.suffix not in VALID_EXTS:
            continue
        
        size = img_file.stat().st_size
        
        if size == 0:
            zero_byte_files.append(str(img_file))
            continue
        
        # Check if it's a Git LFS pointer (text file) not a real image
        if size < 200:
            try:
                content = img_file.read_bytes()
                if b'version https://git-lfs' in content:
                    suspicious_lfs.append(str(img_file))
                    continue
            except Exception:
                pass
        
        class_stats[class_name].append((str(img_file), size))
        formats[img_file.suffix.lower()] += 1
        total_images += 1

print(f"Total classes found: {len(class_stats)}")
print(f"Total valid images: {total_images}")

if suspicious_lfs:
    print(f"WARNING: {len(suspicious_lfs)} LFS pointer files found — images not actually downloaded!")
    for f in suspicious_lfs[:5]:
        print(f"  {f}")
    if len(suspicious_lfs) > 100:
        print("  CRITICAL: Git LFS objects were not downloaded. Run: git lfs pull")
        sys.exit(1)

# ── Detect image dimensions (sample) ─────────────────────────────────────────
print("\nSampling image dimensions...")
try:
    from PIL import Image
    dimension_samples = []
    for class_name, files in list(class_stats.items())[:5]:
        if files:
            try:
                img = Image.open(files[0][0])
                dimension_samples.append(f"{class_name}: {img.size[0]}x{img.size[1]} {img.mode}")
                img.close()
            except Exception as e:
                corrupt_files.append((files[0][0], str(e)))
except ImportError:
    dimension_samples = ["PIL not available — install Pillow to inspect dimensions"]

# ── Check for corrupted images (sample) ──────────────────────────────────────
print("Checking for corrupted images (sampling first 50 per class)...")
try:
    from PIL import Image, UnidentifiedImageError
    for class_name, files in class_stats.items():
        for path, size in files[:50]:
            try:
                with Image.open(path) as img:
                    img.verify()
            except (UnidentifiedImageError, Exception) as e:
                corrupt_files.append((path, str(e)))
    print(f"Corrupt images found: {len(corrupt_files)}")
except ImportError:
    print("Skipping corruption check (Pillow not installed)")

# ── Class-level statistics ────────────────────────────────────────────────────
class_counts = {k: len(v) for k, v in class_stats.items()}
sorted_classes = sorted(class_counts.items(), key=lambda x: x[1], reverse=True)

largest_class = sorted_classes[0] if sorted_classes else ("?", 0)
smallest_class = sorted_classes[-1] if sorted_classes else ("?", 0)

# Classify healthy vs disease
healthy_classes = [c for c in class_stats.keys() if 'healthy' in c.lower()]
disease_classes = [c for c in class_stats.keys() if 'healthy' not in c.lower()]

# Parse crop names
crops = set()
for class_name in class_stats.keys():
    if '___' in class_name:
        crop = class_name.split('___')[0]
        crops.add(crop)

# ── Generate Markdown Report ──────────────────────────────────────────────────
print(f"\nGenerating report at: {REPORT_FILE}")

with open(REPORT_FILE, 'w', encoding='utf-8') as f:
    f.write(f"# PlantVillage Dataset Inspection Report\n\n")
    f.write(f"**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}  \n")
    f.write(f"**Dataset Location:** `{DATASET_ROOT}`  \n")
    f.write(f"**Source:** https://github.com/spMohanty/PlantVillage-Dataset  \n\n")
    f.write("---\n\n")

    # Summary
    f.write("## Summary\n\n")
    f.write(f"| Metric | Value |\n")
    f.write(f"|--------|-------|\n")
    f.write(f"| Total Images | {total_images:,} |\n")
    f.write(f"| Total Classes | {len(class_stats)} |\n")
    f.write(f"| Healthy Classes | {len(healthy_classes)} |\n")
    f.write(f"| Disease Classes | {len(disease_classes)} |\n")
    f.write(f"| Unique Crops | {len(crops)} |\n")
    f.write(f"| Image Formats | {', '.join(f'{ext}({cnt})' for ext, cnt in formats.items())} |\n")
    f.write(f"| Corrupt Images | {len(corrupt_files)} |\n")
    f.write(f"| Zero-Byte Files | {len(zero_byte_files)} |\n")
    f.write(f"| Git LFS Pointers (not downloaded) | {len(suspicious_lfs)} |\n")
    f.write(f"| Largest Class | {largest_class[0]} ({largest_class[1]:,} images) |\n")
    f.write(f"| Smallest Class | {smallest_class[0]} ({smallest_class[1]:,} images) |\n\n")

    # Sample dimensions
    if dimension_samples:
        f.write("## Sample Image Dimensions\n\n")
        for d in dimension_samples:
            f.write(f"- {d}\n")
        f.write("\n")

    # Class table
    f.write("## Class Details (Crop | Disease | Image Count)\n\n")
    f.write("| # | Class Name | Crop | Disease/Condition | Count | Type |\n")
    f.write("|---|-----------|------|-------------------|-------|------|\n")
    for i, (class_name, count) in enumerate(sorted_classes, 1):
        if '___' in class_name:
            parts = class_name.split('___', 1)
            crop = parts[0]
            disease = parts[1]
        else:
            crop = class_name
            disease = "unknown"
        is_healthy = 'healthy' in disease.lower()
        ctype = "✅ Healthy" if is_healthy else "🔴 Disease"
        f.write(f"| {i} | `{class_name}` | {crop} | {disease} | {count:,} | {ctype} |\n")
    f.write("\n")

    # Class imbalance analysis
    f.write("## Class Imbalance Analysis\n\n")
    counts_only = list(class_counts.values())
    if counts_only:
        avg_count = sum(counts_only) / len(counts_only)
        ratio = max(counts_only) / max(min(counts_only), 1)
        f.write(f"- **Average images per class:** {avg_count:.0f}\n")
        f.write(f"- **Max/Min ratio:** {ratio:.1f}x\n")
        small_classes = [(k, v) for k, v in class_counts.items() if v < 100]
        if small_classes:
            f.write(f"- **Classes with < 100 images:** {len(small_classes)}\n")
            for k, v in small_classes:
                f.write(f"  - `{k}`: {v} images\n")
        else:
            f.write("- **No classes with < 100 images** ✅\n")
    f.write("\n")

    # Corruption report
    if corrupt_files:
        f.write("## Corrupted/Unreadable Images\n\n")
        f.write(f"Found {len(corrupt_files)} corrupt files:\n\n")
        for path, err in corrupt_files[:20]:
            f.write(f"- `{path}`: {err}\n")
        if len(corrupt_files) > 20:
            f.write(f"- ... and {len(corrupt_files) - 20} more\n")
        f.write("\n")

    # Data leakage section
    f.write("## Data Leakage Prevention Strategy\n\n")
    f.write("""### Known PlantVillage Dataset Leakage Issue

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
""")

    # Future model recommendation
    f.write("## Recommended Future Model\n\n")
    f.write("""### MobileNetV2 (Primary Recommendation)

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
""")

    # Architecture separation
    f.write("## Project Architecture — Two Separate AI Components\n\n")
    f.write("""```
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
""")

    # Quality summary
    f.write("## Dataset Quality Assessment\n\n")
    if len(suspicious_lfs) > 100:
        f.write("⛔ **CRITICAL: Git LFS objects not downloaded.** Images are placeholder pointers.\n")
        f.write("Run `git lfs pull` inside the `plant_disease_raw/` directory.\n\n")
    elif total_images == 0:
        f.write("⛔ **CRITICAL: No images found.** Dataset may not be properly downloaded.\n\n")
    elif total_images < 10000:
        f.write(f"⚠️ **WARNING: Only {total_images} images found** — expected ~54,306.\n\n")
    else:
        f.write(f"✅ **{total_images:,} images found across {len(class_stats)} classes.**\n\n")
    
    if len(corrupt_files) == 0:
        f.write("✅ No corrupt images detected in sampled set.\n")
    else:
        f.write(f"⚠️ {len(corrupt_files)} corrupt images detected — review before training.\n")

print(f"\nReport written to: {REPORT_FILE}")

# Final summary to console
print("\n" + "=" * 70)
print("FINAL SUMMARY")
print("=" * 70)
print(f"Total Images:        {total_images:,}")
print(f"Total Classes:       {len(class_stats)}")
print(f"Healthy Classes:     {len(healthy_classes)}")
print(f"Disease Classes:     {len(disease_classes)}")
print(f"Unique Crops:        {len(crops)}")
print(f"Corrupt Images:      {len(corrupt_files)}")
print(f"LFS Pointers:        {len(suspicious_lfs)}")
print(f"Zero-Byte Files:     {len(zero_byte_files)}")
if sorted_classes:
    print(f"Largest Class:       {largest_class[0]} ({largest_class[1]:,})")
    print(f"Smallest Class:      {smallest_class[0]} ({smallest_class[1]:,})")
if suspicious_lfs and len(suspicious_lfs) > 100:
    print("\nACTION REQUIRED: Run 'git lfs pull' to download actual images!")
