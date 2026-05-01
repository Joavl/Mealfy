"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mock_db_1 = require("./mock-db");
const seed = async () => {
    console.log('🌱 Seeding database...');
    const users = [
        {
            id: 'admin-1',
            name: 'Admin Mealfy',
            email: 'admin@mealfy.org',
            role: 'admin',
            status: 'active',
            totalDonated: 0
        },
        {
            id: 'donor-1',
            name: 'João Doador',
            email: 'joao@email.com',
            role: 'donor',
            status: 'active',
            totalDonated: 150,
            privacySettings: {
                showOnRanking: true,
                showInstagram: true,
                anonymousMode: false
            }
        }
    ];
    const families = [
        {
            id: 'f-1',
            representativeName: 'Família Silva',
            region: 'Heliópolis',
            childrenCount: 2,
            status: 'approved',
            supportStatus: 'needs_help',
            sourceType: 'entity',
            sourceLabel: 'Cadastrado por Admin',
            latitude: -23.612,
            longitude: -46.593
        }
    ];
    await mock_db_1.MockDatabase.write('users', users);
    await mock_db_1.MockDatabase.write('families', families);
    await mock_db_1.MockDatabase.write('indications', []);
    await mock_db_1.MockDatabase.write('donations', []);
    await mock_db_1.MockDatabase.write('giftcards', []);
    await mock_db_1.MockDatabase.write('entities', []);
    await mock_db_1.MockDatabase.write('audit-logs', []);
    console.log('✅ Seed completed!');
};
seed();
