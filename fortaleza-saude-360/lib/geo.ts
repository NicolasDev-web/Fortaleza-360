export type Position = [lon: number, lat: number];
export type Ring = Position[];
export type PolygonCoords = Ring[];
export type MultiPolygonCoords = PolygonCoords[];

export type Bounds = {
  minLon: number;
  minLat: number;
  maxLon: number;
  maxLat: number;
};

/** Caixa em unidades de tela: [x0, y0, x1, y1]. */
export type Box = [number, number, number, number];

/**
 * Parâmetros serializáveis de uma projeção equiretangular local.
 * A correção por cos(latitude média) mantém a forma do município
 * praticamente conforme na escala de Fortaleza (~0,2° de extensão).
 */
export type ProjectionParams = {
  minLon: number;
  maxLat: number;
  cosLat: number;
  scale: number;
  padding: number;
  width: number;
  height: number;
};

const KM_PER_DEGREE = (2 * Math.PI * 6371.0088) / 360;

export function boundsOf(polygons: MultiPolygonCoords): Bounds {
  const bounds: Bounds = {
    minLon: Infinity,
    minLat: Infinity,
    maxLon: -Infinity,
    maxLat: -Infinity,
  };

  for (const polygon of polygons) {
    for (const ring of polygon) {
      for (const [lon, lat] of ring) {
        if (lon < bounds.minLon) bounds.minLon = lon;
        if (lon > bounds.maxLon) bounds.maxLon = lon;
        if (lat < bounds.minLat) bounds.minLat = lat;
        if (lat > bounds.maxLat) bounds.maxLat = lat;
      }
    }
  }

  if (!Number.isFinite(bounds.minLon) || !Number.isFinite(bounds.minLat)) {
    throw new Error("Geometria sem coordenadas válidas.");
  }

  return bounds;
}

export function createProjection(
  bounds: Bounds,
  width = 1000,
  padding = 28,
): ProjectionParams {
  const midLat = (bounds.minLat + bounds.maxLat) / 2;
  const cosLat = Math.cos((midLat * Math.PI) / 180);
  const spanX = (bounds.maxLon - bounds.minLon) * cosLat;
  const spanY = bounds.maxLat - bounds.minLat;

  if (spanX <= 0 || spanY <= 0) {
    throw new Error("Extensão geográfica inválida para projeção.");
  }

  const scale = (width - padding * 2) / spanX;

  return {
    minLon: bounds.minLon,
    maxLat: bounds.maxLat,
    cosLat,
    scale,
    padding,
    width,
    height: Math.round(spanY * scale + padding * 2),
  };
}

export function project(
  params: ProjectionParams,
  [lon, lat]: Position,
): [number, number] {
  return [
    params.padding + (lon - params.minLon) * params.cosLat * params.scale,
    params.padding + (params.maxLat - lat) * params.scale,
  ];
}

export function unproject(
  params: ProjectionParams,
  x: number,
  y: number,
): Position {
  return [
    params.minLon + (x - params.padding) / (params.cosLat * params.scale),
    params.maxLat - (y - params.padding) / params.scale,
  ];
}

/** Quilômetros representados por uma unidade do viewBox. */
export function kmPerUnit(params: ProjectionParams): number {
  return KM_PER_DEGREE / params.scale;
}

export function quantize(value: number, step = 0.1): number {
  return Math.round(value / step) * step;
}

/** Número compacto para SVG: uma casa decimal, sem zero à esquerda. */
function formatUnit(value: number): string {
  return String(Math.round(value * 10) / 10).replace(/^(-?)0\./, "$1.");
}

/** Junta números sem espaços quando o sinal ou o ponto já os separam. */
function joinNumbers(values: string[]): string {
  return values.reduce((output, value, index) => {
    if (index === 0) return value;
    const needsSpace = !value.startsWith("-") && !(value.startsWith(".") && /\.\d*$/.test(output));
    return output + (needsSpace ? " " : "") + value;
  }, "");
}

/**
 * Converte um anel em comando SVG relativo. A quantização (0,2 unidade de
 * tela) é apenas de exibição: vértices que caem no mesmo ponto após o
 * arredondamento são descartados, sem alterar os arquivos de origem.
 */
