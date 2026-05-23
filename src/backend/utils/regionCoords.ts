/** Coordenadas aproximadas por região (centro + leve variação) */
const REGION_CENTERS: Record<string, [number, number]> = {
  'Heliópolis': [-23.612, -46.593],
  'Heliopolis': [-23.612, -46.593],
  'Paraisópolis': [-23.617, -46.728],
  'Paraisopolis': [-23.617, -46.728],
  'Cidade Tiradentes': [-23.58, -46.74],
  'Grajaú': [-23.75, -46.68],
  'Grajau': [-23.75, -46.68],
};

export function coordsForRegion(region: string): [number, number] {
  const key = Object.keys(REGION_CENTERS).find(
    (r) => r.toLowerCase() === region.trim().toLowerCase(),
  );
  const base = key ? REGION_CENTERS[key] : [-23.5505, -46.6333];
  const jitter = () => (Math.random() - 0.5) * 0.012;
  return [base[0] + jitter(), base[1] + jitter()];
}
