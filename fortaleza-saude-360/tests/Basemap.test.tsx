import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Observatory } from "@/components/Observatory";
import { demoModel } from "./fixtures/demo-geo";

type Handler = (event?: unknown) => void;

const fake = vi.hoisted(() => {
  class FakeMap {
    static instances: FakeMap[] = [];
    handlers: Record<string, Handler[]> = {};
    jumpTo = vi.fn();
    remove = vi.fn();
    constructor(public options: Record<string, unknown>) {
      FakeMap.instances.push(this);
    }
    on(event: string, handler: Handler) {
      (this.handlers[event] ??= []).push(handler);
      return this;
    }
    emit(event: string, payload?: unknown) {
      this.handlers[event]?.forEach((handler) => handler(payload));
    }
  }
  return { FakeMap, addProtocol: vi.fn(), setWorkerUrl: vi.fn() };
});

vi.mock("maplibre-gl", () => ({
  Map: fake.FakeMap,
  addProtocol: fake.addProtocol,
  setWorkerUrl: fake.setWorkerUrl,
}));
vi.mock("pmtiles", () => ({ Protocol: class { tile = vi.fn(); } }));

function enableWebGL() {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
    {} as RenderingContext,
  );
}

async function mountedMap() {
  await waitFor(() => expect(fake.FakeMap.instances).toHaveLength(1));
  return fake.FakeMap.instances[0];
}

afterEach(() => {
  vi.restoreAllMocks();
  fake.FakeMap.instances = [];
  window.history.replaceState(null, "", "/");
});

describe("Basemap", () => {
  it("sem WebGL mantém o mapa SVG e avisa que as ruas estão indisponíveis", async () => {
    render(<Observatory model={demoModel()} />);

    expect(await screen.findByText(/não deu para carregar as ruas/i)).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /mapa de fortaleza com/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /openstreetmap/i })).not.toBeInTheDocument();
    expect(fake.FakeMap.instances).toHaveLength(0);
  });

  it("carrega tiles do próprio site, credita o OSM e segue o zoom do SVG", async () => {
    enableWebGL();
    const user = userEvent.setup();
    const { container } = render(<Observatory model={demoModel()} />);
    const map = await mountedMap();

    const style = map.options.style as { sources: { protomaps: { url: string } } };
    expect(style.sources.protomaps.url).toBe(
      `pmtiles://${window.location.origin}/basemap/fortaleza.pmtiles`,
    );
    expect(map.options.interactive).toBe(false);

    act(() => map.emit("load"));
    expect(
      await screen.findByRole("link", { name: /colaboradores do openstreetmap/i }),
    ).toHaveAttribute("href", "https://www.openstreetmap.org/copyright");
    expect(container.querySelector(".city-map")).toHaveClass("has-basemap");

    const before = map.jumpTo.mock.lastCall?.[0] as { zoom: number };
    await user.click(screen.getByRole("button", { name: "Aproximar" }));
    const after = map.jumpTo.mock.lastCall?.[0] as { zoom: number };
    expect(after.zoom).toBeCloseTo(before.zoom + Math.log2(1.5), 5);
  });

  it("volta ao SVG quando os tiles falham", async () => {
    enableWebGL();
    const { container } = render(<Observatory model={demoModel()} />);
    const map = await mountedMap();

    act(() => map.emit("error", { sourceId: "protomaps", error: new Error("DEMO 404") }));

    expect(await screen.findByText(/não deu para carregar as ruas/i)).toBeInTheDocument();
    expect(container.querySelector(".city-map")).not.toHaveClass("has-basemap");
    expect(map.remove).toHaveBeenCalled();
  });
});
