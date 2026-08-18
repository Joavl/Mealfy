import { prisma } from '../../database/prisma';
import { getCurrentCycleStart } from '../../shared/utils/feedCycle';
import { normalizeName, ensureCoordinates } from './regions.service';

/**
 * Comunidades — o nível que o doador realmente reconhece.
 *
 * "Rio de Janeiro" não diz a ninguém quem está sendo ajudado; "Cidade de Deus"
 * diz. Por isso o mapa passa a desenhar comunidades, e não municípios.
 *
 * De onde vem a coordenada, e por quê:
 *
 *  - O IBGE NÃO expõe esse nível por API. Foi verificado:
 *    `/localidades/favelas` e `/localidades/aglomerados` respondem 404; existem
 *    apenas `distritos`/`subdistritos`, que são divisão administrativa e não
 *    correspondem a favela nenhuma. A base "Favelas e Comunidades Urbanas"
 *    (Censo 2022) é publicada como arquivo para download, não como serviço.
 *  - Então a coordenada vem do OpenStreetMap (Nominatim), que é base
 *    COLABORATIVA e não governamental. `Community.source` grava isso, para que
 *    nenhuma tela apresente esse dado como se fosse oficial.
 *  - Quando o OSM não conhece o lugar, a comunidade fica com o centro do
 *    município e `source = region_centroid`. Ela continua no mapa, com o nome
 *    que o cadastro informou — sumir seria pior, e fingir precisão seria mentira.
 */

/**
 * Nominatim pede identificação de quem chama e no máximo 1 requisição por
 * segundo. As duas coisas são condição de uso do serviço, não detalhe.
 */
const NOMINATIM_UA =
  process.env.NOMINATIM_USER_AGENT || 'Mealfy/1.0 (+https://mealfy.app)';
const NOMINATIM_MIN_INTERVAL_MS = 1100;

let lastNominatimCall = 0;

/** Serializa as chamadas para respeitar o limite de 1/s do Nominatim. */
async function throttle(): Promise<void> {
  const wait = lastNominatimCall + NOMINATIM_MIN_INTERVAL_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastNominatimCall = Date.now();
}

interface NominatimHit {
  lat: string;
  lon: string;
  osm_type?: string;
  osm_id?: number;
  addresstype?: string;
}

