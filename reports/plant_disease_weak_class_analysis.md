# Plant Disease Weak Class & Error Analysis

## 1. Top 20 Most Confused Class Pairs
| True Class | Predicted Class | Count | % of True Class |
|------------|-----------------|-------|-----------------|
| Tomato___Bacterial_spot | Tomato___Septoria_leaf_spot | 51 | 24.1% |
| Peach___Bacterial_spot | Peach___healthy | 43 | 18.8% |
| Tomato___Late_blight | Tomato___Leaf_Mold | 33 | 17.6% |
| Soybean___healthy | Apple___healthy | 32 | 5.8% |
| Pepper,_bell___Bacterial_spot | Pepper,_bell___healthy | 31 | 27.2% |
| Tomato___Early_blight | Tomato___Septoria_leaf_spot | 26 | 26.3% |
| Tomato___Target_Spot | Tomato___healthy | 24 | 17.1% |
| Soybean___healthy | Pepper,_bell___healthy | 21 | 3.8% |
| Tomato___Early_blight | Tomato___Leaf_Mold | 20 | 20.2% |
| Tomato___Tomato_mosaic_virus | Tomato___Leaf_Mold | 20 | 54.1% |
| Tomato___Bacterial_spot | Pepper,_bell___healthy | 19 | 9.0% |
| Tomato___Spider_mites Two-spotted_spider_mite | Tomato___healthy | 17 | 10.1% |
| Tomato___Target_Spot | Tomato___Spider_mites Two-spotted_spider_mite | 17 | 12.1% |
| Potato___Late_blight | Potato___healthy | 15 | 15.0% |
| Tomato___Late_blight | Tomato___Target_Spot | 15 | 8.0% |
| Grape___Black_rot | Grape___Esca_(Black_Measles) | 14 | 11.7% |
| Tomato___Septoria_leaf_spot | Tomato___Leaf_Mold | 14 | 7.0% |
| Tomato___Early_blight | Tomato___Late_blight | 13 | 13.1% |
| Tomato___Tomato_Yellow_Leaf_Curl_Virus | Tomato___Leaf_Mold | 13 | 2.4% |
| Tomato___Tomato_Yellow_Leaf_Curl_Virus | Tomato___Septoria_leaf_spot | 13 | 2.4% |

## 2. Weakest Classes by Recall
| Class | Recall | F1 | Support |
|-------|--------|----|---------|
| Tomato___Early_blight | 0.0303 | 0.0577 | 99.0 |
| Tomato___Tomato_mosaic_virus | 0.1351 | 0.2381 | 37.0 |
| Tomato___Bacterial_spot | 0.4009 | 0.5519 | 212.0 |
| Pepper,_bell___Bacterial_spot | 0.4123 | 0.5802 | 114.0 |
| Tomato___Target_Spot | 0.5286 | 0.5441 | 140.0 |
| Tomato___Late_blight | 0.5585 | 0.6383 | 188.0 |
| Potato___healthy | 0.5625 | 0.4000 | 16.0 |
| Raspberry___healthy | 0.5909 | 0.7429 | 44.0 |
| Peach___Bacterial_spot | 0.6026 | 0.7480 | 229.0 |
| Potato___Late_blight | 0.6600 | 0.7333 | 100.0 |

## 3. Crop-Level Performance
| Crop | Classes | Test Images | Precision | Recall | F1 |
|------|---------|-------------|-----------|--------|----|
| Pepper,_bell | 2 | 270.0 | 0.6517 | 0.7000 | 0.6750 |
| Tomato | 10 | 1840.0 | 0.7087 | 0.6690 | 0.6883 |
| Peach | 2 | 268.0 | 0.7565 | 0.6493 | 0.6988 |
| Potato | 3 | 216.0 | 0.7176 | 0.7176 | 0.7176 |
| Raspberry | 1 | 44.0 | 1.0000 | 0.5909 | 0.7429 |
| Apple | 4 | 314.0 | 0.7218 | 0.8344 | 0.7740 |
| Strawberry | 2 | 175.0 | 0.7861 | 0.8400 | 0.8122 |
| Grape | 4 | 410.0 | 0.8254 | 0.9341 | 0.8764 |
| Corn_(maize) | 4 | 384.0 | 0.8886 | 0.8932 | 0.8909 |
| Cherry_(including_sour) | 2 | 181.0 | 0.8944 | 0.8895 | 0.8920 |
| Blueberry | 1 | 160.0 | 0.8706 | 0.9250 | 0.8970 |
| Soybean | 1 | 548.0 | 0.9327 | 0.8850 | 0.9082 |
| Orange | 1 | 484.0 | 0.8969 | 0.9711 | 0.9325 |
| Squash | 1 | 184.0 | 0.9676 | 0.9728 | 0.9702 |

## 4. Diagnostic Summary
- **Class similarity vs Class imbalance**: The highest confusions are often between diseases of the same crop (e.g. Tomato Late Blight vs Early Blight). This indicates severe visual similarity.
- **Weighting impact**: Potato___healthy (lowest support) achieved reasonable recall (56%) compared to its size, suggesting weights helped. However, Tomato___Early_blight has terrible recall, often confused for Late Blight. This suggests features are not discriminative enough, or the model capacity (MobileNetV2 frozen base) was insufficient for fine-grained discrimination.
- **Training Diagnostic**: We used a restricted number of steps in CPU training which artificially truncated learning. The model is severely undertrained on the majority of the dataset.

## 5. Improvement Options (Ranked)
1. **Train for full epochs (No step limits)**: Expected huge benefit. Risk: High compute cost. Reason: The current baseline was artificially restricted to 10 steps per epoch for speed. Full training will likely solve most capacity issues.
2. **Oversampling minority classes**: Expected benefit: balanced batches. Risk: overfitting on small classes. Reason: class weights scale gradients but don't expose the network to more diverse combinations of minority features.
3. **EfficientNetB0/B1**: Expected benefit: higher capacity and better feature extraction for fine-grained differences. Risk: slightly slower inference.

## 6. Recommended Next Experiment
**Experiment**: Full Training Run with Oversampling (or unrestricted steps).
**What changes**: Remove artificial `steps_per_epoch` limits, ensuring the model sees the entire 43k training set every epoch.
**What remains unchanged**: Data splits, MobileNetV2 architecture, loss function.
**Success Criterion**: Macro F1 increases from ~73% to >85%, and lowest class recall > 60%.
