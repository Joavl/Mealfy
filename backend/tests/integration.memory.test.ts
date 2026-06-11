import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { app } from '../src/app';
import { env } from '../src/config/env';
import { setTokenVerifier, MockTokenVerifier } from '../src/shared/auth/TokenVerifier';
import { MockDatabase } from '../src/database/mock-db';
import { Server } from 'http';

let server: Server;
let apiBaseUrl: string;

async function seedMockDb() {
  const users = [
    {
      id: 'admin-1',
      name: 'Admin Mealfy',
      email: 'admin@mealfy.com',
      role: 'admin',
      status: 'active',
      totalDonated: 0
    },
    {
      id: 'donor-1',
      name: 'Doador Demo',
      email: 'doador@mealfy.com',
      role: 'donor',
      status: 'active',
      totalDonated: 150,
      facebook: 'mealfy.doadores',
      instagram: '@doadordemo',
      privacySettings: {
        showOnRanking: true,
        showInstagram: true,
        anonymousMode: false
      }
    },
    {
      id: 'entity-user-1',
      name: 'Entidade Aprovada',
      email: 'entidade@mealfy.com',
      role: 'entity',
      status: 'approved',
      entityId: 'entity-1'
    },
    {
      id: 'entity-user-pending',
      name: 'Entidade Pendente',
      email: 'entidadependente@mealfy.com',
      role: 'entity',
      status: 'pending',
      entityId: 'entity-pending-1'
    },
    {
      id: 'beneficiary-1',
      name: 'Beneficiário Teste',
      email: 'beneficiario@mealfy.com',
      role: 'beneficiary',
      status: 'active',
      beneficiaryId: 'family-1'
    }
  ];

  const families = [
    { id: 'family-1', representativeName: 'Ana Costa', region: 'Recife · PE', neighborhood: 'Boa Viagem', childrenCount: 2, status: 'approved', supportStatus: 'needs_help', sourceType: 'entity', sourceLabel: 'Instituto Esperança', latitude: -8.05, longitude: -34.88 },
    { id: 'f-helio-1', representativeName: 'Família Silva (Helio)', region: 'Heliópolis', childrenCount: 2, status: 'approved', supportStatus: 'needs_help', sourceType: 'entity', sourceLabel: 'Cadastrado por Admin', latitude: -23.612, longitude: -46.593 },
    { id: 'f-helio-2', representativeName: 'Família Souza (Helio Fed)', region: 'Heliópolis', childrenCount: 1, status: 'approved', supportStatus: 'fed', sourceType: 'entity', sourceLabel: 'Cadastrado por Admin', latitude: -23.613, longitude: -46.594 },
    { id: 'f-helio-3', representativeName: 'Família Lima (Helio Pend)', region: 'Heliópolis', childrenCount: 3, status: 'pending', supportStatus: 'needs_help', sourceType: 'donor_indication', sourceLabel: 'Indicado', latitude: -23.614, longitude: -46.595 }
  ];

  const entities = [
    {
      id: 'entity-1',
      name: 'Instituto Esperança',
      cnpj: '12345678000199',
      type: 'ONG',
      responsibleName: 'Entidade Aprovada',
      email: 'entidade@mealfy.com',
      phone: '11999999999',
      region: 'Recife · PE',
      status: 'approved'
    },
    {
      id: 'entity-pending-1',
      name: 'Associação Heliópolis Viva',
      cnpj: '98765432000188',
      type: 'INSTITUTO',
      responsibleName: 'Entidade Pendente',
      email: 'entidadependente@mealfy.com',
      phone: '11988888888',
      region: 'Heliópolis',
      status: 'pending'
    }
  ];

  await MockDatabase.write('users', users);
  await MockDatabase.write('families', families);
  await MockDatabase.write('entities', entities);
  await MockDatabase.write('indications', []);
  await MockDatabase.write('donations', []);
  await MockDatabase.write('giftcards', []);
  await MockDatabase.write('featured-donors', { donorIds: [] });
  await MockDatabase.write('audit-logs', []);
}

beforeAll(async () => {
  env.DATABASE_MODE = 'memory';
  env.AUTH_MODE = 'mock';
  setTokenVerifier(new MockTokenVerifier());

  await seedMockDb();

  server = app.listen(0);
  const address = server.address();
  if (typeof address === 'object' && address !== null) {
    apiBaseUrl = `http://localhost:${address.port}/api`;
  }
});

afterAll(async () => {
  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });
});

