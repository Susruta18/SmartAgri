"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const sensorController_1 = require("../controllers/sensorController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
router.get('/dashboard', authMiddleware_1.authMiddleware, sensorController_1.getDashboardData);
exports.default = router;
//# sourceMappingURL=sensorRoutes.js.map