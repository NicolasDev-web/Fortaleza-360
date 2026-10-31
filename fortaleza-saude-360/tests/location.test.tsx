import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { LocationControl } from "@/components/LocationControl";

const original = Object.getOwnPropertyDescriptor(navigator, "geolocation");
afterEach(() => {
  if (original) Object.defineProperty(navigator, "geolocation", original);
  else Reflect.deleteProperty(navigator, "geolocation");
  vi.restoreAllMocks();
});

it("solicita somente por clique e ignora resposta depois de remover", async () => {
  let success: PositionCallback = () => {};
  const getCurrentPosition = vi.fn((callback: PositionCallback) => { success = callback; });
  Object.defineProperty(navigator, "geolocation", { configurable: true, value: { getCurrentPosition } });
  const onLocate = vi.fn(() => true), onClear = vi.fn();
  const user = userEvent.setup();
  render(<LocationControl onLocate={onLocate} onClear={onClear} />);
  expect(getCurrentPosition).not.toHaveBeenCalled();
  await user.click(screen.getByText("Minha posição (opcional)"));
  await user.click(screen.getByRole("button", { name: "Solicitar minha posição" }));
  await user.click(screen.getByRole("button", { name: "Remover minha posição" }));
  act(() => success({ coords: { longitude: -38.5, latitude: -3.8, accuracy: 20 } } as GeolocationPosition));
  expect(onLocate).not.toHaveBeenCalled();
  expect(onClear).toHaveBeenCalledOnce();
});

it("informa recusa sem alterar posição ou persistir", async () => {
  const onLocate = vi.fn(() => true);
  Object.defineProperty(navigator, "geolocation", { configurable: true, value: { getCurrentPosition: (_: PositionCallback, error: PositionErrorCallback) => error({ code: 1 } as GeolocationPositionError) } });
  const user = userEvent.setup();
  render(<LocationControl onLocate={onLocate} onClear={vi.fn()} />);
  await user.click(screen.getByText("Minha posição (opcional)"));
  await user.click(screen.getByRole("button", { name: "Solicitar minha posição" }));
  expect(screen.getByRole("status")).toHaveTextContent("Permissão de localização negada");
  expect(onLocate).not.toHaveBeenCalled();
  expect(Object.keys(localStorage)).toEqual(["f360:story-seen"]);
});
