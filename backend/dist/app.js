"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
require("express-async-errors");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const errorHandler_1 = require("./shared/middlewares/errorHandler");
const auth_routes_1 = require("./modules/auth/auth.routes");
const families_routes_1 = require("./modules/families/families.routes");
const indications_routes_1 = require("./modules/indications/indications.routes");
const donations_routes_1 = require("./modules/donations/donations.routes");
const ranking_routes_1 = require("./modules/ranking/ranking.routes");
const admin_routes_1 = require("./modules/admin/admin.routes");
const app = (0, express_1.default)();
exports.app = app;
app.use((0, cors_1.default)({
    origin: process.env.CORS_ORIGIN || '*'
}));
app.use(express_1.default.json());
// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// Routes
app.use('/auth', auth_routes_1.authRoutes);
app.use('/families', families_routes_1.familiesRoutes);
app.use('/indications', indications_routes_1.indicationsRoutes);
app.use('/donations', donations_routes_1.donationsRoutes);
app.use('/ranking', ranking_routes_1.rankingRoutes);
app.use('/admin', admin_routes_1.adminRoutes);
app.use(errorHandler_1.errorHandler);
