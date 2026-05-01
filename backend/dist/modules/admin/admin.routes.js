"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminRoutes = void 0;
const express_1 = require("express");
const admin_service_1 = require("./admin.service");
const auth_1 = require("../../shared/middlewares/auth");
const roleGuard_1 = require("../../shared/middlewares/roleGuard");
const adminRoutes = (0, express_1.Router)();
exports.adminRoutes = adminRoutes;
adminRoutes.use(auth_1.authMiddleware, (0, roleGuard_1.roleGuard)(['admin']));
adminRoutes.get('/entities/pending', async (req, res) => {
    const pending = await admin_service_1.AdminService.listPendingEntities();
    return res.json(pending);
});
adminRoutes.patch('/entities/:id/approve', async (req, res) => {
    await admin_service_1.AdminService.approveEntity(req.params.id);
    return res.json({ message: 'Entity approved successfully' });
});
adminRoutes.patch('/entities/:id/reject', async (req, res) => {
    await admin_service_1.AdminService.rejectEntity(req.params.id);
    return res.json({ message: 'Entity rejected successfully' });
});
