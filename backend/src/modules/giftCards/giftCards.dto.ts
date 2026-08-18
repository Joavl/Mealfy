import type { GiftCard } from '@prisma/client';
import { decryptGiftCardCode } from '../../shared/crypto/crypto.service';

/**
 * DTO admin de gift card — NUNCA inclui `codeEncrypted`, `codeHash` nem o código puro.
 * Só o `codeMasked` é exposto.
 */
export function toAdminGiftCard(g: GiftCard) {
  return {
    id: g.id,
    provider: g.provider,
    codeMasked: g.codeMasked,
    amount: g.amount,
    status: g.status,
    batchId: g.batchId,
    expiresAt: g.expiresAt,
    reservedAt: g.reservedAt,
    usedAt: g.usedAt,
    createdAt: g.createdAt,
    updatedAt: g.updatedAt,
  };
}

/**
 * DTO do BENEFICIÁRIO — único lugar que expõe o código em claro (decifrado).
 * PREPARADO para a Fase 4+, ainda NÃO usado por nenhum endpoint.
 */
export function toBeneficiaryGiftCard(g: GiftCard) {
  return {
    id: g.id,
    provider: g.provider,
    code: decryptGiftCardCode(g.codeEncrypted),
    amount: g.amount,
    status: g.status,
    expiresAt: g.expiresAt,
    releasedAt: g.usedAt,
  };
}
