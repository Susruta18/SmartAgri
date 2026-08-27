# Plant Disease Phase 3 API Integration

## Model Information
- **Model File Used:** `ai-service/models/plant_disease_mobilenetv2_phase3.keras`
- **Status:** Integrated without retraining or modifying the accepted model weights. The original dataset files (`train.csv`, `validation.csv`, `test.csv`) and baseline metrics were not modified.

## Preprocessing Used
- **Input Size:** 224x224
- **Color Format:** RGB
- **Scaling:** Normalization (`1./255`)
- **Note:** Preprocessing mirrors the `val_test_datagen` from the training configuration exactly.

## Endpoint Details
- **Endpoint:** `POST /predict/plant-disease`
- **Purpose:** Receives a crop leaf image via multipart upload and returns a detailed prediction identifying the crop, disease, and health status based on the accepted Phase 3 model.

### Request Format
- **Content-Type:** `multipart/form-data`
- **Body:** Form parameter `file` containing the image bytes.

### Response Format
Returns a JSON object on success:
```json
{
  "predicted_class": "Tomato___Early_blight",
  "confidence": 95.5,
  "crop": "Tomato",
  "disease": "Early blight",
  "is_healthy": false,
  "top_3": [
    {
      "predicted_class": "Tomato___Early_blight",
      "confidence": 95.5,
      "crop": "Tomato",
      "disease": "Early blight",
      "is_healthy": false
    },
    ...
  ]
}
```

### Validation Rules
- **Missing File:** Returns `400 Bad Request` if `file` is absent or empty.
- **Invalid Type:** Returns `400 Bad Request` if `content_type` does not start with `image/`.
- **Corrupt Image:** Returns `400 Bad Request` if the file cannot be decoded by PIL.
- **Model Missing:** Returns `503 Service Unavailable` if the model or class names JSON file is absent.

## Automated Testing Results
- A complete test suite (`test_plant_disease_api.py`) was introduced and executed.
- **Results:** 6 tests passed (100% success rate).
- Validated image uploads, validation logic, corrupt image detection, and class-name parsing.
- Existing endpoints (`/` and `/predict`) were preserved without changes.