describe('Mealfy HTTP Integration Tests (Memory Mode)', () => {
  it('should pass liveness check /health', async () => {
    const res = await fetch(`${apiBaseUrl}/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(expect.objectContaining({ status: 'ok' }));
  });

  it('should pass readiness check /health/ready', async () => {
    const res = await fetch(`${apiBaseUrl}/health/ready`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(expect.objectContaining({ status: 'ready', database: 'connected' }));
  });

  it('should register a new donor', async () => {
    const res = await fetch(`${apiBaseUrl}/auth/register/donor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'John Donor',
        email: 'johndonor@example.com',
        documentType: 'cpf',
        documentNumber: '12345678909',
        phone: '11999998888',
        privacySettings: {
          showOnRanking: true
        }
      })
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.email).toBe('johndonor@example.com');
    expect(body.role).toBe('donor');
  });

  it('should register a pending entity', async () => {
    const res = await fetch(`${apiBaseUrl}/auth/register/entity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Mãos Dadas ONG',
        email: 'maosdadas@example.com',
        cnpj: '12345678901234',
        region: 'Heliópolis',
        type: 'ONG',
        responsibleName: 'Maria Silva',
        phone: '11988887777'
      })
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.email).toBe('maosdadas@example.com');
    expect(body.role).toBe('entity');
    expect(body.status).toBe('pending');
  });

  it('should approve a pending entity', async () => {
    // Fetch pending entities first to find the pending entity user ID
    const pendingRes = await fetch(`${apiBaseUrl}/admin/entities/pending`, {
      headers: { 'Authorization': 'admin-1' }
    });
    const pendingList = await pendingRes.json();
    const target = pendingList.find((e: any) => e.email === 'entidadependente@mealfy.com');
    expect(target).toBeDefined();

    // Approve the entity
    const approveRes = await fetch(`${apiBaseUrl}/admin/entities/${target.id}/approve`, {
      method: 'PATCH',
      headers: {
        'Authorization': 'admin-1',
        'Content-Type': 'application/json'
      }
    });

    expect(approveRes.status).toBe(200);
    const approveBody = await approveRes.json();
    expect(approveBody.message).toContain('approved');

    // Confirm it's no longer pending
    const users = await MockDatabase.read<any>('users');
    const updatedUser = users.find((u: any) => u.id === target.id);
    expect(updatedUser.status).toBe('approved');
  });

  it('should register a beneficiary and reject duplicates', async () => {
    const payload = {
      familyName: 'Família Silva',
      responsibleName: 'José Silva',
      responsibleCpf: '99988877766',
      childrenCount: 2,
      childrenNames: ['Criança A', 'Criança B'],
      photoUrl: 'http://example.com/photo.jpg',
      region: 'Heliópolis',
      neighborhood: 'Heliópolis',
      city: 'São Paulo',
      state: 'SP'
    };

    const res = await fetch(`${apiBaseUrl}/auth/register/beneficiary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.user.role).toBe('beneficiary');
    expect(body.family.representativeName).toBe('Família Silva');

    // Duplicate registration should fail
    const dupRes = await fetch(`${apiBaseUrl}/auth/register/beneficiary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    expect(dupRes.status).toBe(409);
  });

  it('should create a family indication as a donor', async () => {
    const res = await fetch(`${apiBaseUrl}/indications`, {
      method: 'POST',
      headers: {
        'Authorization': 'donor-1',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        representativeName: 'Indicada de Teste',
        region: 'Heliópolis',
        childrenCount: 3,
        observation: 'Necessita de apoio alimentar urgente'
      })
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.representativeName).toBe('Indicada de Teste');
    expect(body.status).toBe('pending');
  });

  it('should convert an indication to family', async () => {
    // Read indications
    const indications = await MockDatabase.read<any>('indications');
    const target = indications[0];
    expect(target).toBeDefined();

    // Convert as an admin
    const convertRes = await fetch(`${apiBaseUrl}/indications/${target.id}/convert`, {
      method: 'POST',
      headers: { 'Authorization': 'admin-1' }
    });

    if (convertRes.status !== 201) {
      console.log('convertRes status:', convertRes.status);
      console.log('convertRes body:', await convertRes.json());
    }
    expect(convertRes.status).toBe(201);
    const convertedFamily = await convertRes.json();
    expect(convertedFamily.representativeName).toBe(target.representativeName);
    expect(convertedFamily.status).toBe('approved');
    expect(convertedFamily.supportStatus).toBe('needs_help');
    // Geolocation jitter check
    expect(convertedFamily.latitude).toBeGreaterThan(-23.62);
    expect(convertedFamily.latitude).toBeLessThan(-23.6);
  });

  it('should process individual donation', async () => {
    const res = await fetch(`${apiBaseUrl}/donations`, {
      method: 'POST',
      headers: {
        'Authorization': 'donor-1',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        familyId: 'f-helio-1',
        amount: 40,
        message: 'Apoio Alimentar',
        communityId: 'Heliópolis'
      })
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.donation.amount).toBe(40);
    expect(body.giftCard.status).toBe('sent');

    // Verify family supportStatus updated to fed
    const families = await MockDatabase.read<any>('families');
    const targetFam = families.find((f: any) => f.id === 'f-helio-1');
    expect(targetFam.supportStatus).toBe('fed');
  });

  it('should process batch donations and handle partial failures', async () => {
    const res = await fetch(`${apiBaseUrl}/donations/batch`, {
      method: 'POST',
      headers: {
        'Authorization': 'donor-1',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        familyIds: ['f-helio-3', 'non-existent-id'],
        amountPerFamily: 30
      })
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    // Should have succeeded for f-helio-3 and failed for non-existent-id, returning 1 item in results
    expect(body.length).toBe(1);
    expect(body[0].donation.familyId).toBe('f-helio-3');
  });

  it('should process regional donation with centavos integers and residue division', async () => {
    // Reset supportStatus to needs_help for testing regional distribution
    const families = await MockDatabase.read<any>('families');
    families.forEach((f: any) => {
      if (f.region === 'Heliópolis') {
        f.supportStatus = 'needs_help';
      }
    });
    await MockDatabase.write('families', families);

    // Heliópolis has f-helio-1, f-helio-2, f-helio-3 (3 families in Heliópolis with needs_help/fed reset)
    // Let's verify how many needs_help families we have in Heliópolis: f-helio-1, f-helio-2, f-helio-3 = 3 families
    // Total Amount: R$ 100.00 (10000 cents). Division by 3:
    // Base cents per family = 10000 / 3 = 3333 cents (R$ 33.33)
    // Residue cents = 10000 % 3 = 1 cent.
    // Deterministic sorting by ID ASC:
    // f-helio-1 (first) should get 33.34
    // f-helio-2 (second) should get 33.33
    // f-helio-3 (third) should get 33.33

    const res = await fetch(`${apiBaseUrl}/donations/regional`, {
      method: 'POST',
      headers: {
        'Authorization': 'donor-1',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        communityId: 'Heliópolis',
        totalAmount: 100.00
      })
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.impactedFamiliesCount).toBe(3);

    // Verify exact distribution from returned donations
    const sortedDons = body.donations.sort((a: any, b: any) => a.familyId.localeCompare(b.familyId));
    expect(sortedDons[0].familyId).toBe('f-helio-1');
    expect(sortedDons[0].amount).toBe(33.34);

    expect(sortedDons[1].familyId).toBe('f-helio-2');
    expect(sortedDons[1].amount).toBe(33.33);

    expect(sortedDons[2].familyId).toBe('f-helio-3');
    expect(sortedDons[2].amount).toBe(33.33);
  });

  it('should respect showOnRanking privacy settings', async () => {
    // Register two donors: one visible, one hidden
    await fetch(`${apiBaseUrl}/auth/register/donor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Visible Donor',
        email: 'vis@example.com',
        documentType: 'cpf',
        documentNumber: '11111111111',
        privacySettings: { showOnRanking: true }
      })
    });

    await fetch(`${apiBaseUrl}/auth/register/donor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Hidden Donor',
        email: 'hid@example.com',
        documentType: 'cpf',
        documentNumber: '22222222222',
        privacySettings: { showOnRanking: false }
      })
    });

    // Make donations to populate ranking total
    const users = await MockDatabase.read<any>('users');
    const visDonor = users.find((u: any) => u.email === 'vis@example.com');
    const hidDonor = users.find((u: any) => u.email === 'hid@example.com');

    // Simulate donation incrementing totalDonated
    visDonor.totalDonated = 500;
    hidDonor.totalDonated = 800;
    await MockDatabase.write('users', users);

    const rankingRes = await fetch(`${apiBaseUrl}/ranking`);
    expect(rankingRes.status).toBe(200);
    const ranking = await rankingRes.json();

    const hasVisible = ranking.some((r: any) => r.name === 'Visible Donor');
    const hasHidden = ranking.some((r: any) => r.name === 'Hidden Donor');

    expect(hasVisible).toBe(true);
    expect(hasHidden).toBe(false);
  });
});
