import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it } from "vitest";
import { Observatory, STORY_SEEN_KEY } from "@/components/Observatory";
import { demoModel } from "./fixtures/demo-geo";

afterEach(() => window.history.replaceState(null, "", "/"));

it("começa a exploração por uma pergunta e abre a busca sem exigir leitura dos números gerais", async () => {
  const user = userEvent.setup();
  render(<Observatory model={demoModel()} />);
  expect(screen.getByRole("heading", { name: "Comece pelo seu bairro." })).toBeVisible();
  const figures = screen.getByText("Números da cidade").closest("details");
  expect(figures).not.toHaveAttribute("open");
  await user.click(screen.getByRole("button", { name: "Escolher um bairro" }));
  expect(screen.getByRole("combobox")).toHaveFocus();
});

it("escolhe um bairro na História e continua com a seleção na exploração", async () => {
  const user = userEvent.setup();
  window.localStorage.removeItem(STORY_SEEN_KEY);
  render(<Observatory model={demoModel()} />);
  await user.click(await screen.findByRole("button", { name: "Ir para o capítulo: Seu bairro" }));
  await user.selectOptions(await screen.findByLabelText("Escolha um bairro na história"), "1");
  screen.getByLabelText("Escolha um bairro na história").focus();
  await user.keyboard("{ArrowRight}");
  expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuetext", "Capítulo 4 de 6");
  expect(await within(screen.getByLabelText("Escolha um bairro na história").closest(".story-participation") as HTMLElement).findByRole("status")).toHaveTextContent("DEMO Bairro Oeste tem 1 posto");
  await user.click(screen.getByRole("button", { name: "Conhecer este bairro" }));
  expect(screen.getByRole("heading", { name: "DEMO Bairro Oeste" })).toBeVisible();
  expect(window.location.search).toBe("?neighborhood=1");
  expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
});

it("liga o bairro selecionado à comparação e descreve as diferenças sem eleger um vencedor", async () => {
  const user = userEvent.setup();
  window.history.replaceState(null, "", "/?neighborhood=1");
  render(<Observatory model={demoModel()} />);
  await user.click(await screen.findByRole("button", { name: "Comparar este bairro" }));
  expect(screen.getByLabelText("Bairro A")).toHaveValue("1");
  await user.selectOptions(screen.getByLabelText("Bairro B"), "2");
  const reading = screen.getByRole("region", { name: "O que a comparação mostra" });
  expect(reading).toHaveTextContent("mesmo número de postos");
  expect(reading).not.toHaveTextContent(/melhor bairro|pior bairro/i);
  await user.click(screen.getByText("Ver os números lado a lado"));
  expect(within(screen.getByRole("table")).getByRole("columnheader", { name: "A · DEMO Bairro Oeste" })).toBeVisible();
});

it("mantém as opções de mapa acessíveis sob demanda", async () => {
  const user = userEvent.setup();
  render(<Observatory model={demoModel()} />);
  const tools = screen.getByRole("button", { name: "O que mostrar e de onde vem" });
  expect(tools).toHaveAttribute("aria-expanded", "false");
  await user.click(tools);
  expect(tools).toHaveAttribute("aria-expanded", "true");
  expect(screen.getByRole("button", { name: /^Postos de saúde/ })).toBeVisible();
});
