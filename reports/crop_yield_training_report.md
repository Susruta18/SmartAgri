# Crop Yield Prediction - Training Report

## 1. Dataset Summary
- **Source**: `datasets/crop_yield.csv`
- **Total Rows**: 19,689
- **Description**: Historical agricultural data containing crop production metrics alongside area, fertilizer, and pesticide usage across different states and seasons.

## 2. Features and Target
- **Features Used**: 
  - Categorical: `crop`, `season`, `state`
  - Numerical: `area`, `fertilizer`, `pesticide`, `year`
- **Target Variable**: `yield`
- **Note on `year`**: The `year` column was retained as an input feature per instructions. A sanity check for temporal leakage was performed. **WARNING:** Since the dataset was split randomly (80/10/10) rather than chronologically, there is inherent temporal leakage. Random splitting on chronological data allows the model to learn future trends to predict past yields. However, the random split was maintained as per strict instruction for reproducibility.

## 3. Preprocessing
- **Categorical Data**: Applied `OneHotEncoder` to `crop`, `season`, and `state`.
- **Numerical Data**: Passed through without scaling. (Random Forest and XGBoost do not require standard scaling).
- **Pipeline Integration**: Preprocessing was combined with the regressor into a unified `sklearn.pipeline.Pipeline` to ensure that data transformations are tightly coupled with the model and saved together.

## 4. Split Strategy
- **Seed**: Fixed at `42` for exact reproducibility.
- **Train**: 80% (15,751 samples)
- **Validation**: 10% (1,969 samples)
- **Test**: 10% (1,969 samples)

## 5. Model Training & Validation Results
Both models were evaluated on the **Validation Set** to select the best performer.

| Model | Validation MAE | Validation RMSE | Validation R² |
|-------|----------------|-----------------|---------------|
| **Random Forest Regressor** | **8.7607** | **136.4734** | **0.9753** |
| XGBoost Regressor | 16.1252 | 319.3656 | 0.8647 |

## 6. Final Selected Model
- **Selected Model**: **Random Forest Regressor**
- **Rationale**: Random Forest significantly outperformed XGBoost on the validation set, achieving an R² of 0.9753 compared to XGBoost's 0.8647. It was selected entirely based on superior validation metrics rather than training memorization.

## 7. Overfitting Analysis
- **Train R²**: 0.9949
- **Validation R²**: 0.9753
- **Conclusion**: The model shows slight memorization (typical for Random Forests), but the extremely high validation R² demonstrates excellent generalization to unseen data. Overfitting is not a significant concern here.

## 8. Final Test Metrics
Evaluated **ONCE** on the untouched Test Set:
- **Test MAE**: 8.3351
- **Test RMSE**: 97.8396
- **Test R²**: 0.9887

*Note: The test metrics are actually slightly better than validation, confirming strong, stable model performance.*

## 9. Feature Importance
The top 10 most important features derived from the Random Forest model:
1. `crop_Coconut ` (One-hot encoded 'Coconut')
2. `area`
3. `pesticide`
4. `fertilizer`
5. `crop_Sugarcane` (One-hot encoded 'Sugarcane')
6. `state_Kerala` (One-hot encoded 'Kerala')
7. `year`
8. `state_Andaman and Nicobar Islands`
9. `crop_Rice`
10. `season_Kharif     `

*A detailed plot has been saved to `reports/crop_yield_feature_importance.png`.*

## 10. Example Predictions (Untouched Test Set)
A random sample of 10 predictions from the test set:

| Actual Yield | Predicted Yield | Absolute Error |
|--------------|-----------------|----------------|
| 1.4075       | 1.3016          | 0.1059         |
| 2.8971       | 2.2202          | 0.6769         |
| 0.5414       | 0.5292          | 0.0122         |
| 0.8523       | 0.8350          | 0.0173         |
| 75.2500      | 62.0422         | 13.2078        |
| 3.6885       | 3.3243          | 0.3642         |
| 1.6445       | 1.8293          | 0.1847         |
| 0.6333       | 0.6227          | 0.0106         |
| 0.7326       | 0.6039          | 0.1287         |
| 0.5377       | 0.6157          | 0.0780         |

## 11. Artifacts Saved
- **Model**: `ai-service/models/yield_model.joblib` (Includes preprocessing pipeline + Regressor).
- **Metadata**: `ai-service/models/yield_model_metadata.json`.
- **Plot**: `reports/crop_yield_feature_importance.png`.

## 12. Limitations
- **Temporal Leakage**: Due to the random split, the model had access to "future" data while predicting "past" years. If this model is meant to predict completely unseen *future* years, performance might degrade.
- **Outliers in Target**: Absolute error scales with target size (e.g., actual yield of 75 vs 62). Large values (like Coconut yields) dominate RMSE.

---

## NEXT STEP
The **Predicted Crop Yield** model is complete, saved, and ready for future backend integration. 

To build the actual **Crop Health / Crop Stress AI model**, the critical next step is to **acquire and prepare a labelled dataset linking ESP32 sensor telemetry (Soil Moisture, Air Temp, Light Intensity, etc.) to a ground-truth "Health Status" or "Stress Level".** 
Because the existing `weather_data_cleaned-selected-columns.csv` does not contain any such labels, we must gather sensor logs paired with manual agronomic health classifications before we can train a supervised Crop Stress classifier.
