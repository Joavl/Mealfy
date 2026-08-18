import { prisma } from '../../database/prisma';
import { AppError } from '../../shared/errors/AppError';
import { getCurrentCycleStart } from '../../shared/utils/feedCycle';

/**
 * Regiões (municípios) a partir do IBGE.
 *
 * Duas fontes distintas, de propósito:
 *  - `/localidades/municipios` dá a LISTA (código, nome, UF) — mas não traz
 *    coordenada nenhuma.
 *  - `/malhas/municipios/{id}` dá a GEOMETRIA, de onde tiramos o centroide.
 *
 * A lista é importada de uma vez (5.571 linhas, tabela pequena). O centroide é
 * buscado só quando a região passa a ser usada: baixar a malha dos 5.571 seria
 * lento e desnecessário, já que só interessa onde existe família.
 */

const IBGE_MUNICIPIOS =
  'https://servicodados.ibge.gov.br/api/v1/localidades/municipios?orderBy=nome';

const malhaUrl = (ibgeCode: number) =>
  `https://servicodados.ibge.gov.br/api/v3/malhas/municipios/${ibgeCode}` +
  `?formato=application/vnd.geo+json&qualidade=minima`;

interface IbgeMunicipio {
  id: number;
  nome: string;
  microrregiao?: { mesorregiao?: { UF?: { sigla?: string } } };
  'regiao-imediata'?: { 'regiao-intermediaria'?: { UF?: { sigla?: string } } };
}

/** A UF aparece em dois caminhos diferentes conforme o município. */
function ufOf(m: IbgeMunicipio): string | null {
  return (
    m.microrregiao?.mesorregiao?.UF?.sigla ??
    m['regiao-imediata']?.['regiao-intermediaria']?.UF?.sigla ??
    null
  );
}

/**
 * Importa/atualiza a lista de municípios. Idempotente: rodar de novo só
 * corrige nome/UF, sem tocar nos centroides já resolvidos.
 */
export async function importFromIbge(): Promise<{ total: number; created: number; updated: number }> {
  const res = await fetch(IBGE_MUNICIPIOS).catch(() => null);
  if (!res || !res.ok) {
    throw new AppError('Não foi possível consultar o IBGE agora.', 502, 'ibge_unavailable');
  }
  const municipios = (await res.json()) as IbgeMunicipio[];

  // Municípios sem UF resolvível são ignorados em vez de gravados sujos.
  const rows = municipios
    .map((m) => ({ ibgeCode: m.id, name: m.nome, nameSearch: normalizeName(m.nome), state: ufOf(m) }))
    .filter((r): r is { ibgeCode: number; name: string; nameSearch: string; state: string } =>
      Boolean(r.state),
    );

  // Em lote: uma versão anterior fazia findUnique + create por município, o que
  // significava ~11 mil idas ao banco e levava minutos. `skipDuplicates` torna a
  // reexecução barata — só entram os que ainda não existem.
  const inserted = await prisma.region.createMany({ data: rows, skipDuplicates: true });

  return { total: municipios.length, created: inserted.count, updated: 0 };
}

/** Média dos vértices da malha simplificada — suficiente para posicionar a região. */
function centroidOf(geometry: unknown): { latitude: number; longitude: number } | null {
  const points: [number, number][] = [];

  const walk = (node: unknown): void => {
    if (!Array.isArray(node)) return;
    if (node.length === 2 && typeof node[0] === 'number' && typeof node[1] === 'number') {
      points.push([node[0], node[1]]); // GeoJSON é [lon, lat]
      return;
    }
    for (const child of node) walk(child);
  };
  walk((geometry as { coordinates?: unknown })?.coordinates);

  if (points.length === 0) return null;
  const lon = points.reduce((s, p) => s + p[0], 0) / points.length;
  const lat = points.reduce((s, p) => s + p[1], 0) / points.length;
  return { latitude: lat, longitude: lon };
}

/**
 * Garante que a região tenha coordenada, buscando a malha do IBGE na primeira
 * vez. Falha de rede não derruba o fluxo: devolve a região sem coordenada e
 * tenta de novo na próxima chamada.
 */
export async function ensureCoordinates(regionId: string) {
  const region = await prisma.region.findUnique({ where: { id: regionId } });
  if (!region) throw new AppError('Região não encontrada', 404, 'region_not_found');
  if (region.latitude !== null && region.longitude !== null) return region;

  const res = await fetch(malhaUrl(region.ibgeCode)).catch(() => null);
  if (!res || !res.ok) return region;

  try {
    const geo = (await res.json()) as { features?: { geometry?: unknown }[] };
    const center = centroidOf(geo.features?.[0]?.geometry);
    if (!center) return region;
    return prisma.region.update({ where: { id: region.id }, data: center });
  } catch {
    return region;
  }
}

