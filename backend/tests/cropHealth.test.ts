import test from 'node:test';
import assert from 'node:assert';
import mongoose from 'mongoose';
import { getSensorPreview, createObservation, exportDataset } from '../src/controllers/cropHealthController';
import SensorReading from '../src/models/SensorReading';
import CropHealthObservation from '../src/models/CropHealthObservation';

// Helper to mock express Request and Response
const mockReqRes = (body = {}, query = {}) => {
  const req = { body, query } as any;
  const res = {
    statusCode: 200,
    jsonData: null,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: any) {
      this.jsonData = data;
      return this;
    }
  } as any;
  return { req, res };
};

test('Crop Health Controller Tests', async (t) => {
  // Setup DB
  await mongoose.connect('mongodb://127.0.0.1:27017/agrismart_test_crophealth');
  await SensorReading.deleteMany({});
  await CropHealthObservation.deleteMany({});

  const now = new Date();
  
  // Create a mock sensor reading
  const reading = await SensorReading.create({
    deviceId: 'ESP32-TEST',
    soilMoisture: 45,
    soilTemperature: 22,
    airTemperature: 25,
    humidity: 60,
    lightIntensity: 1000,
    rainDetected: false,
    timestamp: now
  });

  const tenMinsLater = new Date(now.getTime() + 10 * 60000);
  const thirtyMinsLater = new Date(now.getTime() + 30 * 60000);

  await t.test('1. Valid observation submission & 6. Correct nearest sensor matching & 9. Frontend values ignored', async () => {
    const { req, res } = mockReqRes({
      crop: 'Wheat',
      healthStatus: 'Healthy',
      observationTimestamp: tenMinsLater.toISOString(),
      deviceId: 'ESP32-TEST',
      // Simulating malicious/accidental frontend values that should be ignored
      soilMoisture: 999 
    });

    await createObservation(req, res);
    assert.strictEqual(res.statusCode, 201);
    
    // Check DB that it used actual values
    const obs = await CropHealthObservation.findOne({ crop: 'Wheat' });
    assert.ok(obs);
    assert.strictEqual(obs.soilMoisture, 45); // Ignored the 999
    assert.strictEqual(obs.healthStatus, 'Healthy');
  });

  await t.test('2. Invalid healthStatus', async () => {
    const { req, res } = mockReqRes({
      crop: 'Wheat',
      healthStatus: 'FakeStatus',
      observationTimestamp: now.toISOString()
    });

    await createObservation(req, res);
    assert.strictEqual(res.statusCode, 400);
  });

  await t.test('3. Missing crop', async () => {
    const { req, res } = mockReqRes({
      healthStatus: 'Stressed',
      observationTimestamp: now.toISOString()
    });

    await createObservation(req, res);
    assert.strictEqual(res.statusCode, 400);
  });

  await t.test('4. Invalid timestamp', async () => {
    const { req, res } = mockReqRes({
      crop: 'Wheat',
      healthStatus: 'Stressed',
      observationTimestamp: 'not-a-date'
    });

    await createObservation(req, res);
    assert.strictEqual(res.statusCode, 400);
  });

  await t.test('5. No sensor within +/-15 minutes', async () => {
    const { req, res } = mockReqRes({
      crop: 'Wheat',
      healthStatus: 'Stressed',
      observationTimestamp: thirtyMinsLater.toISOString(),
      deviceId: 'ESP32-TEST'
    });

    await createObservation(req, res);
    assert.strictEqual(res.statusCode, 404);
  });

  await t.test('7. Wrong device is not matched', async () => {
    const { req, res } = mockReqRes({
      crop: 'Wheat',
      healthStatus: 'Stressed',
      observationTimestamp: now.toISOString(),
      deviceId: 'ESP32-WRONG'
    });

    await createObservation(req, res);
    assert.strictEqual(res.statusCode, 404);
  });

  await t.test('8. Duplicate submission protection', async () => {
    const { req, res } = mockReqRes({
      crop: 'Corn',
      healthStatus: 'Severely_Stressed',
      observationTimestamp: now.toISOString(),
      deviceId: 'ESP32-TEST'
    });

    // First submission should succeed
    await createObservation(req, res);
    assert.strictEqual(res.statusCode, 201);

    // Second identical submission within 1 min should fail
    const { req: req2, res: res2 } = mockReqRes({
      crop: 'Corn',
      healthStatus: 'Severely_Stressed',
      observationTimestamp: now.toISOString(),
      deviceId: 'ESP32-TEST'
    });
    await createObservation(req2, res2);
    assert.strictEqual(res2.statusCode, 409);
  });

  await t.test('10. CSV has exactly the required columns', async () => {
    const { req, res } = mockReqRes();
    await exportDataset(req, res);
    assert.strictEqual(res.statusCode, 200);
    assert.ok(res.jsonData.csvPreview.includes('timestamp,crop,soil_moisture,air_temperature,air_humidity,soil_temperature,rain,light_intensity,health_status\n'));
  });

  await t.test('11. Sensor preview matches same logic', async () => {
    const { req, res } = mockReqRes({}, { timestamp: tenMinsLater.toISOString(), deviceId: 'ESP32-TEST' });
    await getSensorPreview(req, res);
    
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.jsonData.soilMoisture, 45); // Should match the same sensor reading
    assert.strictEqual(res.jsonData.timeDifferenceMinutes, -10); // Difference
  });

  // Teardown
  await mongoose.disconnect();
});