export function ringToPath(
  ring: Ring,
  params: ProjectionParams,
  step = 0.2,
): string {
  const points: Array<[number, number]> = [];

  for (const position of ring) {
    const [x, y] = project(params, position);
    const point: [number, number] = [quantize(x, step), quantize(y, step)];
    const previous = points[points.length - 1];

    if (!previous || previous[0] !== point[0] || previous[1] !== point[1]) {
      points.push(point);
    }
  }

  const first = points[0];
  const last = points[points.length - 1];
  if (points.length > 1 && first[0] === last[0] && first[1] === last[1]) {
    points.pop();
  }

  if (points.length < 3) return "";

  const deltas: string[] = [];
  for (let i = 1; i < points.length; i++) {
    deltas.push(
      formatUnit(points[i][0] - points[i - 1][0]),
      formatUnit(points[i][1] - points[i - 1][1]),
    );
  }

  return `M${joinNumbers([formatUnit(first[0]), formatUnit(first[1])])}l${joinNumbers(deltas)}z`;
}

export function multiPolygonToPath(
  polygons: MultiPolygonCoords,
  params: ProjectionParams,
): string {
  return polygons
    .flatMap((polygon) => polygon.map((ring) => ringToPath(ring, params)))
    .join("");
}

export function pointInRing([lon, lat]: Position, ring: Ring): boolean {
  let inside = false;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const crosses =
      yi > lat !== yj > lat &&
      lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;

    if (crosses) inside = !inside;
  }

  return inside;
}

export function pointInMultiPolygon(
  point: Position,
  polygons: MultiPolygonCoords,
): boolean {
  return polygons.some(
    ([outer, ...holes]) =>
      outer !== undefined &&
      pointInRing(point, outer) &&
      !holes.some((hole) => pointInRing(point, hole)),
  );
}

function ringAreaAndCentroid(ring: Ring): { area: number; cx: number; cy: number } {
  let area = 0;
  let cx = 0;
  let cy = 0;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [x0, y0] = ring[j];
    const [x1, y1] = ring[i];
    const cross = x0 * y1 - x1 * y0;
    area += cross;
    cx += (x0 + x1) * cross;
    cy += (y0 + y1) * cross;
  }

  area /= 2;

  if (area === 0) return { area: 0, cx: ring[0]?.[0] ?? 0, cy: ring[0]?.[1] ?? 0 };

  return { area, cx: cx / (6 * area), cy: cy / (6 * area) };
}

/** Centroide ponderado por área (anéis internos subtraem área). */
export function polygonCentroid(polygons: MultiPolygonCoords): Position {
  let totalArea = 0;
  let sumX = 0;
  let sumY = 0;

  for (const polygon of polygons) {
    polygon.forEach((ring, index) => {
      const { area, cx, cy } = ringAreaAndCentroid(ring);
      const signed = index === 0 ? Math.abs(area) : -Math.abs(area);
      totalArea += signed;
      sumX += cx * signed;
      sumY += cy * signed;
    });
  }

  if (totalArea === 0) {
    const first = polygons[0]?.[0]?.[0];
    if (!first) throw new Error("Polígono vazio.");
    return first;
  }

  return [sumX / totalArea, sumY / totalArea];
}

export function projectedBox(
  polygons: MultiPolygonCoords,
  params: ProjectionParams,
): Box {
  const bounds = boundsOf(polygons);
  const [x0, y0] = project(params, [bounds.minLon, bounds.maxLat]);
  const [x1, y1] = project(params, [bounds.maxLon, bounds.minLat]);

  return [x0, y0, x1, y1].map((value) => quantize(value)) as Box;
}

function toDms(value: number, positive: string, negative: string): string {
  const hemisphere = value >= 0 ? positive : negative;
  const absolute = Math.abs(value);
  const degrees = Math.floor(absolute);
  const minutesFloat = (absolute - degrees) * 60;
  const minutes = Math.floor(minutesFloat);
  const seconds = Math.round((minutesFloat - minutes) * 60);
  const carryMinutes = seconds === 60 ? minutes + 1 : minutes;
  const finalSeconds = seconds === 60 ? 0 : seconds;

  return `${String(degrees).padStart(2, "0")}°${String(carryMinutes).padStart(2, "0")}′${String(finalSeconds).padStart(2, "0")}″${hemisphere}`;
}

export function formatCoordinate([lon, lat]: Position): string {
  return `${toDms(lat, "N", "S")} ${toDms(lon, "L", "O")}`;
}

/** Remove acentos e caixa para comparar nomes de bairros entre fontes. */
export function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}
