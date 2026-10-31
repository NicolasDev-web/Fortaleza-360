import { computeScenario, validateScenarioData, type ScenarioData } from "./scenario";
import type { Position } from "./geo";

let data: ScenarioData | null = null;
self.onmessage = async (event: MessageEvent<{ kind: string; id: number; point: Position }>) => {
  const { kind, id, point } = event.data;
  try {
    if (kind === "init") {
      const registry = await fetch("/data/manifest.json", { credentials: "omit" });
      if (!registry.ok) throw new Error("Não foi possível carregar as fontes do simulador.");
      const entry = (await registry.json()).scenario;
      if (!entry || entry.file !== "/data/scenario-model.json") throw new Error("Simulador sem fonte verificada.");
      const response = await fetch(entry.file, { credentials: "omit" });
      if (!response.ok) throw new Error("Não foi possível carregar a malha do simulador.");
      const bytes = await response.arrayBuffer();
      const digest = await crypto.subtle.digest("SHA-256", bytes);
      const checksum = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
      if (checksum !== entry.sha256) throw new Error("Os dados do simulador estão desatualizados ou incompletos.");
      data = JSON.parse(new TextDecoder().decode(bytes)) as ScenarioData;
      validateScenarioData(data);
      self.postMessage({ kind: "ready", modelSha: checksum });
    } else if (kind === "calculate") {
      if (!data) throw new Error("A malha ainda está carregando.");
      self.postMessage({ kind: "result", id, result: computeScenario(data, point) });
    }
  } catch (error) {
    self.postMessage({ kind: "error", id, message: error instanceof Error ? error.message : "Falha no simulador." });
  }
};
