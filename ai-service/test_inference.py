import os
import sys
import pandas as pd
import requests

SPLITS_DIR = r"C:\Projects\SmartAgri\datasets\plant_disease_splits"
RAW_BASE = r"C:\Projects\SmartAgri\datasets"
TEST_CSV = os.path.join(SPLITS_DIR, "test.csv")

if not os.path.exists(TEST_CSV):
    print("Test CSV not found.")
    sys.exit(1)

df = pd.read_csv(TEST_CSV)
if df.empty:
    print("Test CSV empty.")
    sys.exit(1)

# Get first image
first_row = df.iloc[0]
img_rel_path = first_row['image_path'].replace('\\', '/')
img_abs_path = os.path.join(RAW_BASE, img_rel_path)

if not os.path.exists(img_abs_path):
    print(f"Image not found: {img_abs_path}")
    sys.exit(1)

print(f"Testing with image: {img_abs_path} (True class: {first_row['class_name']})")

from fastapi.testclient import TestClient
sys.path.append(r"C:\Projects\SmartAgri\ai-service")
from main import app

with TestClient(app) as client:
    with open(img_abs_path, 'rb') as f:
        response = client.post(
            "/predict/plant-disease",
            files={"file": (os.path.basename(img_abs_path), f, "image/jpeg")}
        )

print(f"Status Code: {response.status_code}")
if response.status_code == 200:
    import json
    print(json.dumps(response.json(), indent=2))
else:
    print(response.text)
