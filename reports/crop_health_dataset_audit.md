# Crop Health Dataset Quality Audit

## 1. Dataset Summary
- **Total Rows**: 2
- **Number of Columns**: 9
- **Column Names**: timestamp, crop, soil_moisture, air_temperature, air_humidity, soil_temperature, rain, light_intensity, health_status
- **File Size**: 235 bytes

**First few rows:**
```
                  timestamp   crop  soil_moisture  air_temperature  air_humidity  soil_temperature  rain  light_intensity      health_status
0  2026-08-25T15:55:15.608Z   Corn             45               25            60                22     0             1000  Severely_Stressed
1  2026-08-25T16:05:15.608Z  Wheat             45               25            60                22     0             1000            Healthy
```

## 2. Missing Value Analysis
Missing values per column:
timestamp           0
crop                0
soil_moisture       0
air_temperature     0
air_humidity        0
soil_temperature    0
rain                0
light_intensity     0
health_status       0
Conclusion: No missing values found. Usable.

## 3. Duplicate Analysis
Exact duplicate rows: 0

## 4. Label Distribution
- Healthy: 1
- Stressed: 0
- Severely Stressed: 1

## 5. Crop Distribution
```
health_status  Healthy  Severely_Stressed
crop                                     
Corn                 0                  1
Wheat                1                  0
```

## 6. Sensor Statistics
```
       soil_moisture  air_temperature  air_humidity  soil_temperature  light_intensity  rain
count            2.0              2.0           2.0               2.0              2.0   2.0
mean            45.0             25.0          60.0              22.0           1000.0   0.0
std              0.0              0.0           0.0               0.0              0.0   0.0
min             45.0             25.0          60.0              22.0           1000.0   0.0
25%             45.0             25.0          60.0              22.0           1000.0   0.0
50%             45.0             25.0          60.0              22.0           1000.0   0.0
75%             45.0             25.0          60.0              22.0           1000.0   0.0
max             45.0             25.0          60.0              22.0           1000.0   0.0
```

## 7. Timestamp Analysis
- Earliest observation: 2026-08-25T15:55:15.608Z
- Latest observation: 2026-08-25T16:05:15.608Z

## 8. Data Leakage Audit
No immediate data leakage detected in the raw CSV, but the dataset size is too small to accurately assess chronological gaps or multi-device overlap. Recommendation: group future train/test splits by `deviceId` and chronological week to prevent temporal leakage.

## 9. Sensor-Label Exploratory Analysis
Refer to the saved plots in `reports/crop_health_dataset_audit/`.
Because the dataset only contains 2 rows, exploratory analysis is not statistically significant.

## 10. Data Diversity
- The dataset severely lacks diversity. It currently contains only 2 observation(s).
- Gaps: Missing all environmental variations, seasonal data, and statistically significant labels.

## 11. Training Readiness
**NOT READY**
Reason: The dataset contains only 2 row(s). A minimum of 500-1000 diverse rows is required before training a reliable XGBoost model.

## 12. Recommendation
We must deploy the system and begin physical data collection in the field using the new UI. Do not proceed with ML training until the dataset is populated with genuine field observations.

**Note**: The initial 2 observations identified in this audit were system-test records generated during the initial verification of the Data Collection System. They have since been excluded from the ML training dataset `datasets/crop_health_training.csv` to ensure only genuine field observations are used for model training.
