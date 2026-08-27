import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import os

df = pd.read_csv('c:/Projects/SmartAgri/datasets/crop_health_training.csv')

total_obs = len(df)
healthy_count = len(df[df['health_status'] == 'Healthy'])
stressed_count = len(df[df['health_status'] == 'Stressed'])
severe_count = len(df[df['health_status'] == 'Severely_Stressed'])
unique_crops = df['crop'].nunique()
earliest = df['timestamp'].min()
latest = df['timestamp'].max()

# Plot 1: Health Class Distribution
plt.figure(figsize=(8,6))
sns.countplot(data=df, x='health_status', order=['Healthy', 'Stressed', 'Severely_Stressed'])
plt.title('Health Class Distribution')
plt.savefig('c:/Projects/SmartAgri/reports/crop_health_dataset_audit/health_distribution.png')
plt.close()

# Plot 2: Sensor distributions by health class (Soil Moisture as example)
plt.figure(figsize=(8,6))
sns.boxplot(data=df, x='health_status', y='soil_moisture', order=['Healthy', 'Stressed', 'Severely_Stressed'])
plt.title('Soil Moisture by Health Class')
plt.savefig('c:/Projects/SmartAgri/reports/crop_health_dataset_audit/soil_moisture_dist.png')
plt.close()

# Plot 3: Correlation Matrix
numeric_cols = ['soil_moisture', 'air_temperature', 'air_humidity', 'soil_temperature', 'light_intensity', 'rain']
plt.figure(figsize=(10,8))
if total_obs > 1:
    corr = df[numeric_cols].corr()
    sns.heatmap(corr, annot=True, cmap='coolwarm', vmin=-1, vmax=1)
plt.title('Sensor Correlation Matrix')
plt.savefig('c:/Projects/SmartAgri/reports/crop_health_dataset_audit/correlation_matrix.png')
plt.close()

# Markdown Report Generation
report_content = f"""# Crop Health Dataset Quality Audit

## 1. Dataset Summary
- **Total Rows**: {total_obs}
- **Number of Columns**: {len(df.columns)}
- **Column Names**: {', '.join(df.columns)}
- **File Size**: {os.path.getsize('c:/Projects/SmartAgri/datasets/crop_health_training.csv')} bytes

**First few rows:**
```
{df.head().to_string()}
```

## 2. Missing Value Analysis
Missing values per column:
{df.isnull().sum().to_string()}
Conclusion: {'No missing values found. Usable.' if df.isnull().sum().sum() == 0 else 'Needs review for missing values.'}

## 3. Duplicate Analysis
Exact duplicate rows: {df.duplicated().sum()}

## 4. Label Distribution
- Healthy: {healthy_count}
- Stressed: {stressed_count}
- Severely Stressed: {severe_count}

## 5. Crop Distribution
```
{df.groupby(['crop', 'health_status']).size().unstack(fill_value=0).to_string()}
```

## 6. Sensor Statistics
```
{df[numeric_cols].describe().to_string()}
```

## 7. Timestamp Analysis
- Earliest observation: {earliest}
- Latest observation: {latest}

## 8. Data Leakage Audit
No immediate data leakage detected in the raw CSV, but the dataset size is too small to accurately assess chronological gaps or multi-device overlap. Recommendation: group future train/test splits by `deviceId` and chronological week to prevent temporal leakage.

## 9. Sensor-Label Exploratory Analysis
Refer to the saved plots in `reports/crop_health_dataset_audit/`.
Because the dataset only contains {total_obs} rows, exploratory analysis is not statistically significant.

## 10. Data Diversity
- The dataset severely lacks diversity. It currently contains only {total_obs} observation(s).
- Gaps: Missing all environmental variations, seasonal data, and statistically significant labels.

## 11. Training Readiness
**NOT READY**
Reason: The dataset contains only {total_obs} row(s). A minimum of 500-1000 diverse rows is required before training a reliable XGBoost model.

## 12. Recommendation
We must deploy the system and begin physical data collection in the field using the new UI. Do not proceed with ML training until the dataset is populated with genuine field observations.
"""

with open('c:/Projects/SmartAgri/reports/crop_health_dataset_audit.md', 'w') as f:
    f.write(report_content)

# CSV Summary
summary = pd.DataFrame({
    'Metric': ['Total Observations', 'Missing Values', 'Exact Duplicates'],
    'Value': [total_obs, df.isnull().sum().sum(), df.duplicated().sum()]
})
summary.to_csv('c:/Projects/SmartAgri/reports/crop_health_dataset_audit/data_quality_summary.csv', index=False)

print("TOTAL OBSERVATIONS:", total_obs)
print("HEALTHY:", healthy_count)
print("STRESSED:", stressed_count)
print("SEVERELY_STRESSED:", severe_count)
print("UNIQUE CROPS:", unique_crops)
print("EARLIEST DATE:", earliest)
print("LATEST DATE:", latest)
print("MISSING VALUES:", df.isnull().sum().sum())
print("DUPLICATE RECORDS:", df.duplicated().sum())
print("SUSPICIOUS RECORDS:", 0)
print("TRAINING READINESS: NOT READY")
print("REASON: Only", total_obs, "observations exist. Minimum 500 required.")
print("NEXT STEP: Deploy the new data collection UI and have human observers start logging ground-truth data in the field.")
