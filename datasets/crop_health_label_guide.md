# Crop Health Labeling Guide (Ground Truth)

This guide provides objective visual and physical criteria for human agronomists/observers to label crop health status. 
**IMPORTANT**: Do not base these labels on current weather or sensor readings (e.g., "The soil is dry, so I will label it stressed"). The AI needs to learn the relationship between the sensor readings and the *actual physical state* of the plant. Label exactly what you see.

## Labeling Categories

### Option 1: 4-Class System (Recommended if you have an experienced agronomist)

1. **Healthy**
   - **Leaves**: Vibrant color typical for the crop, fully expanded, turgid (firm, not wilting). No yellowing, spotting, or pest damage.
   - **Stem/Stalk**: Upright and firm.
   - **Growth**: Normal progression for the current growth stage.

2. **Mild_Stress**
   - **Leaves**: Very slight drooping or loss of turgor during the hottest part of the day. Minor discoloration (faint yellowing on lowest leaves) but generally green and functional.
   - **Stem/Stalk**: Mostly upright.
   - **Impact**: Plant is showing initial signs of lacking water/nutrients or heat stress, but will completely recover immediately if watered/cooled.

3. **Moderate_Stress**
   - **Leaves**: Distinct wilting visible even outside peak heat hours. Noticeable yellowing (chlorosis) or browning of margins on older leaves. Minor pest damage or disease spots.
   - **Stem/Stalk**: Slight bending or softening.
   - **Impact**: Growth is visibly stunted. Flowers/fruits might be aborting or undersized. Immediate intervention is required to prevent yield loss.

4. **Severe_Stress**
   - **Leaves**: Severe, permanent wilting. Widespread necrosis (dead, brown tissue). Leaves dropping off prematurely. Extensive pest or disease colonization.
   - **Stem/Stalk**: Severely compromised, leaning heavily, or snapped.
   - **Impact**: Plant is dying or severely stunted. Recovery is unlikely without massive intervention, and significant yield loss is guaranteed.

### Option 2: 3-Class System (Recommended if labeling is done by less experienced staff)
*Note: If distinguishing between Mild and Moderate stress is too subjective, use this simpler system.*

1. **Healthy**: Firm leaves, normal color, upright growth.
2. **Stressed**: Wilting, yellowing, or stunted growth. Needs water, fertilizer, or pest management soon.
3. **Severely_Stressed**: Dying, completely wilted, widespread dead tissue.

## How to Record an Observation
1. Stand next to the specific crop/zone being monitored by the ESP32.
2. Take a photo (optional but highly recommended for validation).
3. Record the exact **timestamp** of the observation.
4. Record the **crop** type.
5. Select the **health_status** based strictly on the visual criteria above.
6. Record any **notes** (e.g., "Aphids spotted on underside of leaves").
7. The system will automatically fetch the ESP32 sensor values (`soil_moisture`, `air_temperature`, etc.) corresponding to the exact timestamp you recorded.
