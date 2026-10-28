import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Observatory } from "@/components/Observatory";
import {
  formatStraightLineDistance,
  haversineMeters,
  nearestByStraightLine,
  STRAIGHT_LINE_CAVEAT,
} from "@/lib/accessibility";
import { demoModel } from "./fixtures/demo-geo";

afterEach(() => {
  window.history.replaceState(null, "", "/");
});

describe("distância em linha reta (proxy)", () => {
  it("calcula a distância geodésica (haversine) em metros", () => {
    // 0,01° de latitude ≈ 1.111,95 m no raio médio da Terra (6.371,0088 km).
    expect(haversineMeters([-38.5267, -3.7319], [-38.5267, -3.7419])).toBeCloseTo(1111.95, 0);
    expect(haversineMeters([-38.5, -3.8], [-38.5, -3.8])).toBe(0);
  });

  it("acha a unidade mais próxima e rotula o método como proxy", () => {
    const model = demoModel();
    const result = nearestByStraightLine([-38.56, -3.8], model.facilities);

    expect(result).toMatchObject({ method: "straight_line_proxy", facilityId: "demo-1" });
    expect(result!.distanceM).toBeGreaterThan(0);
    expect(nearestByStraightLine([-38.5, -3.8], [])).toBeNull();
  });

  it("nunca apresenta a distância como tempo de deslocamento", () => {
    for (const meters of [0, 420, 999, 1000, 1234, 15400]) {
      const label = formatStraightLineDistance(meters);
      expect(label).toMatch(/em linha reta$/);
      expect(label).not.toMatch(/min|hora|tempo|caminhada|percurso/i);
    }
    expect(formatStraightLineDistance(420)).toBe("420 m em linha reta");
    expect(formatStraightLineDistance(1234)).toBe("1,2 km em linha reta");
    expect(STRAIGHT_LINE_CAVEAT).toMatch(/não é o caminho pelas ruas nem o tempo de deslocamento/i);
  });

  it("aparece na ficha do bairro com rótulo e ressalva explícitos", async () => {
    window.history.replaceState(null, "", "/?neighborhood=2");
    render(<Observatory model={demoModel()} />);
    await screen.findByRole("heading", { level: 2, name: "DEMO Bairro Leste" });

    const block = screen.getByRole("group", { name: /posto mais perto em linha reta/i });
    expect(block).toHaveTextContent(/km em linha reta|m em linha reta/);
    expect(block).toHaveTextContent(/aproximação/i);
    expect(block).toHaveTextContent(/não é o caminho pelas ruas nem o tempo de deslocamento/i);
  });
});
