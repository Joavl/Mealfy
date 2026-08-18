/**
 * Importa os municípios do IBGE e liga as famílias já cadastradas.
 *
 * Rodar com: npm run regions:import
 *
 * Idempotente: pode ser executado de novo sem duplicar. O vínculo das famílias
 * é feito por (nome do município + UF), que é o dado que existia antes de haver
 * a tabela `regions` — famílias sem correspondência ficam sem região e são
 * listadas no fim, para resolução manual.
 */
import { prisma } from '../src/database/prisma';
import { importFromIbge, ensureCoordinates } from '../src/modules/regions/regions.service';

/** Compara nomes ignorando acento, caixa e espaço extra. */
const normalize = (v: string) =>
  v
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

async function main() {
  console.log('[regions] importando municípios do IBGE...');
  const summary = await importFromIbge();
  console.log(`[regions] ${summary.total} municípios | criados: ${summary.created} | atualizados: ${summary.updated}`);

  // ── Backfill: liga famílias existentes pelo par cidade + UF ──
  const families = await prisma.family.findMany({
    where: { regionId: null },
    select: { id: true, displayName: true, city: true, state: true },
  });

  if (families.length === 0) {
    console.log('[regions] nenhuma família pendente de vínculo.');
    return;
  }

  const regions = await prisma.region.findMany({ select: { id: true, name: true, state: true } });
  const byKey = new Map(regions.map((r) => [`${normalize(r.name)}|${r.state.toUpperCase()}`, r.id]));

  let linked = 0;
  const semCorrespondencia: string[] = [];

  for (const f of families) {
    const regionId = byKey.get(`${normalize(f.city)}|${f.state.toUpperCase()}`);
    if (!regionId) {
      semCorrespondencia.push(`${f.displayName} (${f.city}/${f.state})`);
      continue;
    }
    await prisma.family.update({ where: { id: f.id }, data: { regionId } });
    linked += 1;
  }

  console.log(`[regions] famílias vinculadas: ${linked} de ${families.length}`);
  if (semCorrespondencia.length > 0) {
    console.log('[regions] SEM correspondência (resolver manualmente):');
    semCorrespondencia.forEach((s) => console.log(`   - ${s}`));
  }

  // Resolve o centroide só das regiões que passaram a ter família.
  const usadas = await prisma.family.findMany({
    where: { regionId: { not: null } },
    select: { regionId: true },
    distinct: ['regionId'],
  });
  console.log(`[regions] buscando centroide de ${usadas.length} região(ões)...`);
  for (const u of usadas) {
    const r = await ensureCoordinates(u.regionId!);
    const ok = r.latitude !== null && r.longitude !== null;
    console.log(`   ${r.name}/${r.state}: ${ok ? `${r.latitude?.toFixed(4)}, ${r.longitude?.toFixed(4)}` : 'não resolvido'}`);
  }
}

main()
  .catch((e) => {
    console.error('[regions] erro:', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
