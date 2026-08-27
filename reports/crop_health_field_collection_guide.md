# Crop Health Field Collection Guide

To ensure the SmartAgri AI Fusion model learns effectively, it is critical that all observations submitted via the Data Collection interface are genuine, accurate, and diverse.

## 1. Core Principles
- **Ground Truth Only:** You are the absolute source of truth. Do NOT use sensor values to decide the plant's health. Inspect the actual physical plant.
- **No Fabricated Data:** Never manufacture stress conditions artificially just to create data points. Only log what naturally occurs in the field.
- **Genuine Observations Only:** Do NOT submit test or blank records to the system.

## 2. Visual Criteria for Labels
When selecting a Health Status, use the following rigorous definitions:

- **Healthy:**
  - Leaves are firm, turgid, and exhibit normal green coloration.
  - No visible wilting, discoloration, curling, or pest damage.
  - Plant is growing at the expected rate for its phenological stage.

- **Stressed:**
  - Early signs of wilting, slight drooping of leaves, or minor loss of turgor pressure.
  - Slight discoloration (e.g., pale green, mild yellowing on lower leaves).
  - Plant recovers turgor at night but wilts during the day (classic early drought stress).

- **Severely Stressed:**
  - Severe wilting; leaves are flaccid, dry, or brittle.
  - Significant chlorosis (yellowing) or necrosis (browning/dead tissue) extending beyond lower leaves.
  - Stunted growth or dropped leaves.
  - High risk of permanent wilting point or plant death.

## 3. Best Practices for Collection
- **Temporal Diversity:** Record observations across different times of the day (morning, midday peak heat, evening). Plants exhibit different physiological states at these times (e.g., midday depression).
- **Environmental Diversity:** Ensure you collect data after rainfall, during dry spells, on cloudy days, and on bright sunny days.
- **Spacing:** Avoid repeatedly labeling the exact same plant within a very short period (e.g., every 5 minutes). Space observations out (e.g., daily or when conditions change).
- **Notes:** Use the "Observer Notes" field to document specific symptoms (e.g., "Leaves curling inward, soil feels completely dry").

## 4. Privacy & Traceability
- Your authentication token is used to trace observations for quality control, but personal identifiable information (PII) is completely stripped from the exported ML dataset.
