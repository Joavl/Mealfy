import { prisma } from '../../database/prisma';
import { AppError } from '../../shared/errors/AppError';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

type Cursor = { createdAt: string; id: string };

type DirectPixRow = {
  id: string;
  familyId: string;
  amountCents: number;
  status: string;
  createdAt: Date;
  declaredAt: Date | null;
  receiptConfirmation: { outcome: string; respondedAt: Date } | null;
  declaration: { cancellation: { canceledAt: Date } | null } | null;
  oldQrDeclaration: { createdAt: Date } | null;
};

type LegacyRow = { id: string; familyId: string; amount: number; createdAt: Date };

export interface PrivateTimelineItem {
  id: string;
  kind: 'PIX_DIRETO' | 'VALE_PRESENTE_LEGADO';
  label: string;
  status: string;
  amountCents: number;
  occurredAt: string;
  events: Array<{ type: string; label: string; occurredAt: string }>;
  familyId?: string;
  donorAlias?: string;
}

export interface PrivateTimelinePage {
  items: PrivateTimelineItem[];
  nextCursor: string | null;
}

function invalidCursor(): never {
  throw new AppError('Cursor inválido.', 422, 'invalid_cursor');
}

function decodeCursor(value: string | undefined): Cursor | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as unknown;
    if (!parsed || typeof parsed !== 'object') invalidCursor();
    const cursor = parsed as Partial<Cursor>;
    if (typeof cursor.createdAt !== 'string' || typeof cursor.id !== 'string' || !cursor.id) invalidCursor();
    const date = new Date(cursor.createdAt);
    if (Number.isNaN(date.getTime()) || date.toISOString() !== cursor.createdAt) invalidCursor();
    return { createdAt: cursor.createdAt, id: cursor.id };
  } catch (error) {
    if (error instanceof AppError) throw error;
    invalidCursor();
  }
}

function encodeCursor(item: PrivateTimelineItem): string {
  return Buffer.from(JSON.stringify({ createdAt: item.occurredAt, id: item.id })).toString('base64url');
}

function pageSize(limit: number | undefined): number {
  if (limit === undefined) return DEFAULT_PAGE_SIZE;
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_PAGE_SIZE) {
    throw new AppError('Limite de página inválido.', 422, 'invalid_page_limit');
  }
  return limit;
}

function keyset(cursor: Cursor | null) {
  if (!cursor) return undefined;
  const createdAt = new Date(cursor.createdAt);
  return { OR: [{ createdAt: { lt: createdAt } }, { createdAt, id: { lt: cursor.id } }] };
}

function directPixItem(row: DirectPixRow, actor: 'donor' | 'responsible'): PrivateTimelineItem {
  const events = [{ type: 'INTENT_CREATED', label: 'Intenção de doação criada', occurredAt: row.createdAt.toISOString() }];
  if (row.declaredAt) events.push({ type: 'SEND_DECLARED', label: 'Declaração de envio — aguardando resposta da família', occurredAt: row.declaredAt.toISOString() });
  if (row.declaration?.cancellation) events.push({ type: 'DECLARATION_CANCELED', label: 'Declaração de envio cancelada pelo doador', occurredAt: row.declaration.cancellation.canceledAt.toISOString() });
  if (row.receiptConfirmation?.outcome === 'RECEIVED_EXACT') events.push({ type: 'FAMILY_RECEIPT_CONFIRMED', label: 'Recebimento confirmado pela família', occurredAt: row.receiptConfirmation.respondedAt.toISOString() });
  if (row.receiptConfirmation && row.receiptConfirmation.outcome !== 'RECEIVED_EXACT') events.push({ type: 'FOLLOW_UP_OPENED', label: 'Resposta da família registrada — em acompanhamento', occurredAt: row.receiptConfirmation.respondedAt.toISOString() });
  if (row.oldQrDeclaration) events.push({ type: 'OLD_QR_DECLARED', label: 'Declaração de Pix com código antigo', occurredAt: row.oldQrDeclaration.createdAt.toISOString() });

  const latest = events[events.length - 1];
  const status = row.status === 'OPEN' ? 'INTENCAO_CRIADA'
    : row.status === 'DONOR_DECLARED' ? 'AGUARDANDO_RESPOSTA_FAMILIA'
    : row.status === 'CANCELED_BY_DONOR' ? 'DECLARACAO_CANCELADA'
    : row.status === 'FAMILY_CONFIRMED' ? 'RECEBIMENTO_CONFIRMADO_PELA_FAMILIA'
    : 'EM_ACOMPANHAMENTO';
  return {
    id: row.id, kind: 'PIX_DIRETO', amountCents: row.amountCents, label: latest.label, status,
    // Cursor ordering is creation order; preserve that public timestamp to make the opaque cursor exact.
    occurredAt: row.createdAt.toISOString(), events,
    ...(actor === 'donor' ? { familyId: row.familyId } : { donorAlias: 'Doador' }),
  };
}

