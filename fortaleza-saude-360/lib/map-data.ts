import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { buildMapModel, type MapModel } from "@/lib/map-model";

const DATA_DIR = join(process.cwd(), "public", "data");

async function readJson(file: string): Promise<unknown> {
  return JSON.parse(await readFile(join(DATA_DIR, file), "utf8"));
}

/** Lê os GeoJSON públicos no build; devolve `null` se algum estiver indisponível ou inválido. */
export async function loadMapModel(): Promise<MapModel | null> {
  try {
    const [boundary, neighborhoods, facilities, upas, hospitals] = await Promise.all([
      readJson("municipal-boundary.geojson"),
      readJson("neighborhoods.geojson"),
      readJson("facilities.geojson"),
      readJson("upas.geojson"),
      readJson("hospitals.geojson"),
    ]);

    return buildMapModel(boundary, neighborhoods, facilities, [upas, hospitals]);
  } catch (error) {
    console.error("[f360] Falha ao preparar camadas territoriais:", error);
    return null;
  }
}