/** Distância aproximada em km — só para conferir se o resultado é plausível. */
function distanceKm(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Raio de sanidade em torno do centro do município.
 *
 * Nomes como "Centro", "Vila Nova" ou "São José" existem em centenas de
 * cidades. Sem esta conferência, o doador veria a família a mil quilômetros de
 * onde ela realmente está — pior do que não mostrar área nenhuma.
 */
const MAX_DISTANCE_FROM_CITY_KM = 60;

/**
 * Procura a comunidade dentro do município.
 *
 * A consulta é em texto livre ("Rocinha, Rio de Janeiro, RJ"), e NÃO com os
 * parâmetros estruturados `city`/`state`: o Nominatim ignora os estruturados
 * quando `q` está presente, e a primeira versão disto caiu 100% no centro do
 * município por causa exatamente disso. Como texto livre não garante que o
 * resultado seja da cidade certa, a checagem de distância abaixo é que amarra.
 */
async function geocodeCommunity(
  name: string,
  city: string,
  state: string,
  cityCenter: { lat: number; lon: number } | null,
): Promise<{ latitude: number; longitude: number; osmId: string | null } | null> {
  // O nome vai ACENTUADO: buscar "Heliopolis" traz outro lugar que não
  // "Heliópolis". `nameSearch` serve para deduplicar, não para consultar.
  const q = `${name}, ${city}, ${state}`;
  const url =
    'https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=br' +
    `&q=${encodeURIComponent(q)}`;

  await throttle();
  const res = await fetch(url, { headers: { 'User-Agent': NOMINATIM_UA } }).catch(() => null);
  if (!res || !res.ok) return null;

  const hits = (await res.json().catch(() => null)) as NominatimHit[] | null;
  if (!hits?.length) return null;

  for (const hit of hits) {
    const latitude = Number(hit.lat);
    const longitude = Number(hit.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;

    if (
      cityCenter &&
      distanceKm(cityCenter, { lat: latitude, lon: longitude }) > MAX_DISTANCE_FROM_CITY_KM
    ) {
      continue; // resultado homônimo em outra cidade
    }

    return {
      latitude,
      longitude,
      osmId: hit.osm_id ? `${hit.osm_type ?? 'unknown'}/${hit.osm_id}` : null,
    };
  }

  return null;
}

/**
 * Encontra ou cria a comunidade pelo nome digitado, dentro do município.
 *
 * A unicidade é por (município, nomeNormalizado): é o que impede "Heliópolis",
 * "heliopolis" e "Heliopolis " de virarem três pontos distintos no mapa — o
 * problema que o texto livre criava antes.
 *
 * Não geocodifica aqui: cadastrar família não pode depender de rede externa.
 * A coordenada é resolvida depois, quando o mapa pede.
 */
export async function resolveCommunity(
  regionId: string,
  rawName: string | null | undefined,
): Promise<string | null> {
  const name = rawName?.trim();
  if (!name) return null;

  const nameSearch = normalizeName(name);
  if (!nameSearch) return null;

  const existing = await prisma.community.findUnique({
    where: { regionId_nameSearch: { regionId, nameSearch } },
  });
  if (existing) return existing.id;

  const created = await prisma.community.create({
    data: { regionId, name, nameSearch },
  });
  return created.id;
}

/**
 * Resolve a coordenada da comunidade, uma vez só.
 *
 * `geocodedAt` é o que impede reconsulta infinita: uma comunidade que o OSM não
 * conhece — e existem, "Favela do Rodo" não retorna nada — seria buscada de
 * novo a cada abertura do mapa se só olhássemos para `latitude === null`.
 */
export async function ensureCommunityCoordinates(communityId: string) {
  const community = await prisma.community.findUnique({
    where: { id: communityId },
    include: { region: true },
  });
  if (!community) return null;
  if (community.geocodedAt) return community;

  // O centro do município serve para duas coisas: conferir se o resultado do
  // OSM é plausível, e ser o destino quando não houver resultado.
  const region = await ensureCoordinates(community.regionId);
  const cityCenter =
    region.latitude !== null && region.longitude !== null
      ? { lat: region.latitude, lon: region.longitude }
      : null;

  const found = await geocodeCommunity(
    community.name,
    community.region.name,
    community.region.state,
    cityCenter,
  );

  if (found) {
    return prisma.community.update({
      where: { id: community.id },
      data: {
        latitude: found.latitude,
        longitude: found.longitude,
        osmId: found.osmId,
        source: 'osm',
        geocodedAt: new Date(),
      },
      include: { region: true },
    });
  }

  // Sem correspondência: cai para o centro do município, marcado como tal.
  return prisma.community.update({
    where: { id: community.id },
    data: {
      latitude: region.latitude,
      longitude: region.longitude,
      source: 'region_centroid',
      geocodedAt: new Date(),
    },
    include: { region: true },
  });
}

/**
 * Comunidades com famílias aprovadas — é o que o mapa desenha.
 *
 * Duas contagens, como nas regiões: `familiesTotal` é o alcance da rede ali;
 * `familiesInNeed` é quem pediu apoio no ciclo de hoje.
 */
export async function listCommunitiesForMap() {
  const [aprovadas, pedindo] = await Promise.all([
    prisma.family.groupBy({
      by: ['communityId'],
      where: { approvalStatus: 'approved', communityId: { not: null } },
      _count: { _all: true },
    }),
    prisma.family.groupBy({
      by: ['communityId'],
      where: {
        approvalStatus: 'approved',
        communityId: { not: null },
        supportRequestedAt: { gte: getCurrentCycleStart() },
      },
      _count: { _all: true },
    }),
  ]);

  if (aprovadas.length === 0) return [];

  const ids = aprovadas.map((g) => g.communityId!).filter(Boolean);

  // Sequencial de propósito: o Nominatim limita a 1 chamada por segundo, e
  // paralelizar aqui seria abusar de um serviço gratuito. Só as comunidades
  // ainda não geocodificadas chegam a fazer rede — as demais retornam do banco.
  for (const id of ids) {
    await ensureCommunityCoordinates(id);
  }

  const communities = await prisma.community.findMany({
    where: { id: { in: ids } },
    include: { region: true },
  });
  const totalById = new Map(aprovadas.map((g) => [g.communityId!, g._count._all]));
  const needById = new Map(pedindo.map((g) => [g.communityId!, g._count._all]));

  return communities
    .filter((c) => c.latitude !== null && c.longitude !== null)
    .map((c) => ({
      id: c.id,
      name: c.name,
      city: c.region.name,
      state: c.region.state,
      latitude: c.latitude,
      longitude: c.longitude,
      /// O app usa isto para não prometer precisão que não tem.
      source: c.source,
      familiesTotal: totalById.get(c.id) ?? 0,
      familiesInNeed: needById.get(c.id) ?? 0,
    }))
    .sort((a, b) => b.familiesInNeed - a.familiesInNeed || a.name.localeCompare(b.name));
}

/**
 * Vincula famílias antigas, cadastradas quando comunidade era só texto.
 *
 * Idempotente: só toca em quem tem `communityId` nulo. Usa `community` e, na
 * falta dele, `neighborhood` — em boa parte dos cadastros antigos o nome da
 * comunidade foi digitado no campo de bairro.
 */
export async function backfillCommunities(): Promise<{ linked: number; skipped: number }> {
  const families = await prisma.family.findMany({
    where: { communityId: null, regionId: { not: null } },
    select: { id: true, regionId: true, community: true, neighborhood: true },
  });

  let linked = 0;
  let skipped = 0;

  for (const f of families) {
    const communityId = await resolveCommunity(f.regionId!, f.community || f.neighborhood);
    if (!communityId) {
      skipped += 1;
      continue;
    }
    await prisma.family.update({ where: { id: f.id }, data: { communityId } });
    linked += 1;
  }

  return { linked, skipped };
}
