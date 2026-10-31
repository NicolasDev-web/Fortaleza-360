import { pointInMultiPolygon, type MultiPolygonCoords, type Position } from "@/lib/geo";
import { haversineMeters } from "@/lib/accessibility";

export type ScenarioData = {
  schema: number;
  nodes: Position[];
  edges: [number, number, number][];
  sectors: [number, number, [number, number][]][];
  sectorIds: string[];
  seeds: number[];
  snapScale: number;
  maxSnapM: number;
  bufferM: number;
  total: number;
  speeds: Record<string, number>;
  order: [string, number][];
  baseline: { scenario: string; minutes: number; representative_population: number }[];
  boundary: { type: string; coordinates: unknown };
};
export type ScenarioRow = {
  scenario: string; minutes: number; base: number; proposed: number; delta: number;
  deltaPercentagePoints: number;
};
export type ScenarioResult = { snapM: number; rows: ScenarioRow[]; total: number };

function travelTimes(data: ScenarioData, seeds: number[]): Float64Array {
  const adjacency: [number, number][][] = Array.from({ length: data.nodes.length }, () => []);
  for (const [u, v, cost] of data.edges) {
    adjacency[u].push([v, cost]); adjacency[v].push([u, cost]);
  }
  const times = new Float64Array(data.nodes.length).fill(Infinity);
  const heap: [number, number][] = [];
  const push = (item: [number, number]) => {
    let i = heap.length; heap.push(item);
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (heap[parent][0] <= item[0]) break;
      heap[i] = heap[parent]; i = parent;
    }
    heap[i] = item;
  };
  const pop = () => {
    const first = heap[0], last = heap.pop()!;
    if (heap.length) {
      let i = 0;
      while (i * 2 + 1 < heap.length) {
        let child = i * 2 + 1;
        if (child + 1 < heap.length && heap[child + 1][0] < heap[child][0]) child++;
        if (last[0] <= heap[child][0]) break;
        heap[i] = heap[child]; i = child;
      }
      heap[i] = last;
    }
    return first;
  };
  for (const seed of seeds) { times[seed] = 0; push([0, seed]); }
  const cutoff = 30 * data.speeds.fast / data.speeds.central;
  while (heap.length) {
    const [cost, node] = pop();
    if (cost !== times[node]) continue;
    for (const [next, edge] of adjacency[node]) {
      const candidate = cost + edge;
      if (candidate <= cutoff && candidate < times[next]) {
        times[next] = candidate; push([candidate, next]);
      }
    }
  }
  return times;
}

function accessTime(times: Float64Array, links: [number, number][]): number {
  let best = Infinity;
  for (const [node, extra] of links) best = Math.min(best, times[node] + extra);
  return best;
}

export function validateScenarioData(data: ScenarioData): void {
  const node = (n: number) => Number.isInteger(n) && n >= 0 && n < data.nodes.length;
  if (data.schema !== 1 || !data.nodes.length || data.order.length !== 9 || !data.seeds.length ||
      !data.nodes.every(p => p.length === 2 && p.every(Number.isFinite)) ||
      !data.seeds.every(node) ||
      !data.edges.every(([u, v, c]) => node(u) && node(v) && Number.isFinite(c) && c > 0) ||
      !data.sectors.every(([p, mask, links]) => Number.isInteger(p) && p >= 0 &&
        Number.isInteger(mask) && mask >= 0 && mask <= 511 &&
        links.every(([n, c]) => node(n) && Number.isFinite(c) && c >= 0))) {
    throw new Error("Dados do simulador inválidos.");
  }
  const times = travelTimes(data, data.seeds);
  const totals = data.order.map(() => 0);
  let total = 0;
  for (const [population, mask, links] of data.sectors) {
    total += population;
    const time = accessTime(times, links);
    data.order.forEach(([scenario, minutes], i) => {
      const included = time <= minutes * data.speeds[scenario] / data.speeds.central;
      if (included !== !!(mask & (1 << i))) throw new Error("Dados divergem da base publicada.");
      if (included) totals[i] += population;
    });
  }
  if (total !== data.total || data.baseline.some(row => {
    const i = data.order.findIndex(([s, t]) => s === row.scenario && t === row.minutes);
    return i < 0 || totals[i] !== row.representative_population;
  })) throw new Error("Totais divergem da base publicada.");
}

export function computeScenario(data: ScenarioData, point: Position): ScenarioResult {
  const polygons = (data.boundary.type === "Polygon" ? [data.boundary.coordinates] :
    data.boundary.coordinates) as MultiPolygonCoords;
  if (!point.every(Number.isFinite) || !pointInMultiPolygon(point, polygons)) {
    throw new Error("Escolha um ponto dentro do município de Fortaleza.");
  }
  let nearest = 0, best = Infinity;
  data.nodes.forEach(([lon, lat], i) => {
    const d = ((lon - point[0]) * data.snapScale) ** 2 + (lat - point[1]) ** 2;
    if (d < best) { best = d; nearest = i; }
  });
  const snapM = haversineMeters(point, data.nodes[nearest]);
  if (snapM > data.maxSnapM) throw new Error(`Não há nó caminhável a até ${data.maxSnapM} m desse ponto.`);
  const times = travelTimes(data, [nearest]);
  const rows = data.order.map(([scenario, minutes], i) => ({
    scenario, minutes, base: 0, proposed: 0, delta: 0, deltaPercentagePoints: 0, index: i,
  }));
  for (const [population, mask, links] of data.sectors) {
    const time = accessTime(times, links);
    for (const row of rows) {
      const base = !!(mask & (1 << row.index));
      const added = time <= row.minutes * data.speeds[row.scenario] / data.speeds.central;
      if (base) row.base += population;
      if (base || added) row.proposed += population;
    }
  }
  for (const row of rows) {
    row.delta = row.proposed - row.base;
    row.deltaPercentagePoints = data.total ? row.delta / data.total * 100 : 0;
  }
  return { snapM, rows, total: data.total };
}
