import { describe, expect, it } from "vitest";
import {
  boundsOf,
  createProjection,
  formatCoordinate,
  kmPerUnit,
  pointInMultiPolygon,
  polygonCentroid,
  project,
  ringToPath,
  unproject,
  type MultiPolygonCoords,
} from "@/lib/geo";
import { hasNeighborhoodMismatch } from "@/lib/map-model";
import { demoModel } from "./fixtures/demo-geo";

const demoPolygon: MultiPolygonCoords = [
  [
    [
      [-38.6, -3.9],
      [-38.4, -3.9],
      [-38.4, -3.7],
      [-38.6, -3.7],
      [-38.6, -3.9],
    ],
    [
      [-38.52, -3.82],
      [-38.48, -3.82],
      [-38.48, -3.78],
      [-38.52, -3.78],
      [-38.52, -3.82],
    ],
  ],
];

describe("projeção local", () => {
  const projection = createProjection(boundsOf(demoPolygon));

  it("projeta e reverte coordenadas sem perda perceptível", () => {
    const [x, y] = project(projection, [-38.47, -3.76]);
    const [lon, lat] = unproject(projection, x, y);

    expect(lon).toBeCloseTo(-38.47, 9);
    expect(lat).toBeCloseTo(-3.76, 9);
  });

  it("mantém o norte para cima e o oeste à esquerda", () => {
    const [xWest, yNorth] = project(projection, [-38.6, -3.7]);
    const [xEast, ySouth] = project(projection, [-38.4, -3.9]);

    expect(xWest).toBeLessThan(xEast);
    expect(yNorth).toBeLessThan(ySouth);
  });

  it("calcula escala coerente com a extensão em quilômetros", () => {
    const widthKm = (projection.width - projection.padding * 2) * kmPerUnit(projection);
    // 0,2° de longitude a ~3,8° S ≈ 22,2 km.
    expect(widthKm).toBeGreaterThan(21.9);
    expect(widthKm).toBeLessThan(22.4);
  });
});

describe("geometria", () => {
  it("respeita anéis internos no teste ponto-no-polígono", () => {
    expect(pointInMultiPolygon([-38.45, -3.75], demoPolygon)).toBe(true);
    expect(pointInMultiPolygon([-38.5, -3.8], demoPolygon)).toBe(false);
    expect(pointInMultiPolygon([-38.3, -3.8], demoPolygon)).toBe(false);
  });

  it("calcula centroide ponderado por área", () => {
    const [lon, lat] = polygonCentroid([[demoPolygon[0][0]]]);
    expect(lon).toBeCloseTo(-38.5, 9);
    expect(lat).toBeCloseTo(-3.8, 9);
  });

  it("descarta vértices repetidos após a quantização de exibição", () => {
    const projection = createProjection(boundsOf(demoPolygon));
    const ring: MultiPolygonCoords[0][0] = [
      [-38.6, -3.9],
      [-38.6000001, -3.9000001],
      [-38.4, -3.9],
      [-38.4, -3.7],
      [-38.6, -3.9],
    ];
    const path = ringToPath(ring, projection);

    expect(path.startsWith("M")).toBe(true);
    expect(path.endsWith("z")).toBe(true);
    expect(path.match(/l/g)).toHaveLength(1);
    expect(ringToPath(ring.slice(0, 2), projection)).toBe("");
  });

  it("formata coordenadas em graus, minutos e segundos", () => {
    expect(formatCoordinate([-38.5433, -3.7172])).toBe("03°43′02″S 38°32′36″O");
  });
});

describe("modelo do mapa (DEMO)", () => {
  const model = demoModel();

  it("associa unidades ao bairro por ponto-no-polígono", () => {
    const byId = new Map(model.facilities.map((item) => [item.id, item]));

    expect(byId.get("demo-1")?.neighborhoodCode).toBe("1");
    expect(byId.get("demo-2")?.neighborhoodCode).toBe("2");
    expect(byId.get("demo-3")?.neighborhoodCode).toBeNull();
    expect(model.neighborhoods.map(({ name }) => name)).toEqual([
      "DEMO Bairro Leste",
      "DEMO Bairro Oeste",
    ]);
  });

  it("sinaliza bairro declarado diferente do bairro espacial", () => {
    const shapes = new Map(model.neighborhoods.map((item) => [item.code, item]));
    const [west, east] = model.facilities;

    expect(hasNeighborhoodMismatch(west, shapes.get("1"))).toBe(false);
    expect(hasNeighborhoodMismatch(east, shapes.get("2"))).toBe(true);
  });

  it("rejeita coleções inválidas em vez de exibir dados incompletos", async () => {
    const { buildMapModel } = await import("@/lib/map-model");
    expect(() => buildMapModel({ type: "FeatureCollection", features: [] }, {}, {})).toThrow();
  });
});
