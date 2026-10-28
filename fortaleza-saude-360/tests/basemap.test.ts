import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  BASEMAP_TILES_PATH,
  buildBasemapStyle,
  cameraFromView,
} from "@/lib/basemap";
import { createProjection, project, type Position } from "@/lib/geo";

const ORIGIN = "https://f360.example.invalid";
const PUBLIC_DIR = join(process.cwd(), "public");

function collectUrls(value: unknown, found: string[] = []): string[] {
  if (typeof value === "string" && /^[a-z]+:\/\//i.test(value)) found.push(value);
  else if (Array.isArray(value)) value.forEach((item) => collectUrls(item, found));
  else if (value && typeof value === "object") {
    Object.values(value).forEach((item) => collectUrls(item, found));
  }
  return found;
}

describe("estilo do basemap", () => {
  const style = buildBasemapStyle(ORIGIN);

  it("não aponta para nenhum servidor de terceiros", () => {
    const urls = collectUrls(style);
    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls) {
      expect(url.replace(/^pmtiles:\/\//, "")).toMatch(new RegExp(`^${ORIGIN}/`));
    }
    expect(style.sprite).toBeUndefined();
  });

  it("usa só a fonte hospedada no projeto e nenhum ícone", () => {
    const symbols = style.layers.filter((layer) => layer.type === "symbol");
    expect(symbols.length).toBeGreaterThan(0);
    for (const layer of symbols) {
      expect(JSON.stringify(layer.layout?.["text-font"])).toContain("Noto Sans Regular");
      expect(JSON.stringify(layer.layout?.["text-font"])).not.toMatch(/Italic|Medium/);
      expect(layer.layout?.["icon-image"]).toBeUndefined();
    }
    expect(style.layers.some((layer) => layer.id.startsWith("places_"))).toBe(false);
    for (const range of ["0-255", "256-511", "8192-8447"]) {
      expect(existsSync(join(PUBLIC_DIR, "basemap/fonts/Noto Sans Regular", `${range}.pbf`))).toBe(
        true,
      );
    }
  });

  it("publica um recorte PMTiles v3 enxuto", () => {
    const file = join(PUBLIC_DIR, BASEMAP_TILES_PATH);
    const header = readFileSync(file).subarray(0, 8);
    expect(header.subarray(0, 7).toString("ascii")).toBe("PMTiles");
    expect(header[7]).toBe(3);
    expect(statSync(file).size).toBeLessThan(10 * 1024 * 1024);
  });
});

describe("câmera sincronizada ao SVG", () => {
  const bounds = { minLon: -38.64, minLat: -3.89, maxLon: -38.4, maxLat: -3.69 };
  const projection = createProjection(bounds);

  function mercator([lon, lat]: Position, zoom: number): [number, number] {
    const world = 512 * 2 ** zoom;
    const rad = (lat * Math.PI) / 180;
    return [
      ((lon + 180) / 360) * world,
      ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * world,
    ];
  }

  it.each([
    { label: "cidade inteira", view: { x: 0, y: 0, w: projection.width, h: projection.height } },
    { label: "zoom 8×", view: { x: 400, y: 300, w: projection.width / 8, h: projection.height / 8 } },
  ])("alinha os pontos do SVG e do Mercator ($label)", ({ view }) => {
    const size = { w: 1280, h: 760 };
    const camera = cameraFromView(projection, view, size);
    const unitsPerPx = Math.max(view.w / size.w, view.h / size.h);
    const center = mercator(camera.center, camera.zoom);

    const corners: Position[] = [
      [bounds.minLon, bounds.maxLat],
      [bounds.maxLon, bounds.minLat],
      [-38.5267, -3.7319],
    ];
    for (const point of corners) {
      const [sx, sy] = project(projection, point);
      const svgOffset = [
        (sx - (view.x + view.w / 2)) / unitsPerPx,
        (sy - (view.y + view.h / 2)) / unitsPerPx,
      ];
      const [mx, my] = mercator(point, camera.zoom);
      expect(Math.abs(mx - center[0] - svgOffset[0])).toBeLessThan(1);
      expect(Math.abs(my - center[1] - svgOffset[1])).toBeLessThan(1);
    }
  });
});
