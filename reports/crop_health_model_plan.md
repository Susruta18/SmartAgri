# Future Crop Health / Crop Stress AI Model Plan

**IMPORTANT STATUS UPDATE**: The Crop Health / Crop Stress model cannot be trained yet because the project currently lacks a dataset containing genuine, ground-truth labels for crop health matched to sensor data. The following document outlines the comprehensive plan to collect this data and train the model in the future.

---

## 1. Existing Project Sensor Architecture & Inputs
A review of the workspace (specifically `backend/src/models/SensorReading.ts` and `backend/src/controllers/ingestController.ts`) reveals that the ESP32 is currently successfully sending the following micro-climate telemetry to the MongoDB database:
- `soilMoisture` (%)
- `soilTemperature` (°C)
- `airTemperature` (°C)
- `humidity` (%)
- `lightIntensity` (lux)
- `rainDetected` (boolean)

These 6 sensor streams will serve as the exact input features for the future AI model. 

### Note on Existing Weather Dataset
The existing `datasets/weather_data_cleaned-selected-columns.csv` contains meteorological data (Temperature, Humidity, Rain). However, **there is NO genuine health/stress label in this dataset.** Furthermore, since the ESP32 collects highly localized micro-climate data right at the plant, merging this generalized weather dataset is largely unnecessary and redundant for training a localized Crop Health classifier.

---

## 2. Target Labels
The model will output a multi-class prediction indicating the physiological state of the crop. 

**Recommended System (3-Class):**
- `Healthy`
- `Stressed`
- `Severely_Stressed`

*Why 3 classes instead of 4?* A 3-class system is recommended over a 4-class system (which includes Mild vs. Moderate stress) because visually distinguishing between "Mild" and "Moderate" stress is highly subjective for human observers. A 3-class system minimizes human labeling noise and improves model reliability.

---

## 3. Ground-Truth Collection Method
To collect ground truth, human agronomists or farm workers will visually inspect the physical plants monitored by the ESP32. They will record the physiological state of the plant using the provided `datasets/crop_health_label_guide.md` criteria (which rely on visual cues like wilting, yellowing, and growth stunting, rather than assuming stress based on sensor readings).

---

## 4. Dataset Schema
A template has been created at `datasets/crop_health_training_template.csv` with the following schema:
`timestamp, crop, soil_moisture, air_temperature, air_humidity, soil_temperature, rain, light_intensity, health_status`

---

## 5. Data Collection Procedure & Pipeline
1. **ESP32 Telemetry**: The ESP32 continues streaming sensor data to the `SensorReading` MongoDB collection continuously (e.g., every 5-15 minutes).
2. **Human Observation**: A worker physically inspects the plant and records the current `timestamp`, `crop`, and `health_status` (Healthy/Stressed/Severely_Stressed) via a mobile app interface or a spreadsheet.
3. **Data Fusion**: The software backend takes the human observation and queries the database for the sensor readings matching that exact timeframe.

---

## 6. Timestamp Matching Strategy
Because human observations will not perfectly align to the exact millisecond the ESP32 transmits data, the backend script must use a **Time Window Join**:
- When an observation is made at `T`, the system should query the database for the average (or closest) sensor readings within a window of `[T - 15 minutes, T + 15 minutes]`.
- If no sensor data exists within that 30-minute window (e.g., ESP32 was offline), the human observation should be discarded to prevent training the AI on stale/unrelated sensor data.

---

## 7. Recommended Data Collection Requirements
**Minimum Target**: ~500 labelled observations.
**Better Target**: 2,000 to 5,000 labelled observations.

To ensure the AI is robust, the dataset must have diversity across:
- **Time of Day**: Plants naturally wilt slightly at noon (transpiration) but recover by evening. The model must learn this difference.
- **Weather Conditions**: Cloudy vs. sunny days.
- **Irrigation Cycles**: Data right before watering (dry/stressed) and right after (wet/recovering).
- **Class Balance**: Ensure you actively seek out and label `Stressed` plants. If 95% of the data is `Healthy`, the AI will just guess `Healthy` every time (class imbalance).

---

## 8. Recommended Model
**XGBoost Classifier**
*Why?* XGBoost (Extreme Gradient Boosting) is the best choice for tabular sensor data. It natively handles non-linear relationships (e.g., high temperature is fine if soil moisture is high, but bad if soil moisture is low). It also has built-in mechanisms (like `scale_pos_weight` or multi-class weighting) to handle class imbalance, which is critical since `Healthy` observations will naturally vastly outnumber `Stressed` observations. LightGBM is also excellent but XGBoost is slightly easier to tune for small-to-medium datasets initially.

---

## 9. Evaluation Metrics
Because this is an imbalanced classification problem, standard Accuracy is a dangerously misleading metric (if 90% of plants are healthy, a broken model that always guesses "Healthy" achieves 90% accuracy).

We must evaluate using:
- **Confusion Matrix**: To see exactly what classes are misclassified.
- **Precision**: When the model predicts "Severe Stress", how often is it actually severe?
- **Recall (CRITICAL)**: Out of all the *truly* stressed plants, how many did the model successfully catch? **High recall for the `Stressed` and `Severely_Stressed` classes is the most important metric for this project.** It is better for the AI to accidentally flag a healthy plant as stressed (false positive) than to miss a dying plant (false negative).
- **F1-Score**: The harmonic mean of precision and recall.

---

## 10. Data Leakage Prevention
To prevent data leakage:
- **No overlapping time windows**: Ensure that train/val/test splits are split chronologically (e.g., Train on Month 1-2, Test on Month 3), rather than a random shuffle. Random shuffles of time-series sensor data leak future weather patterns into the training set, artificially inflating validation scores.
- **No interpolating large gaps**: Do not fill missing ESP32 data (NaNs) with forward-filling over long periods (e.g., 24 hours), as this invents data that didn't exist.

---

## 11. Future Training Pipeline
Once data is collected, the pipeline will be:
1. Load `crop_health_training.csv`.
2. Time-series chronological split (Train/Val/Test).
3. Train XGBoost Classifier using early stopping on the validation set.
4. Evaluate Confusion Matrix and Recall.
5. Save `health_model.joblib`.
6. Update `ai-service/main.py` with a `/predict/health` endpoint that loads the model.
7. Dashboard makes live requests passing current ESP32 JSON to the endpoint.
