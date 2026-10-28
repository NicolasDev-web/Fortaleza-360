import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { buildMapModel, type MapModel } from "@/lib/map-model";
import { parsePopulation } from "@/lib/population";

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

    const model = buildMapModel(boundary, neighborhoods, facilities, [upas, hospitals]);
    // A população é complementar: se faltar ou falhar na validação, o mapa segue sem ela.
    try {
      model.population = parsePopulation(
        await readJson("neighborhood-population.json"),
        model.neighborhoods.map(({ code }) => code),
      );
    } catch (error) {
      console.error("[f360] População por bairro indisponível:", error);
    }
    return model;
  } catch (error) {
    console.error("[f360] Falha ao preparar camadas territoriais:", error);
    return null;
  }
}
