import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Observatory } from "@/components/Observatory";
import { parsePopulation, peoplePerFacility } from "@/lib/population";
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

afterEach(() => {
  window.history.replaceState(null, "", "/");
});

describe("população por bairro", () => {
  it("valida o arquivo: todo bairro presente e faixa coerente", () => {
    expect(() => parsePopulation(demoPopulation, ["1", "2", "3"])).toThrow(/3/);
    const broken = structuredClone(demoPopulation);
    broken.neighborhoods[0].population_low = 13000;
    expect(() => parsePopulation(broken, ["1", "2"])).toThrow(/faixa/);
  });

  it("nunca divide por zero: sem posto, não há pessoas por posto", () => {
    expect(peoplePerFacility({ population: 9000, low: 8800, high: 9000 }, 0)).toBeNull();
    expect(peoplePerFacility({ population: 9000, low: 8800, high: 9000 }, 2)).toEqual({
      central: 4500,
      low: 4400,
      high: 4500,
    });
  });

  it("mostra moradores, pessoas por posto, fonte e ressalva na ficha do bairro", async () => {
    window.history.replaceState(null, "", "/?neighborhood=1");
    render(<Observatory model={modelWithPopulation()} />);
    await screen.findByRole("heading", { level: 2, name: "DEMO Bairro Oeste" });

    const block = screen.getByRole("group", { name: "Quem mora aqui" });
    expect(block).toHaveTextContent("12.000 pessoas");
    expect(block).toHaveTextContent(/entre 11\.800 e 12\.000/);
    expect(block).toHaveTextContent(/Cerca de 12\.000 pessoas para cada posto/);
    expect(block).toHaveTextContent(/Censo 2022/);
    expect(block).toHaveTextContent(/não é quantas pessoas cada posto atende/i);
  });

  it("explica, sem número inventado, quando o bairro não tem posto", async () => {
    const model = modelWithPopulation();
    model.neighborhoods.find(({ code }) => code === "2")!.facilityIds = [];
    window.history.replaceState(null, "", "/?neighborhood=2");
    render(<Observatory model={model} />);
    await screen.findByRole("heading", { level: 2, name: "DEMO Bairro Leste" });

    const block = screen.getByRole("group", { name: "Quem mora aqui" });
    expect(block).toHaveTextContent("8.500 pessoas");
    expect(block).toHaveTextContent(/não dá para fazer essa conta/);
    expect(block).not.toHaveTextContent(/Infinity|NaN|para cada posto/);
  });

  it("mostra o total de moradores no resumo com a fonte", async () => {
    render(<Observatory model={modelWithPopulation()} />);

    const kpi = await screen.findByText("Moradores (Censo 2022)");
    expect(kpi.closest("article, div")?.parentElement).toHaveTextContent(/IBGE/);
  });

  it("sem arquivo de população, a ficha não inventa nada", async () => {
    window.history.replaceState(null, "", "/?neighborhood=1");
    render(<Observatory model={demoModel()} />);
    await screen.findByRole("heading", { level: 2, name: "DEMO Bairro Oeste" });

    expect(screen.queryByRole("group", { name: "Quem mora aqui" })).not.toBeInTheDocument();
  });
});
