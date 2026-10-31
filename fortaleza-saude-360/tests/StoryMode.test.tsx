import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { Observatory, STORY_SEEN_KEY } from "@/components/Observatory";
import { demoModel } from "./fixtures/demo-geo";

describe("Modo História", () => {
  beforeEach(() => {
    window.localStorage.removeItem(STORY_SEEN_KEY);
  });

  it("abre na primeira visita com foco no botão de avançar", async () => {
    render(<Observatory model={demoModel()} />);

    const story = await screen.findByRole("region", { name: "Fortaleza, vista pelo caminho até o cuidado." });
    expect(story).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "História" })).toHaveAttribute("aria-selected", "true");
    await waitFor(() => expect(screen.getByRole("button", { name: /próximo/i })).toHaveFocus());
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuetext", "Capítulo 1 de 6");
  });

  it("não reabre sozinho depois de vista", () => {
    window.localStorage.setItem(STORY_SEEN_KEY, "1");
    render(<Observatory model={demoModel()} />);

    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Explorar" })).toHaveAttribute("aria-selected", "true");
  });

  it("avança e volta com as setas e mostra a ressalva no capítulo dos contornos", async () => {
    const user = userEvent.setup();
    render(<Observatory model={demoModel()} />);

    await screen.findByRole("progressbar");
    await user.keyboard("{ArrowRight}{ArrowRight}{ArrowRight}");

    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuetext", "Capítulo 4 de 6");
    expect(await screen.findByText("Capítulo 4 · Seu bairro")).toBeInTheDocument();
    expect(await screen.findByText(/não mede acesso/i)).toBeInTheDocument();

    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuetext", "Capítulo 3 de 6");
  });

  it("fecha com Esc, registra a visita e devolve o foco ao modo Explorar", async () => {
    const user = userEvent.setup();
    render(<Observatory model={demoModel()} />);

    await screen.findByRole("progressbar");
    await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("progressbar")).not.toBeInTheDocument());
    expect(window.localStorage.getItem(STORY_SEEN_KEY)).toBe("1");
    await waitFor(() => expect(screen.getByRole("tab", { name: "Explorar" })).toHaveFocus());
  });

  it("reabre pela aba História a partir do capítulo 1", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(STORY_SEEN_KEY, "1");
    render(<Observatory model={demoModel()} />);

    await user.click(screen.getByRole("tab", { name: "História" }));
    expect(await screen.findByRole("progressbar")).toHaveAttribute(
      "aria-valuetext",
      "Capítulo 1 de 6",
    );
  });
});
