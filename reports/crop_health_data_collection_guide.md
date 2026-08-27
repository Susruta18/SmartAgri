# Crop Health Data Collection Guide

This guide explains how to use the Crop Health Data Collection system to gather real, ground-truth labels for future AI training.

## How to use the UI

1. **Navigate to Data Collection**: Open the AgriSmart dashboard and click "Data Collection" in the sidebar.
2. **Select Crop**: Enter the crop type you are observing (e.g. Wheat).
3. **Set Timestamp**: The time defaults to right now. Adjust this only if you are entering an observation that you wrote down earlier.
4. **Choose Health Status**: Click the button that accurately represents the plant's physical state.
5. **Preview Sensors**: Click "Preview Matched Sensor Data" to verify that the ESP32 was online and successfully recorded data near your timestamp.
6. **Submit**: Click "Submit Observation" to save the data.

## What the Health Labels Mean

Refer to `datasets/crop_health_label_guide.md` for objective physical criteria. Summary:
* **Healthy**: Vibrant color, turgid leaves, normal growth.
* **Stressed**: Wilting, slight yellowing, or stunted growth. Needs intervention soon.
* **Severely_Stressed**: Permanent wilting, widespread necrosis, or dying. Recovery unlikely without massive intervention.

## How Sensor Matching Works

When you submit an observation, the backend does NOT use any sensor values you might see on the screen to save to the database. Instead:
1. It looks at your **Observation Time**.
2. It queries the MongoDB database for all raw ESP32 telemetry recorded within `+/- 15 minutes` of that exact time.
3. It selects the reading closest to your timestamp.
4. If no reading exists (e.g., the ESP32 lost power), it rejects the submission. You cannot train an AI without sensor data.

## Duplicate Protection

To prevent accidental double-submissions, the system uses application-level validation. If an identical observation (same device, crop, and health status) is detected within 1 minute of your selected timestamp, it will be rejected as a duplicate.

## How Data is Stored

The combined record (human label + server-fetched sensor data) is saved to the `CropHealthObservation` MongoDB collection. It is securely stored separate from the raw telemetry.

## Exporting for AI Training

1. Click the **Export ML Dataset** button on the Data Collection page.
2. The backend generates a strict, cleanly formatted file at `datasets/crop_health_training.csv`.
3. This CSV contains exactly the 9 required columns and strips out all internal MongoDB IDs and notes, making it ready for XGBoost.
4. *Note: This does not overwrite the empty template file (`crop_health_training_template.csv`).*

## Monitoring Class Distribution

The right side of the UI contains a Data Quality Dashboard. Pay close attention to the ratio of Healthy vs Stressed plants.
To train a robust AI, actively seek out and label Stressed plants to avoid a massive class imbalance. Aim for at least 500-1000 observations total before attempting to train the model.
