import pandas as pd
import argparse
import sys
import os

def audit_dataset(csv_path: str):
    if not os.path.exists(csv_path):
        print(f"Error: Dataset {csv_path} not found.")
        sys.exit(1)
        
    try:
        df = pd.read_csv(csv_path)
    except Exception as e:
        print(f"Error reading CSV: {e}")
        sys.exit(1)
        
    print(f"--- Crop Health Dataset Audit ---")
    print(f"File: {csv_path}")
    print(f"Total Rows: {len(df)}")
    
    if len(df) == 0:
        print("Dataset is empty (only headers).")
        return
        
    print("\n--- Class Counts ---")
    if 'health_status' in df.columns:
        counts = df['health_status'].value_counts()
        for cls, count in counts.items():
            pct = (count / len(df)) * 100
            print(f"- {cls}: {count} ({pct:.1f}%)")
    else:
        print("Error: 'health_status' column missing.")
        
    print("\n--- Crop Counts ---")
    if 'crop' in df.columns:
        print(df['crop'].value_counts().to_string())
        
    print("\n--- Missing Values ---")
    missing = df.isnull().sum()
    print(missing[missing > 0].to_string() if missing.sum() > 0 else "No missing values found.")
    
    print("\n--- Duplicates ---")
    dups = df.duplicated()
    print(f"Exact Duplicate Rows: {dups.sum()}")
    
    print("\n--- Timestamp Range ---")
    if 'timestamp' in df.columns:
        df['timestamp'] = pd.to_datetime(df['timestamp'], errors='coerce')
        valid_dates = df['timestamp'].dropna()
        if len(valid_dates) > 0:
            print(f"Earliest: {valid_dates.min()}")
            print(f"Latest:   {valid_dates.max()}")
        else:
            print("No valid timestamps found.")
            
    print("\n--- Sensor Ranges ---")
    sensor_cols = ['soil_moisture', 'air_temperature', 'air_humidity', 'soil_temperature', 'light_intensity']
    for col in sensor_cols:
        if col in df.columns:
            print(f"{col}: Min={df[col].min()} Max={df[col].max()} Mean={df[col].mean():.2f}")
            
    print("\n--- Suspicious Records ---")
    suspicious = 0
    if 'soil_moisture' in df.columns:
        bad_moisture = df[(df['soil_moisture'] < 0) | (df['soil_moisture'] > 100)]
        if len(bad_moisture) > 0:
            print(f"Found {len(bad_moisture)} rows with invalid soil moisture (<0 or >100).")
            suspicious += len(bad_moisture)
            
    if 'air_humidity' in df.columns:
        bad_humidity = df[(df['air_humidity'] < 0) | (df['air_humidity'] > 100)]
        if len(bad_humidity) > 0:
            print(f"Found {len(bad_humidity)} rows with invalid air humidity (<0 or >100).")
            suspicious += len(bad_humidity)
            
    if 'health_status' in df.columns:
        invalid_classes = df[~df['health_status'].isin(['Healthy', 'Stressed', 'Severely_Stressed'])]
        if len(invalid_classes) > 0:
            print(f"Found {len(invalid_classes)} rows with invalid health_status labels.")
            suspicious += len(invalid_classes)

    if suspicious == 0:
        print("No suspicious records detected based on basic thresholds.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Audit Crop Health Dataset")
    parser.add_argument("--csv", type=str, default="crop_health_training.csv", help="Path to the dataset CSV")
    args = parser.parse_args()
    
    audit_dataset(args.csv)
