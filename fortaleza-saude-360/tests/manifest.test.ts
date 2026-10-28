import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { LAYER_SOURCES, SOURCE_LICENSE, type LayerSourceId } from "@/lib/sources";

const DATA_DIR = join(process.cwd(), "public", "data");

type ManifestLayer = {
  id: string;
  file: string;
  sha256: string;
  properties: string[];
  dictionary: Record<string, string>;
  limitations: string[];
  source: { id: number; page_url: string; license: string; collected_at: string };
};

const manifest = JSON.parse(readFileSync(join(DATA_DIR, "manifest.json"), "utf8")) as {
  mode: string;
  layers?: ManifestLayer[];
  basemap?: { file: string; sha256: string; source: { license: string; terms_url: string } };
};

const MANIFEST_LAYER: Record<LayerSourceId, string> = {
  facilities: "facilities",
  upas: "upas",
  hospitals: "hospitals",
  neighborhoods: "neighborhoods",
  boundary: "municipal-boundary",
};

describe("manifesto público", () => {
  it("declara dados oficiais carregados", () => {
    expect(manifest.mode).toBe("official");
  });

  it.each(Object.values(LAYER_SOURCES))("camada $id encontra sua entrada de fonte", (source) => {
    const layer = manifest.layers?.find((entry) => entry.id === MANIFEST_LAYER[source.id]);

    expect(layer).toBeDefined();
    expect(layer!.source.id).toBe(source.catalogId);
    expect(layer!.source.page_url).toBe(source.pageUrl);
    expect(layer!.source.license).toBe(SOURCE_LICENSE);
    expect(layer!.source.collected_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(layer!.limitations.length).toBeGreaterThan(0);
    expect(Object.keys(layer!.dictionary).sort()).toEqual([...layer!.properties].sort());

    const bytes = readFileSync(join(process.cwd(), "public", layer!.file));
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(layer!.sha256);
  });

  it("registra a fonte, a licença e o checksum do basemap", () => {
    expect(manifest.basemap).toBeDefined();
    expect(manifest.basemap!.source.license).toMatch(/ODbL/);
    expect(manifest.basemap!.source.terms_url).toBe("https://www.openstreetmap.org/copyright");
    const bytes = readFileSync(join(process.cwd(), "public", manifest.basemap!.file));
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(manifest.basemap!.sha256);
  });
});
