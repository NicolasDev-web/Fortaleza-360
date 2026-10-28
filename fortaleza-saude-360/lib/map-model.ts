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
import type { PopulationData } from "@/lib/population";

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
  /** Natureza publicada pela fonte; `null` quando a camada não a informa. */
  nature: string | null;
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
  /** Somente UAPS: base das contagens, do Modo História e dos KPIs. */
  facilities: FacilityPoint[];
  /** UPAs e hospitais municipais: camadas próprias, fora das contagens de UAPS. */
  otherUnits: FacilityPoint[];
  /** Censo 2022 por bairro; `null` se o arquivo faltar ou não passar na validação. */
  population: PopulationData | null;
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

type RawNeighborhood = { code: string; geometry: MultiPolygonCoords };

function readFacilityPoints(
  collection: unknown,
  label: string,
  defaultType: string,
  projection: ProjectionParams,
  neighborhoods: RawNeighborhood[],
): FacilityPoint[] {
  return readFeatures(collection, label).map((feature, index) => {
    const id = text(feature.properties.id);
    const name = text(feature.properties.name);
    const coordinates = feature.geometry.coordinates;

    if (!id || !name || feature.geometry.type !== "Point" || !isPosition(coordinates)) {
      throw new Error(`${label}: feição ${index} inválida.`);
    }

    const position: Position = [coordinates[0], coordinates[1]];
    const container = neighborhoods.find(({ geometry }) => pointInMultiPolygon(position, geometry));
    const [x, y] = project(projection, position);
    const sus = feature.properties.sus;

    return {
      id,
      name,
      type: text(feature.properties.type) ?? defaultType,
      nature: text(feature.properties.nature),
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
  });
}

export function buildMapModel(
  boundaryCollection: unknown,
  neighborhoodCollection: unknown,
  facilityCollection: unknown,
  otherUnitCollections: unknown[] = [],
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

  const facilities = readFacilityPoints(
    facilityCollection,
    "UAPS",
    "UAPS",
    projection,
    rawNeighborhoods,
  );
  const otherUnits = otherUnitCollections.flatMap((collection, index) =>
    readFacilityPoints(collection, `Unidades ${index + 1}`, "OTHER", projection, rawNeighborhoods),
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
    otherUnits,
    population: null,
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

/** Resumo de um bairro, igual no tooltip do mapa e no anúncio ao leitor de tela. */
export function neighborhoodSummary(neighborhood: NeighborhoodShape): string {
  const count = neighborhood.facilityIds.length;
  if (count === 0) return "nenhum posto de saúde dentro do bairro";
  return `${count} ${count === 1 ? "posto de saúde" : "postos de saúde"} dentro do bairro`;
}
