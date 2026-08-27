const http = require('http');

const type = process.argv[2] || 'warning';

// Simulated ESP32 payloads
const payloads = {
  warning: { 
    deviceId: "ESP32-001", soilMoisture: 28, airTemperature: 25, humidity: 50, soilTemperature: 22, lightIntensity: 2000, rainDetected: false 
  },
  recovery: { 
    deviceId: "ESP32-001", soilMoisture: 45, airTemperature: 25, humidity: 50, soilTemperature: 22, lightIntensity: 2000, rainDetected: false 
  },
  heat: { 
    deviceId: "ESP32-001", soilMoisture: 50, airTemperature: 39, humidity: 25, soilTemperature: 22, lightIntensity: 2000, rainDetected: false 
  },
  rain: { 
    deviceId: "ESP32-001", soilMoisture: 50, airTemperature: 25, humidity: 50, soilTemperature: 22, lightIntensity: 2000, rainDetected: true 
  }
};

if (!payloads[type]) {
  console.log(`Unknown test type: "${type}"`);
  console.log(`Available types: warning, recovery, heat, rain`);
  process.exit(1);
}

const data = JSON.stringify(payloads[type]);

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/ingest/sensor',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

console.log(`\n📡 Simulating ESP32 sending [${type}] alert...`);
console.log(`Payload:`, payloads[type]);

const req = http.request(options, (res) => {
  let responseBody = '';
  res.on('data', (chunk) => responseBody += chunk);
  res.on('end', () => {
    console.log(`\n✅ Backend Response [${res.statusCode}]:`, responseBody);
    console.log(`If you have the Android app open, you should see the notification!`);
  });
});

req.on('error', (error) => {
  console.error('\n❌ Error: Could not connect to the backend.');
  console.error('Make sure you have started the backend by running: npm run dev');
});

req.write(data);
req.end();
