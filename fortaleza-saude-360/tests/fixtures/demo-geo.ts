import { buildMapModel } from "@/lib/map-model";

/** Geometrias sintéticas `DEMO`: não representam bairros nem unidades reais. */
const square = (x0: number, y0: number, x1: number, y1: number) => [
  [x0, y0],
  [x1, y0],
  [x1, y1],
  [x0, y1],
  [x0, y0],
];

export const demoBoundary = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { nome: "DEMO Município", area_km2: 488.2 },
      geometry: { type: "MultiPolygon", coordinates: [[square(-38.6, -3.9, -38.4, -3.7)]] },
    },
  ],
};

export const demoNeighborhoods = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { code: "1", name: "DEMO Bairro Oeste", reference_date: "2019" },
      geometry: { type: "MultiPolygon", coordinates: [[square(-38.6, -3.9, -38.5, -3.7)]] },
    },
    {
      type: "Feature",
      properties: { code: "2", name: "DEMO Bairro Leste", reference_date: "2019" },
      geometry: {
        type: "MultiPolygon",
        coordinates: [[square(-38.5, -3.9, -38.4, -3.7), square(-38.46, -3.82, -38.44, -3.8)]],
      },
    },
  ],
};

export const demoFacilities = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        id: "demo-1",
        name: "DEMO UAPS Oeste",
        type: "UAPS",
        management: "M",
        sus: true,
        neighborhood: "DEMO BAIRRO OESTE",
        reference_date: "2026",
        cnes: "0000001",
      },
      geometry: { type: "Point", coordinates: [-38.55, -3.8] },
    },
    {
      type: "Feature",
      properties: {
        id: "demo-2",
        name: "DEMO UAPS Leste",
        type: "UAPS",
        management: "M",
        sus: true,
        neighborhood: "DEMO OUTRO NOME",
        reference_date: "2026",
        cnes: "0000002",
      },
      geometry: { type: "Point", coordinates: [-38.42, -3.75] },
    },
    {
      type: "Feature",
      properties: {
        id: "demo-3",
        name: "DEMO UAPS no vazio",
        type: "UAPS",
        management: null,
        sus: null,
        neighborhood: null,
        reference_date: "2026",
        cnes: null,
      },
      geometry: { type: "Point", coordinates: [-38.45, -3.81] },
    },
  ],
};

const demoUnit = (id: string, type: string, name: string, coordinates: [number, number]) => ({
  type: "Feature",
  properties: {
    id,
    name,
    type,
    management: null,
    sus: null,
    neighborhood: "DEMO BAIRRO",
    source_id: id.split("-").pop(),
    reference_date: "2026",
    cnes: "0000000",
  },
  geometry: { type: "Point", coordinates },
});

export const demoUpas = {
  type: "FeatureCollection",
  features: [demoUnit("upa-1", "UPA", "DEMO UPA Oeste", [-38.57, -3.85])],
};

export const demoHospitals = {
  type: "FeatureCollection",
  features: [demoUnit("hospital-1", "HOSPITAL", "DEMO Hospital Central", [-38.47, -3.75])],
};

export function demoModel() {
  return buildMapModel(demoBoundary, demoNeighborhoods, demoFacilities, [
    demoUpas,
    demoHospitals,
  ]);
}
