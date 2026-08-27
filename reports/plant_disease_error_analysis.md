# Plant Disease Error Analysis

## 10 Most Confused Class Pairs
| True Class | Predicted Class | Count |
|------------|-----------------|-------|
| Tomato___Bacterial_spot | Tomato___Septoria_leaf_spot | 51 |
| Peach___Bacterial_spot | Peach___healthy | 43 |
| Tomato___Late_blight | Tomato___Leaf_Mold | 33 |
| Soybean___healthy | Apple___healthy | 32 |
| Pepper,_bell___Bacterial_spot | Pepper,_bell___healthy | 31 |
| Tomato___Early_blight | Tomato___Septoria_leaf_spot | 26 |
| Tomato___Target_Spot | Tomato___healthy | 24 |
| Soybean___healthy | Pepper,_bell___healthy | 21 |
| Tomato___Early_blight | Tomato___Leaf_Mold | 20 |
| Tomato___Tomato_mosaic_virus | Tomato___Leaf_Mold | 20 |

## Classes with Lowest Recall
| Class | Recall | F1 | Support |
|-------|--------|----|---------|
| Tomato___Early_blight | 0.0303 | 0.0577 | 99.0 |
| Tomato___Tomato_mosaic_virus | 0.1351 | 0.2381 | 37.0 |
| Tomato___Bacterial_spot | 0.4009 | 0.5519 | 212.0 |
| Pepper,_bell___Bacterial_spot | 0.4123 | 0.5802 | 114.0 |
| Tomato___Target_Spot | 0.5286 | 0.5441 | 140.0 |

## Classes with Lowest F1
| Class | Recall | F1 | Support |
|-------|--------|----|---------|
| Tomato___Early_blight | 0.0303 | 0.0577 | 99.0 |
| Tomato___Tomato_mosaic_virus | 0.1351 | 0.2381 | 37.0 |
| Potato___healthy | 0.5625 | 0.4000 | 16.0 |
| Tomato___Leaf_Mold | 0.8542 | 0.5256 | 96.0 |
| Tomato___Target_Spot | 0.5286 | 0.5441 | 140.0 |

## Confusion Visual Similarity Note
Review the confused pairs above. High confusion often occurs between different diseases on the same crop, or between early blight and late blight stages.
