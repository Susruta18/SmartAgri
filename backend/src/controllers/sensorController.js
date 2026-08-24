"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardData = void 0;
const express_1 = require("express");
const getDashboardData = async (req, res) => {
    try {
        // Generate dummy sensor data for now
        const data = {
            soilMoisture: { value: Math.floor(Math.random() * 30) + 30, unit: '%', status: 'normal', trend: 'down', trendValue: '2%' },
            soilTemp: { value: Math.floor(Math.random() * 10) + 15, unit: '°C', status: 'normal', trend: 'stable', trendValue: '' },
            airTemp: { value: Math.floor(Math.random() * 15) + 20, unit: '°C', status: 'warning', trend: 'up', trendValue: '1.5°C' },
            humidity: { value: Math.floor(Math.random() * 40) + 40, unit: '%', status: 'normal', trend: 'down', trendValue: '5%' },
            rainStatus: { value: 'Clear', unit: '', status: 'normal', trend: 'stable', trendValue: '' },
            lightIntensity: { value: Math.floor(Math.random() * 500) + 500, unit: 'Lux', status: 'normal', trend: 'up', trendValue: '50 Lux' },
            waterLevel: { value: Math.floor(Math.random() * 50) + 30, unit: '%', status: 'normal', trend: 'down', trendValue: '10%' },
            cropHealth: { value: 'Healthy', unit: '', status: 'normal', trend: 'stable', trendValue: '' },
            lastUpdated: new Date().toISOString()
        };
        res.json(data);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
};
exports.getDashboardData = getDashboardData;
//# sourceMappingURL=sensorController.js.map