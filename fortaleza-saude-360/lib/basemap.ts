import { layers, namedFlavor, type Flavor } from "@protomaps/basemaps";
import type { StyleSpecification } from "maplibre-gl";
import { unproject, type ProjectionParams } from "@/lib/geo";

/** Recorte OSM gerado por `scripts/build_basemap.py` e servido pelo próprio app. */
export const BASEMAP_TILES_PATH = "/basemap/fortaleza.pmtiles";
export const BASEMAP_GLYPHS_PATH = "/basemap/fonts/{fontstack}/{range}.pbf";
export const BASEMAP_MAX_ZOOM = 14;
const FONT = "Noto Sans Regular";
const TILE_SIZE = 512;

/**
 * Nomes de ruas e de água ajudam a se orientar; rótulos de lugares duplicariam
 * os bairros oficiais do SVG, e ícones exigiriam sprites de terceiros.
 */
const KEPT_SYMBOL_LAYERS = new Set([
  "roads_labels_minor",
  "roads_labels_major",
  "water_waterway_label",
  "water_label_ocean",
  "water_label_lakes",
  "earth_label_islands",
]);

const LAND = "#2b2421";
const SEA = "#24263a";
const ROAD_CASING = "#211b18";
const MINOR = "#3a312c";
const LINK = "#4a3f38";
const MAJOR = "#4f443d";
const HIGHWAY = "#5d5048";
const LABEL_HALO = "#1f1a17";

/** Paleta Terra da Luz: terra e mar do SVG, vias em mocha discreto sob os dados. */
const TERRA_DA_LUZ: Partial<Flavor> = {
  background: SEA,
  earth: LAND,
  water: SEA,
  park_a: "#2e2b24",
  park_b: "#2c2a23",
  wood_a: "#2c2a23",
  wood_b: "#2c2a23",
  scrub_a: "#2d2923",
  scrub_b: "#2d2923",
  hospital: "#2f2622",
  industrial: "#2a2522",
  school: "#2f2723",
  zoo: "#2d2923",
  military: "#2a2522",
  pedestrian: "#2f2824",
  sand: "#33302a",
  beach: "#3a3029",
  aerodrome: "#2d2724",
  runway: "#3d3530",
  pier: "#3d3530",
  buildings: "#251f1c",
  tunnel_other_casing: ROAD_CASING,
  tunnel_minor_casing: ROAD_CASING,
  tunnel_link_casing: ROAD_CASING,
  tunnel_major_casing: ROAD_CASING,
  tunnel_highway_casing: ROAD_CASING,
  tunnel_other: "#352d29",
  tunnel_minor: "#352d29",
  tunnel_link: "#352d29",
  tunnel_major: "#352d29",
  tunnel_highway: "#352d29",
  minor_service_casing: ROAD_CASING,
  minor_casing: ROAD_CASING,
  link_casing: ROAD_CASING,
  major_casing_late: ROAD_CASING,
  highway_casing_late: ROAD_CASING,
  major_casing_early: ROAD_CASING,
  highway_casing_early: ROAD_CASING,
  other: MINOR,
  minor_service: MINOR,
  minor_a: "#423833",
  minor_b: MINOR,
  link: LINK,
  major: MAJOR,
  highway: HIGHWAY,
  railway: LABEL_HALO,
  boundaries: "#6e6662",
  bridges_other_casing: ROAD_CASING,
  bridges_minor_casing: ROAD_CASING,
  bridges_link_casing: ROAD_CASING,
  bridges_major_casing: ROAD_CASING,
  bridges_highway_casing: ROAD_CASING,
  bridges_other: MINOR,
  bridges_minor: MINOR,
  bridges_link: LINK,
  bridges_major: MAJOR,
  bridges_highway: HIGHWAY,
  roads_label_minor: "#a29a93",
  roads_label_minor_halo: LABEL_HALO,
  roads_label_major: "#b3aba4",
  roads_label_major_halo: LABEL_HALO,
  ocean_label: "#9ca3db",
  regular: FONT,
  bold: FONT,
  italic: FONT,
  pois: undefined,
};

export function buildBasemapStyle(origin: string): StyleSpecification {
  const flavor: Flavor = { ...namedFlavor("dark"), ...TERRA_DA_LUZ };
  const baseLayers = layers("protomaps", flavor, { lang: "pt" }).filter(
    (layer) => layer.type !== "symbol" || KEPT_SYMBOL_LAYERS.has(layer.id),
  );

  return {
    version: 8,
    glyphs: `${origin}${BASEMAP_GLYPHS_PATH}`,
    sources: {
      protomaps: {
        type: "vector",
        url: `pmtiles://${origin}${BASEMAP_TILES_PATH}`,
        maxzoom: BASEMAP_MAX_ZOOM,
      },
    },
    layers: baseLayers,
  };
}

export type Camera = { center: [lon: number, lat: number]; zoom: number };

/**
 * Converte o enquadramento do SVG (viewBox + "meet") em câmera Web Mercator.
 * Na escala de Fortaleza (~0,25°), a projeção equirretangular local do SVG e a
 * Mercator diferem em frações de pixel, então as camadas ficam alinhadas.
 */
export function cameraFromView(
  projection: ProjectionParams,
  view: { x: number; y: number; w: number; h: number },
  size: { w: number; h: number },
): Camera {
  const unitsPerPx = Math.max(view.w / size.w, view.h / size.h);
  const pxPerDegreeLon = (projection.cosLat * projection.scale) / unitsPerPx;
  const center = unproject(projection, view.x + view.w / 2, view.y + view.h / 2);
  return { center, zoom: Math.log2((pxPerDegreeLon * 360) / TILE_SIZE) };
}

export function hasWebGL(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}
