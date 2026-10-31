import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Observatory } from "@/components/Observatory";
import { buildNeighborhoodCsv, CSV_COLUMNS, csvFileName } from "@/lib/export";
import { parsePopulation } from "@/lib/population";
import { demoModel } from "./fixtures/demo-geo";

/** População sintética `DEMO`, só para teste: não representa bairro real. */
const demoPopulation = {
  reference_year: 2022,
  total_population: 20500,
  neighborhoods: [
    { code: "1", population: 12000, population_low: 11800, population_high: 12000, sectors: 9 },
    { code: "2", population: 8500, population_low: 8500, population_high: 8500, sectors: 6 },
  ],
};

function modelWithPopulation() {
  const model = demoModel();
  model.population = parsePopulation(demoPopulation, ["1", "2"]);
  return model;
}

/** Leitor mínimo de CSV (RFC 4180) só para conferir a saída. */
function parseCsv(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < csv.length; i += 1) {
    const char = csv[i];
    if (quoted) {
      if (char === '"' && csv[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\r" && csv[i + 1] === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      i += 1;
    } else cell += char;
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function toObjects(csv: string): Record<string, string>[] {
  const [header, ...rows] = parseCsv(csv.replace(/^﻿/, ""));
  return rows.map((row) => Object.fromEntries(header.map((name, index) => [name, row[index]])));
}

function readBlob(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

afterEach(() => {
  window.history.replaceState(null, "", "/");
  vi.restoreAllMocks();
});

describe("exportar CSV (SDD-034)", () => {
  it("gera UTF-8 com BOM, cabeçalho fixo e uma linha por bairro recebido", () => {
    const model = modelWithPopulation();
    const csv = buildNeighborhoodCsv(model, model.neighborhoods);

    expect(csv.startsWith("﻿")).toBe(true);
    const [header] = parseCsv(csv.slice(1));
    expect(header).toEqual([...CSV_COLUMNS]);
    expect(toObjects(csv)).toHaveLength(model.neighborhoods.length);
    expect(csv).toContain("DEMO Bairro Oeste");
  });

  it("exporta só os bairros passados, na mesma ordem (mesma filtragem da tela)", () => {
    const model = modelWithPopulation();
    const only = model.neighborhoods.filter(({ code }) => code === "2");
    const rows = toObjects(buildNeighborhoodCsv(model, only));

    expect(rows.map((row) => row.codigo_bairro)).toEqual(["2"]);
    expect(buildNeighborhoodCsv(model, [])).not.toContain("DEMO Bairro");
  });

  it("traz valores do modelo, método e fonte em toda linha", () => {
    const model = modelWithPopulation();
    const rows = toObjects(buildNeighborhoodCsv(model, model.neighborhoods));
    const first = rows.find((row) => row.codigo_bairro === "1")!;
    const shape = model.neighborhoods.find(({ code }) => code === "1")!;

    expect(first.postos_uaps_no_bairro).toBe(String(shape.facilityIds.length));
    expect(first.populacao_censo).toBe("12000");
    expect(first.populacao_minima).toBe("11800");
    expect(first.populacao_maxima).toBe("12000");
    expect(first.distancia_uaps_mais_proxima_m).toMatch(/^\d+$/);
    for (const row of rows) {
      expect(row.metodo_distancia).toBe("straight_line_proxy");
      expect(row.fonte_postos).toMatch(/Fortaleza em Mapas/);
      expect(row.fonte_bairros).not.toBe("");
      expect(row.fonte_populacao).toMatch(/IBGE/);
      expect(row.licenca_populacao).toMatch(/não confirmada/i);
      expect(row.data_coleta).toBe("2026-10-27");
      expect(row.observacao).toMatch(/não é a população atendida/i);
    }
  });

  it("deixa vazio, nunca zero ou inventado, o que não existe", () => {
    const model = modelWithPopulation();
    model.neighborhoods.find(({ code }) => code === "2")!.facilityIds = [];
    const without = toObjects(buildNeighborhoodCsv(model, model.neighborhoods)).find(
      (row) => row.codigo_bairro === "2",
    )!;

    expect(without.postos_uaps_no_bairro).toBe("0");
    expect(without.pessoas_por_posto).toBe("");
    expect(without.pessoas_por_posto_minimo).toBe("");
    expect(without.pessoas_por_posto_maximo).toBe("");
    expect(without.populacao_censo).toBe("8500");

    const noPopulation = demoModel();
    const rows = toObjects(buildNeighborhoodCsv(noPopulation, noPopulation.neighborhoods));
    for (const row of rows) {
      expect(row.populacao_censo).toBe("");
      expect(row.pessoas_por_posto).toBe("");
      expect(row.fonte_populacao).toBe("");
    }
  });

  it("protege contra fórmula de planilha e escapa vírgula, aspas e quebra de linha", () => {
    const model = modelWithPopulation();
    model.neighborhoods[0].name = '=HYPERLINK("x"),\nDEMO';
    const csv = buildNeighborhoodCsv(model, model.neighborhoods);
    const rows = toObjects(csv);

    expect(rows[0].bairro).toBe('\'=HYPERLINK("x"),\nDEMO');
    expect(rows).toHaveLength(model.neighborhoods.length);
  });

  it("nomeia o arquivo sem acento nem espaço", () => {
    expect(csvFileName()).toBe("f360-bairros-fortaleza.csv");
  });

  it("baixa na Lista de bairros o que está filtrado e avisa o leitor de tela", async () => {
    const user = userEvent.setup();
    const blobs: Blob[] = [];
    vi.spyOn(URL, "createObjectURL").mockImplementation((blob) => {
      blobs.push(blob as Blob);
      return "blob:demo";
    });
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

    render(<Observatory model={modelWithPopulation()} />);
    await user.click(await screen.findByRole("tab", { name: /Lista de bairros/ }));
    await user.type(screen.getByRole("searchbox"), "oeste");

    const button = await screen.findByRole("button", { name: /Baixar esta lista \(CSV\)/ });
    expect(button).toHaveTextContent(/1 bairro/);
    fireEvent.click(button);

    expect(click).toHaveBeenCalledTimes(1);
    expect(blobs[0].type).toBe("text/csv;charset=utf-8");
    const text = await readBlob(blobs[0]);
    expect(toObjects(text).map((row) => row.bairro)).toEqual(["DEMO Bairro Oeste"]);
    expect(screen.getByText(/Arquivo f360-bairros-fortaleza\.csv baixado/)).toBeInTheDocument();
  });

  it("não oferece o botão quando nenhum bairro passa no filtro", async () => {
    const user = userEvent.setup();
    render(<Observatory model={modelWithPopulation()} />);
    await user.click(await screen.findByRole("tab", { name: /Lista de bairros/ }));
    await user.type(screen.getByRole("searchbox"), "zzzz");

    expect(screen.queryByRole("button", { name: /Baixar esta lista/ })).not.toBeInTheDocument();
  });
});