function legacyItem(row: LegacyRow, actor: 'donor' | 'responsible'): PrivateTimelineItem {
  return {
    id: row.id,
    kind: 'VALE_PRESENTE_LEGADO',
    label: 'Vale-presente — modelo anterior',
    status: 'MODELO_ANTERIOR',
    amountCents: row.amount,
    occurredAt: row.createdAt.toISOString(),
    events: [{ type: 'LEGACY_GIFT_CARD', label: 'Vale-presente — modelo anterior', occurredAt: row.createdAt.toISOString() }],
    ...(actor === 'donor' ? { familyId: row.familyId } : { donorAlias: 'Doador' }),
  };
}

function compareNewest(left: PrivateTimelineItem, right: PrivateTimelineItem): number {
  const byDate = Date.parse(right.occurredAt) - Date.parse(left.occurredAt);
  return byDate || right.id.localeCompare(left.id);
}

async function listTimeline(
  actor: 'donor' | 'responsible',
  userId: string,
  cursorValue?: string,
  limitValue?: number,
): Promise<PrivateTimelinePage> {
  const cursor = decodeCursor(cursorValue);
  const limit = pageSize(limitValue);
  const where = keyset(cursor);
  const take = limit + 1;

  let direct: DirectPixRow[];
  let legacy: LegacyRow[];
  if (actor === 'donor') {
    [direct, legacy] = await Promise.all([
      prisma.directPixIntent.findMany({
        where: { donorId: userId, ...where },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take,
        select: {
          id: true, familyId: true, amountCents: true, status: true, createdAt: true, declaredAt: true,
          receiptConfirmation: { select: { outcome: true, respondedAt: true } },
          declaration: { select: { cancellation: { select: { canceledAt: true } } } },
          oldQrDeclaration: { select: { createdAt: true } },
        },
      }),
      prisma.donation.findMany({ where: { donorId: userId, ...where }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take, select: { id: true, familyId: true, amount: true, createdAt: true } }),
    ]);
  } else {
    const assignments = await prisma.familyResponsibleAssignment.findMany({
      where: { responsibleUserId: userId, endedAt: null, responsibleUser: { status: 'active', role: 'beneficiary' } },
      select: { familyId: true },
    });
    const familyIds = assignments.map(({ familyId }) => familyId);
    if (!familyIds.length) return { items: [], nextCursor: null };
    [direct, legacy] = await Promise.all([
      prisma.directPixIntent.findMany({
        where: { familyId: { in: familyIds }, ...where },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take,
        select: {
          id: true, familyId: true, amountCents: true, status: true, createdAt: true, declaredAt: true,
          receiptConfirmation: { select: { outcome: true, respondedAt: true } },
          declaration: { select: { cancellation: { select: { canceledAt: true } } } },
          oldQrDeclaration: { select: { createdAt: true } },
        },
      }),
      prisma.donation.findMany({ where: { familyId: { in: familyIds }, ...where }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take, select: { id: true, familyId: true, amount: true, createdAt: true } }),
    ]);
  }

  const all = [...direct.map((row) => directPixItem(row, actor)), ...legacy.map((row) => legacyItem(row, actor))].sort(compareNewest);
  const items = all.slice(0, limit);
  return { items, nextCursor: all.length > limit ? encodeCursor(items[items.length - 1]) : null };
}

export function listDonorPrivateTimeline(userId: string, cursor?: string, limit?: number) {
  return listTimeline('donor', userId, cursor, limit);
}

export function listResponsiblePrivateTimeline(userId: string, cursor?: string, limit?: number) {
  return listTimeline('responsible', userId, cursor, limit);
}
