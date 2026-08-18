-- Solicitação diária de apoio com validade de um ciclo.
--
-- Antes só existia `todayRequestedProvider`, que nunca expirava: uma vez
-- gravado, a família constava como tendo pedido para sempre — a solicitação
-- "amanhecia feita". Agora a data manda, e o pedido morre no reset das 08h SP.

-- AlterTable
ALTER TABLE "families" ADD COLUMN "supportRequestedAt" TIMESTAMP(3);

-- Índice: o mapa filtra por "pediu no ciclo atual" em toda carga.
CREATE INDEX "families_supportRequestedAt_idx" ON "families"("supportRequestedAt");

-- Nenhum backfill de propósito: ninguém pediu ainda sob a regra nova, e marcar
-- as famílias existentes como solicitantes seria inventar um pedido que não
-- aconteceu. Elas aparecem no mapa quando solicitarem.
