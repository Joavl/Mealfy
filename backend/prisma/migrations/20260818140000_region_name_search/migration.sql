-- Busca de município sem depender de acento.
--
-- `contains` com mode:insensitive resolve caixa mas não acento: "sao paulo" não
-- encontrava "São Paulo", o que quebra a busca para a maior parte dos 5.571
-- municípios. Coluna dedicada evita depender da extensão `unaccent`.

-- AlterTable
ALTER TABLE "regions" ADD COLUMN "nameSearch" TEXT NOT NULL DEFAULT '';

-- Backfill: minúsculas + remoção de acentos das letras usadas em nomes de
-- municípios brasileiros. translate() é suficiente e não exige extensão.
UPDATE "regions"
SET "nameSearch" = lower(
  translate(
    "name",
    'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
    'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'
  )
);

-- Índice antigo era por "name"; a busca agora acontece em "nameSearch".
DROP INDEX IF EXISTS "regions_name_idx";
CREATE INDEX "regions_nameSearch_idx" ON "regions"("nameSearch");
