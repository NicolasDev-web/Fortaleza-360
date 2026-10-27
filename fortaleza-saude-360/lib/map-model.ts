import {
  boundsOf,
  createProjection,
  kmPerUnit,
  multiPolygonToPath,
  normalizeName,
  pointInMultiPolygon,
  polygonCentroid,
  project,
  projectedBox,
  quantize,
  type Box,
  type MultiPolygonCoords,
  type Position,
  type ProjectionParams,
} from "@/lib/geo";

export type NeighborhoodShape = {
  code: string;
  name: string;
  path: string;
  centroid: [number, number];
  box: Box;
  facilityIds: string[];
  reference: string | null;
};

export type FacilityPoint = {
  id: string;
  name: string;
  type: string;
  management: string | null;
  sus: boolean | null;
  cnes: string | null;
  declaredNeighborhood: string | null;
  /** Bairro obtido por ponto-no-polígono; `null` quando nenhum contém o ponto. */
  neighborhoodCode: string | null;
  position: Position;
  x: number;
  y: number;
  reference: string | null;
};

export type MapModel = {
  projection: ProjectionParams;
  kmPerUnit: number;
  boundaryPath: string;
  areaKm2: number | null;
  neighborhoods: NeighborhoodShape[];
  facilities: FacilityPoint[];
};

type Feature = {
  properties: Record<string, unknown>;
  geometry: { type: string; coordinates: unknown };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readFeatures(collection: unknown, label: string): Feature[] {
  if (!isRecord(collection) || collection.type !== "FeatureCollection") {
    throw new Error(`${label}: FeatureCollection esperada.`);
  }

  const features = collection.features;
  if (!Array.isArray(features) || features.length === 0) {
    throw new Error(`${label}: nenhuma feição encontrada.`);
  }

  return features.map((feature, index) => {
    if (!isRecord(feature) || !isRecord(feature.geometry)) {
      throw new Error(`${label}: feição ${index} sem geometria.`);
    }

    return {
      properties: isRecord(feature.properties) ? feature.properties : {},
      geometry: feature.geometry as Feature["geometry"],
    };
  });
}

function isPosition(value: unknown): value is Position {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    Number.isFinite(value[0]) &&
    Number.isFinite(value[1])
  );
}

function toMultiPolygon(geometry: Feature["geometry"], label: string): MultiPolygonCoords {
  const coordinates =
    geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;

  const valid =
    (geometry.type === "Polygon" || geometry.type === "MultiPolygon") &&
    Array.isArray(coordinates) &&
    coordinates.every(
      (polygon) =>
        Array.isArray(polygon) &&
        polygon.every((ring) => Array.isArray(ring) && ring.every(isPosition)),
    );

  if (!valid) throw new Error(`${label}: geometria poligonal inválida.`);

  return coordinates as MultiPolygonCoords;
}

function text(value: unknown): string | null {
  if (typeof value === "string" && value.trim() !== "") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

export function buildMapModel(
  boundaryCollection: unknown,
  neighborhoodCollection: unknown,
  facilityCollection: unknown,
): MapModel {
  const [boundaryFeature] = readFeatures(boundaryCollection, "Limite municipal");
  const boundary = toMultiPolygon(boundaryFeature.geometry, "Limite municipal");
  const projection = createProjection(boundsOf(boundary));

  const rawNeighborhoods = readFeatures(neighborhoodCollection, "Bairros").map(
    (feature, index) => {
      const code = text(feature.properties.code);
      const name = text(feature.properties.name);
      if (!code || !name) throw new Error(`Bairros: feição ${index} sem código ou nome.`);

      return {
        code,
        name,
        reference: text(feature.properties.reference_date),
        geometry: toMultiPolygon(feature.geometry, `Bairro ${code}`),
      };
    },
  );

  const facilities: FacilityPoint[] = readFeatures(facilityCollection, "UAPS").map(
    (feature, index) => {
      const id = text(feature.properties.id);
      const name = text(feature.properties.name);
      const coordinates = feature.geometry.coordinates;

      if (!id || !name || feature.geometry.type !== "Point" || !isPosition(coordinates)) {
        throw new Error(`UAPS: feição ${index} inválida.`);
      }

      const position: Position = [coordinates[0], coordinates[1]];
      const container = rawNeighborhoods.find(({ geometry }) =>
        pointInMultiPolygon(position, geometry),
      );
      const [x, y] = project(projection, position);
      const sus = feature.properties.sus;

      return {
        id,
        name,
        type: text(feature.properties.type) ?? "UAPS",
        management: text(feature.properties.management),
        sus: typeof sus === "boolean" ? sus : null,
        cnes: text(feature.properties.cnes),
        declaredNeighborhood: text(feature.properties.neighborhood),
        neighborhoodCode: container?.code ?? null,
        position,
        x: quantize(x),
        y: quantize(y),
        reference: text(feature.properties.reference_date),
      };
    },
  );

  const neighborhoods: NeighborhoodShape[] = rawNeighborhoods
    .map(({ code, name, reference, geometry }) => {
      const [cx, cy] = project(projection, polygonCentroid(geometry));

      return {
        code,
        name,
        reference,
        path: multiPolygonToPath(geometry, projection),
        centroid: [quantize(cx), quantize(cy)] as [number, number],
        box: projectedBox(geometry, projection),
        facilityIds: facilities
          .filter((facility) => facility.neighborhoodCode === code)
          .map((facility) => facility.id),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  const area = boundaryFeature.properties.area_km2;

  return {
    projection,
    kmPerUnit: kmPerUnit(projection),
    boundaryPath: multiPolygonToPath(boundary, projection),
    areaKm2: typeof area === "number" && Number.isFinite(area) ? area : null,
    neighborhoods,
    facilities,
  };
}

/** Indica se o bairro declarado na fonte difere do bairro obtido espacialmente. */
export function hasNeighborhoodMismatch(
  facility: FacilityPoint,
  neighborhood: NeighborhoodShape | undefined,
): boolean {
  if (!facility.declaredNeighborhood || !neighborhood) return false;
  return normalizeName(facility.declaredNeighborhood) !== normalizeName(neighborhood.name);
}
