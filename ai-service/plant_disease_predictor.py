import os
import json
import numpy as np
from PIL import Image
from io import BytesIO

class PlantDiseasePredictor:
    def __init__(self, model_path: str, class_names_path: str):
        self.model_path = model_path
        self.class_names_path = class_names_path
        self._model = None
        self._class_names = []
        self._is_loaded = False
        self._infer_fn = None

    def load(self):
        """Lazily load the model and class names."""
        if self._is_loaded:
            return

        if not os.path.exists(self.model_path):
            raise FileNotFoundError(f"Model file not found: {self.model_path}")
        
        if not os.path.exists(self.class_names_path):
            raise FileNotFoundError(f"Class names file not found: {self.class_names_path}")

        # Import tensorflow only when needed
        import tensorflow as tf
        
        self._model = tf.saved_model.load(self.model_path)
        self._infer_fn = self._model.signatures["serving_default"]
        
        with open(self.class_names_path, 'r') as f:
            class_dict = json.load(f)
            # Create a list ordered by index
            self._class_names = [None] * len(class_dict)
            for name, idx in class_dict.items():
                self._class_names[idx] = name

        self._is_loaded = True
        print(f"[PlantDiseasePredictor] Successfully loaded model and {len(self._class_names)} classes.")

    def parse_class_name(self, class_name: str) -> dict:
        """
        Parses 'Crop___Disease' format.
        Examples: 
        Tomato___Early_blight -> Crop: Tomato, Disease: Early blight
        Potato___healthy -> Crop: Potato, Disease: healthy
        """
        parts = class_name.split("___")
        crop = parts[0].replace("_", " ").strip()
        
        disease = ""
        is_healthy = False
        
        if len(parts) > 1:
            disease_raw = parts[1]
            if "healthy" in disease_raw.lower():
                is_healthy = True
            
            # Clean up the disease string
            disease = disease_raw.replace("_", " ").strip()
        else:
            disease = "Unknown"
            
        return {
            "crop": crop,
            "disease": disease,
            "is_healthy": is_healthy
        }

    def predict(self, image_bytes: bytes) -> dict:
        """
        Process image bytes and return predictions.
        """
        self.load()
        
        # Preprocessing: RGB, 224x224, rescale 1./255
        try:
            img = Image.open(BytesIO(image_bytes)).convert("RGB")
            img = img.resize((224, 224))
            img_array = np.array(img) / 255.0
            img_array = np.expand_dims(img_array, axis=0)
        except Exception as e:
            raise ValueError(f"Failed to process image: {str(e)}")

        # Inference using SavedModel signature
        import tensorflow as tf
        img_tensor = tf.constant(img_array, dtype=tf.float32)
        predictions_dict = self._infer_fn(input_layer=img_tensor)
        
        # Extract the array from the returned dictionary
        predictions = predictions_dict["output_0"].numpy()[0]
        
        # Get top 3 predictions
        top_3_indices = np.argsort(predictions)[-3:][::-1]
        
        top_prediction = None
        top_3 = []
        
        for idx in top_3_indices:
            class_name = self._class_names[idx]
            confidence = float(predictions[idx]) * 100.0
            parsed = self.parse_class_name(class_name)
            
            pred_obj = {
                "predicted_class": class_name,
                "confidence": round(confidence, 2),
                "crop": parsed["crop"],
                "disease": parsed["disease"],
                "is_healthy": parsed["is_healthy"]
            }
            
            top_3.append(pred_obj)
            
            if top_prediction is None:
                top_prediction = pred_obj
                
        # Return structured output
        return {
            "predicted_class": top_prediction["predicted_class"],
            "confidence": top_prediction["confidence"],
            "crop": top_prediction["crop"],
            "disease": top_prediction["disease"],
            "is_healthy": top_prediction["is_healthy"],
            "top_3": top_3
        }