/** Minúsculas + sem acento — mesma regra usada para preencher `nameSearch`. */
export function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Busca por nome/UF — usada no cadastro para escolher o município.
 * Compara em `nameSearch` para que "sao paulo" encontre "São Paulo".
 */
export async function searchRegions(query: string, state?: string, limit = 20) {
  return prisma.region.findMany({
    where: {
      nameSearch: { contains: normalizeName(query) },
      ...(state ? { state: state.toUpperCase() } : {}),
    },
    orderBy: [{ name: 'asc' }],
    take: limit,
    select: { id: true, ibgeCode: true, name: true, state: true },
  });
}

/**
 * Encontra o município pelo nome digitado + UF.
 *
 * Existe porque o cadastro grava `city`/`state` como texto e nada ligava esse
 * texto ao município do IBGE: família criada pela API ficava com `regionId`
 * nulo e, por isso, nunca aparecia no mapa nem contava nos totais da região.
 *
 * Compara por `nameSearch` (sem acento, minúsculo) e exige correspondência
 * exata: "São Paulo" e "são paulo" são o mesmo lugar, mas "Paulo" não é.
 */
export async function findRegionByCityState(city: string, state: string) {
  return prisma.region.findFirst({
    where: { nameSearch: normalizeName(city), state: state.toUpperCase() },
  });
}

/**
 * Regiões com famílias, para o doador escolher onde concentrar o apoio.
 *
 * Traz duas contagens diferentes de propósito:
 *  - `familiesTotal`: aprovadas na região (o alcance da rede ali)
 *  - `familiesInNeed`: as que PEDIRAM apoio no ciclo atual (quem precisa agora)
 *
 * Não exige coordenada: a lista é textual, e cobrar centroide aqui excluiria
 * regiões válidas só porque a malha ainda não foi baixada.
 */
export async function listRegionsWithCounts() {
  const [aprovadas, pedindo] = await Promise.all([
    prisma.family.groupBy({
      by: ['regionId'],
      where: { approvalStatus: 'approved', regionId: { not: null } },
      _count: { _all: true },
    }),
    prisma.family.groupBy({
      by: ['regionId'],
      where: {
        approvalStatus: 'approved',
        regionId: { not: null },
        supportRequestedAt: { gte: getCurrentCycleStart() },
      },
      _count: { _all: true },
    }),
  ]);

  if (aprovadas.length === 0) return [];

  const ids = aprovadas.map((g) => g.regionId!).filter(Boolean);
  const regions = await prisma.region.findMany({ where: { id: { in: ids } } });
  const totalById = new Map(aprovadas.map((g) => [g.regionId!, g._count._all]));
  const needById = new Map(pedindo.map((g) => [g.regionId!, g._count._all]));

  return regions
    .map((r) => ({
      id: r.id,
      ibgeCode: r.ibgeCode,
      name: r.name,
      state: r.state,
      latitude: r.latitude,
      longitude: r.longitude,
      familiesTotal: totalById.get(r.id) ?? 0,
      familiesInNeed: needById.get(r.id) ?? 0,
    }))
    // Quem tem mais gente pedindo agora aparece primeiro.
    .sort((a, b) => b.familiesInNeed - a.familiesInNeed || a.name.localeCompare(b.name));
}

/**
 * Regiões que têm ao menos uma família aprovada, com a contagem — é o que o
 * mapa desenha. Resolve o centroide de quem ainda não tem.
 */
export async function listRegionsWithFamilies() {
  const grouped = await prisma.family.groupBy({
    by: ['regionId'],
    where: { approvalStatus: 'approved', regionId: { not: null } },
    _count: { _all: true },
  });
  if (grouped.length === 0) return [];

  const ids = grouped.map((g) => g.regionId!).filter(Boolean);
  // Sequencial de propósito: são poucas regiões e evita rajada no IBGE.
  for (const id of ids) {
    await ensureCoordinates(id);
  }

  const regions = await prisma.region.findMany({ where: { id: { in: ids } } });
  const countById = new Map(grouped.map((g) => [g.regionId!, g._count._all]));

  return regions
    .filter((r) => r.latitude !== null && r.longitude !== null)
    .map((r) => ({
      id: r.id,
      ibgeCode: r.ibgeCode,
      name: r.name,
      state: r.state,
      latitude: r.latitude,
      longitude: r.longitude,
      familiesCount: countById.get(r.id) ?? 0,
    }));
}
