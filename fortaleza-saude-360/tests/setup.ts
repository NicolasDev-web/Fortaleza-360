import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

// NumberFlow usa um custom element com APIs de animação ausentes no JSDOM.
// O valor acessível continua no span oculto renderizado por RollingNumber.
vi.mock("@number-flow/react", () => ({ default: () => null }));

// JSDOM não implementa canvas: sem WebGL, o Basemap cede e o mapa fica só no SVG.
HTMLCanvasElement.prototype.getContext = (() =>
  null) as unknown as typeof HTMLCanvasElement.prototype.getContext;

beforeEach(() => {
  // Por padrão, a história já foi vista; os testes do Modo História limpam a marca.
  window.localStorage.setItem("f360:story-seen", "1");
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});
