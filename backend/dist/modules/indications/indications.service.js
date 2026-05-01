"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IndicationsService = void 0;
const uuid_1 = require("uuid");
const mock_db_1 = require("../../database/mock-db");
const AppError_1 = require("../../shared/errors/AppError");
const normalizeUtils_1 = require("../../shared/utils/normalizeUtils");
class IndicationsService {
    static async create(data, userId) {
        const indications = await mock_db_1.MockDatabase.read('indications');
        const newIndication = {
            ...data,
            id: `ind-${(0, uuid_1.v4)()}`,
            indicatedByUserId: userId,
            status: 'pending',
            createdAt: new Date().toISOString(),
        };
        indications.unshift(newIndication);
        await mock_db_1.MockDatabase.write('indications', indications);
        return newIndication;
    }
    static async listAll() {
        return mock_db_1.MockDatabase.read('indications');
    }
    static async convertToFamily(indicationId, user) {
        const indications = await mock_db_1.MockDatabase.read('indications');
        const idx = indications.findIndex(i => i.id === indicationId);
        if (idx === -1)
            throw new AppError_1.AppError('Indicação não encontrada', 404);
        const indication = indications[idx];
        if (indication.status === 'converted') {
            throw new AppError_1.AppError('Indicação já foi convertida', 409);
        }
        if (user.role === 'entity') {
            if (user.status !== 'approved') {
                throw new AppError_1.AppError('Entidades pendentes não podem converter indicações', 403);
            }
            // Validação de região
            const entities = await mock_db_1.MockDatabase.read('entities');
            const entityData = entities.find((e) => e.id === user.entityId);
            const indRegion = (0, normalizeUtils_1.normalizeString)(indication.region);
            const entityRegion = (0, normalizeUtils_1.normalizeString)(entityData?.region?.split('-')[0]);
            if (!indRegion.includes(entityRegion) && !entityRegion.includes(indRegion)) {
                throw new AppError_1.AppError('Indicação fora da sua região de atuação', 403);
            }
        }
        const families = await mock_db_1.MockDatabase.read('families');
        const newFamily = {
            id: `f-conv-${(0, uuid_1.v4)()}`,
            representativeName: indication.representativeName,
            region: indication.region,
            childrenCount: indication.childrenCount,
            status: 'approved',
            supportStatus: 'needs_help',
            createdByEntityId: user.entityId,
            sourceType: 'donor_indication',
            sourceLabel: user.role === 'admin' ? 'Validado por Admin Mealfy' : `Validado por ${user.name}`,
            originalIndicationId: indication.id,
            latitude: -23.612 + (Math.random() * 0.05),
            longitude: -46.593 + (Math.random() * 0.05),
        };
        families.unshift(newFamily);
        await mock_db_1.MockDatabase.write('families', families);
        indications[idx].status = 'converted';
        await mock_db_1.MockDatabase.write('indications', indications);
        await mock_db_1.MockDatabase.appendAuditLog({ type: 'CONVERT_INDICATION', indicationId, familyId: newFamily.id, userId: user.id });
        return newFamily;
    }
    static async updateStatus(id, status) {
        const indications = await mock_db_1.MockDatabase.read('indications');
        const idx = indications.findIndex(i => i.id === id);
        if (idx === -1)
            throw new AppError_1.AppError('Indicação não encontrada', 404);
        indications[idx].status = status;
        await mock_db_1.MockDatabase.write('indications', indications);
        return indications[idx];
    }
}
exports.IndicationsService = IndicationsService;
