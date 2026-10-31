import { test, expect, type Page } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";

const firstUnit = JSON.parse(readFileSync("public/data/facilities.geojson", "utf8")).features[0].properties;
const distanceNeighborhood = JSON.parse(readFileSync("public/data/neighborhoods.geojson", "utf8")).features.find((item: { properties: { name: string } }) => item.properties.name === "Meireles").properties;

async function openDisclosure(page: Page, selector: string) {
  const details = page.locator(selector);
  await expect(details).toBeVisible();
  if (await details.getAttribute("open") === null) await details.locator("summary").first().click();
}

async function openCoordinates(page: Page) {
  await openDisclosure(page, ".scenario-coordinates");
}

test("linha de distância é aproximação e responde ao interruptor", async ({ page }, testInfo) => {
  await page.goto(`/?neighborhood=${distanceNeighborhood.code}`);
  const disclosure = page.getByRole("button", { name: "O que mostrar e de onde vem" });
  if (await disclosure.isVisible()) await disclosure.click();
  const toggle = page.getByRole("button", { name: /^Distância até o posto/ });
  await toggle.focus();
  await toggle.press("Enter");
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("[data-distance-proxy]")).toHaveCount(1);
  const caption = page.locator(".map-distance-caption");
  await expect(caption).toContainText("Meireles");
  await expect(caption).toContainText("em linha reta");
  await expect(caption).toContainText("não é percurso nem tempo");
  await caption.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `test-results/distance-${testInfo.project.name}.png`, fullPage: true });
  await toggle.click();
  await expect(page.locator("[data-distance-proxy]")).toHaveCount(0);
  await expect(caption).toHaveCount(0);
});

test("compara bairros, inverte a dupla e exporta apenas A e B", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.getByRole("tab", { name: "Comparar", exact: true }).click();
  const a = page.getByLabel("Bairro A", { exact: true });
  const b = page.getByLabel("Bairro B", { exact: true });
  await expect(page.getByRole("table")).toHaveCount(0);
  await a.selectOption({ label: "Meireles" });
  await b.selectOption({ label: "Jangurussu" });
  await expect(page.getByRole("region", { name: "O que a comparação mostra" })).toBeVisible();
  await openDisclosure(page, ".comparison-figures");
  await expect(page.locator("[data-comparison]")).toHaveCount(2);
  const table = page.getByRole("table");
  await expect(table).toContainText("em linha reta");
  await expect(table).toContainText("Faixa:");
  await page.getByRole("button", { name: "Inverter A e B" }).click();
  await expect(table.getByRole("columnheader", { name: "A · Jangurussu" })).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Baixar comparação (CSV)" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("f360-comparacao-bairros.csv");
  const csv = readFileSync((await download.path())!, "utf8");
  const lines = csv.split("\r\n").filter(Boolean);
  expect(lines).toHaveLength(3);
  expect(lines[1]).toContain("Jangurussu");
  expect(lines[2]).toContain("Meireles");
  await table.scrollIntoViewIfNeeded();
  expect(await table.evaluate(element => element.clientHeight)).toBeGreaterThan(100);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `test-results/comparison-${testInfo.project.name}.png`, fullPage: true });
  await a.focus();
  await page.keyboard.press("Tab");
  await expect(b).toBeFocused();
});

test.beforeEach(async ({ page, context, baseURL }) => {
  const token = process.env.VERCEL_OIDC_TOKEN;
  if (process.env.F360_E2E_BASE_URL && token && baseURL) {
    const origin = new URL(baseURL).origin;
    await context.route(url => url.origin === origin, route => route.continue({
      headers: { ...route.request().headers(), "x-vercel-trusted-oidc-idp-token": token },
    }));
  }
  await page.addInitScript(() => localStorage.setItem("f360:story-seen", "1"));
});

test("corredores leves são opt-in, mudam de tempo e tratam falha de download", async ({ page }, testInfo) => {
  const urls: string[] = [];
  page.on("request", request => urls.push(request.url()));
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  expect(urls.some(url => /corridor-central-/.test(url))).toBe(false);
  expect(urls.some(url => /isochrones\.geojson/.test(url))).toBe(false);
  const disclosure = page.getByRole("button", { name: "O que mostrar e de onde vem" });
  if (await disclosure.isVisible()) await disclosure.click();
  const toggle = page.getByRole("button", { name: /^Corredores a pé/ });
  await toggle.click();
  await expect(page.locator("[data-corridor-minutes='10']")).toHaveCount(1);
  await page.getByLabel("Tempo dos corredores", { exact: true }).selectOption("20");
  await expect(page.locator("[data-corridor-minutes='20']")).toHaveCount(1);
  await expect(page.locator("[data-corridor-minutes='10']")).toHaveCount(0);
  await page.route("**/data/corridor-central-30.png", route => route.fulfill({ status: 503, body: "DEMO falha" }));
  await page.getByLabel("Tempo dos corredores", { exact: true }).selectOption("30");
  await expect(page.locator(".corridor-message[role='alert']")).toContainText("Falha ao carregar");
  await page.unroute("**/data/corridor-central-30.png");
  await toggle.click();
  await toggle.click();
  await expect(page.locator("[data-corridor-minutes='30']")).toHaveCount(1);
  await page.getByRole("region", { name: "Mapa interativo de Fortaleza", exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: `test-results/corridors-${testInfo.project.name}.png`, fullPage: true });
});

test("localização opcional é separada da proposta e removida sem persistência", async ({ page, context }) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: -3.8, longitude: -38.5, accuracy: 30 });
  const outgoing: string[] = [];
  page.on("request", request => outgoing.push(request.url()));
  await page.goto("/");
  await expect(page.locator(".device-position")).toHaveCount(0);
  const disclosure = page.getByRole("button", { name: "O que mostrar e de onde vem" });
  if (await disclosure.isVisible()) await disclosure.click();
  await page.getByText("Minha posição (opcional)", { exact: true }).click();
  await page.getByRole("button", { name: "Solicitar minha posição", exact: true }).click();
  await expect(page.locator(".device-position")).toHaveCount(1);
  await expect(page.getByText(/Precisão informada pelo dispositivo: 30 m/)).toBeVisible();
  await expect(page.locator(".scenario-candidate")).toHaveCount(0);
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual(["f360:story-seen"]);
  expect(page.url()).not.toMatch(/-3\.8|-38\.5/);
  expect(outgoing.some(url => /-3\.8|-38\.5/.test(url))).toBe(false);
  await page.getByRole("button", { name: "Remover minha posição", exact: true }).click();
  await expect(page.locator(".device-position")).toHaveCount(0);
  await page.evaluate(() => Object.defineProperty(navigator, "geolocation", { configurable: true, value: { getCurrentPosition: (_success: unknown, fail: (error: { code: number }) => void) => fail({ code: 1 }) } }));
  await page.getByRole("button", { name: "Solicitar minha posição", exact: true }).click();
  await expect(page.getByText(/Permissão de localização negada/)).toBeVisible();
  await expect(page.getByRole("button", { name: /Buscar bairro ou posto/ })).toBeEnabled();
});

test("setores são carregados sob demanda, filtrados e paginados sem ranking assistencial", async ({ page }) => {
  const urls: string[] = [];
  page.on("request", request => urls.push(request.url()));
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  expect(urls.some(url => url.includes("sector-ranking.json"))).toBe(false);
  await page.getByRole("tab", { name: "Distância por setor", exact: true }).click();
  await expect(page.getByText("4.408 setores neste filtro. Página 1 de 177.")).toBeVisible();
  const list = page.locator(".sector-list");
  await expect(list.locator("li")).toHaveCount(25);
  await expect(list.locator("li").first()).toContainText("230440005190267");
  await expect(page.getByText(/Esta ordem não é prioridade/)).toBeVisible();
  await page.getByRole("button", { name: "Próxima página", exact: true }).click();
  await expect(page.getByText(/Página 2 de 177/)).toBeVisible();
  await page.getByLabel("Filtrar setores por bairro", { exact: true }).selectOption({ label: "Meireles" });
  await expect(list.locator("li").first()).toContainText("Meireles");
  await expect(page.getByText(/Página 1 de/)).toBeVisible();
});

test("falha na lista de setores mostra erro e permite repetir", async ({ page }) => {
  await page.route("**/data/sector-ranking.json", route => route.fulfill({ status: 503, body: "DEMO falha" }));
  await page.goto("/");
  await page.getByRole("tab", { name: "Distância por setor", exact: true }).click();
  await expect(page.locator(".sector-ranking").getByRole("alert")).toContainText("Não foi possível carregar");
  await expect(page.locator(".sector-list")).toHaveCount(0);
  await page.unroute("**/data/sector-ranking.json");
  await page.getByRole("button", { name: "Tentar carregar setores novamente" }).click();
  await expect(page.locator(".sector-list li")).toHaveCount(25);
});

test("salva cenário explicitamente, recarrega, recalcula e exclui dados locais", async ({ page }) => {
  const outgoing: string[] = [];
  page.on("request", request => outgoing.push(request.url()));
  await page.goto("/");
  await page.getByRole("tab", { name: "Simular", exact: true }).click();
  const calculate = page.getByRole("button", { name: "Calcular este ponto" });
  await openCoordinates(page);
  await expect(calculate).toBeEnabled();
  await page.getByRole("spinbutton", { name: "Latitude", exact: true }).fill("-3.8");
  await page.getByRole("spinbutton", { name: "Longitude", exact: true }).fill("-38.5");
  await calculate.click();
  await openDisclosure(page, ".scenario-figures");
  await expect(page.getByRole("table")).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("f360:saved-scenarios:v1"))).toBeNull();
  await openDisclosure(page, ".scenario-saved");
  await page.getByLabel("Nome do cenário").fill("DEMO proposta local");
  await page.getByRole("button", { name: "Salvar neste navegador", exact: true }).click();
  await expect(page.getByText("Cenário “DEMO proposta local” salvo neste navegador.")).toBeVisible();
  await page.reload();
  await page.getByRole("tab", { name: "Simular", exact: true }).click();
  await openDisclosure(page, ".scenario-saved");
  await page.getByRole("button", { name: "Reabrir DEMO proposta local", exact: true }).click();
  await openDisclosure(page, ".scenario-figures");
  await expect(page.getByRole("table")).toBeVisible();
  await expect(page.getByText("Cenário calculado.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Excluir todos os cenários salvos" }).click();
  expect(await page.evaluate(() => localStorage.getItem("f360:saved-scenarios:v1"))).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem("f360:story-seen"))).toBe("1");
  expect(page.url()).not.toMatch(/-3\.8|-38\.5/);
  expect(outgoing.some(url => /-3\.8|-38\.5/.test(url))).toBe(false);
});

test("mapa, busca por teclado e filtros de camada", async ({ page }) => {
  await page.goto("/");
  await expect.poll(() => page.locator(".animated-word").evaluateAll(words => words.length > 0 && words.every(word => {
    const style = getComputedStyle(word);
    return (style.filter === "none" || style.filter === "blur(0px)") && Number(style.opacity) === 1;
  }))).toBe(true);
  await expect(page.getByRole("region", { name: "Mapa interativo de Fortaleza", exact: true })).toBeVisible();
  const disclosure = page.getByRole("button", { name: "O que mostrar e de onde vem" });
  if (await disclosure.isVisible()) await disclosure.click();
  const upas = page.getByRole("button", { name: /^UPAs/ });
  await expect(upas).toHaveAttribute("aria-pressed", "true");
  await upas.click();
  await expect(upas).toHaveAttribute("aria-pressed", "false");
  await upas.click();
  await disclosure.click();
  await page.keyboard.press("Control+k");
  const unit = firstUnit;
  await page.getByRole("combobox").fill(unit.name);
  const option = page.getByRole("option").filter({ hasText: unit.name }).first();
  await expect(option).toBeVisible();
  await page.getByRole("combobox").press("Enter");
  await expect(page.getByRole("heading", { name: unit.name, exact: true })).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`selected=${unit.id}`));
});

test("exporta exatamente o bairro filtrado em CSV UTF-8", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("tab", { name: "Lista de bairros", exact: true }).click();
  await page.getByPlaceholder("Digite o nome do bairro…").fill("Meireles");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /Baixar esta lista \(CSV\)/ }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("f360-bairros-fortaleza.csv");
  const path = await download.path();
  expect(path).not.toBeNull();
  const content = readFileSync(path!, "utf8");
  expect(content.charCodeAt(0)).toBe(0xfeff);
  expect(content).toContain("Meireles");
  expect(content.split("\r\n").filter(Boolean)).toHaveLength(2);
  expect(content).not.toContain("�");
});

test("simula sem mudar a base e limpa o ponto sem persistir coordenadas", async ({ page }, testInfo) => {
  const outgoing: string[] = [];
  page.on("request", request => outgoing.push(request.url()));
  await page.goto("/");
  await page.getByRole("tab", { name: "Simular", exact: true }).click();
  const calculate = page.getByRole("button", { name: "Calcular este ponto" });
  await openCoordinates(page);
  await expect(calculate).toBeEnabled();
  await page.locator(`[data-facility="${firstUnit.id}"]`).click();
  await openDisclosure(page, ".scenario-figures");
  await expect(page.getByRole("table")).toBeVisible();
  await expect(page.getByRole("table").getByText("+0", { exact: true })).toHaveCount(3);
  await page.getByRole("spinbutton", { name: "Latitude", exact: true }).fill("-3.8");
  await page.getByRole("spinbutton", { name: "Longitude", exact: true }).fill("-38.5");
  await calculate.click();
  await openDisclosure(page, ".scenario-figures");
  const table = page.getByRole("table");
  await expect(table).toBeVisible();
  await expect(table).toContainText("1.114.166");
  await expect(table).toContainText("1.745.333");
  await expect(table).toContainText("1.838.800");
  await page.getByRole("button", { name: "Ver resultado", exact: true }).click();
  await expect(page.getByRole("region", { name: "O que muda com esse ponto?", exact: true })).toBeFocused();
  expect(await page.locator(".scenario-table-wrap").evaluate(element => element.clientHeight)).toBeGreaterThan(100);
  await table.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `test-results/scenario-${testInfo.project.name}.png`, fullPage: true });
  expect(page.url()).not.toMatch(/-3\.8|-38\.5/);
  expect(outgoing.some(url => /-3\.8|-38\.5/.test(url))).toBe(false);
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual(["f360:story-seen"]);
  await page.getByRole("button", { name: "Limpar cenário" }).click();
  await expect(table).toHaveCount(0);
  await page.getByRole("spinbutton", { name: "Latitude", exact: true }).fill("0");
  await page.getByRole("spinbutton", { name: "Longitude", exact: true }).fill("0");
  await calculate.click();
  await expect(page.locator(".scenario-panel").getByRole("alert")).toContainText("dentro do município");
});

test("falha de download do modelo mantém números indisponíveis", async ({ page }) => {
  await page.route("**/data/scenario-model.json", route => route.fulfill({ status: 503, body: "DEMO falha de teste" }));
  await page.goto("/");
  await page.getByRole("tab", { name: "Simular", exact: true }).click();
  await expect(page.locator(".scenario-panel").getByRole("alert")).toContainText("Não foi possível carregar a malha");
  await expect(page.getByRole("table")).toHaveCount(0);
  await openCoordinates(page);
  await expect(page.getByRole("button", { name: "Calcular este ponto" })).toBeDisabled();
});

test("mede abertura e cálculo mantendo o modelo fora da carga inicial", async ({ page }, testInfo) => {
  const requests: string[] = [];
  page.on("request", request => requests.push(request.url()));
  const opened = performance.now();
  await page.goto("/");
  await expect(page.getByRole("region", { name: "Mapa interativo de Fortaleza", exact: true })).toBeVisible();
  const mapVisibleMs = performance.now() - opened;
  await page.waitForLoadState("networkidle");
  expect(requests.some(url => url.includes("/data/scenario-model.json"))).toBe(false);
  const initial = await page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
    const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
    return { htmlEncodedBytes: nav.encodedBodySize,
      mainThreadJsEncodedBytes: resources.filter(r => new URL(r.name).pathname.endsWith(".js"))
        .reduce((sum, r) => sum + r.encodedBodySize, 0) };
  });
  const enter = performance.now();
  await page.getByRole("tab", { name: "Simular", exact: true }).click();
  const calculate = page.getByRole("button", { name: "Calcular este ponto" });
  await openCoordinates(page);
  await expect(calculate).toBeEnabled();
  const simulatorReadyMs = performance.now() - enter;
  await page.getByRole("spinbutton", { name: "Latitude", exact: true }).fill("-3.8");
  await page.getByRole("spinbutton", { name: "Longitude", exact: true }).fill("-38.5");
  const start = performance.now();
  await calculate.click();
  await expect(page.getByText("Cenário calculado.", { exact: true })).toBeVisible();
  const calculateMs = performance.now() - start;
  const report = { project: testInfo.project.name, mapVisibleMs, simulatorReadyMs, calculateMs,
    ...initial, modelNotRequestedInitially: true,
    targets: { mapVisibleMs: testInfo.project.name === "mobile" ? 8000 : 5000,
      simulatorReadyMs: 5000, calculateMs: 2000 },
    environment: process.env.F360_E2E_BASE_URL
      ? "Chromium headless, HTTPS hospedado, sem throttling"
      : "Chromium headless, build de produção, localhost, sem throttling" };
  const file = `test-results/performance-${testInfo.project.name}.json`;
  writeFileSync(file, JSON.stringify(report, null, 2));
  await testInfo.attach(process.env.F360_E2E_BASE_URL ? "performance-https" : "performance-local", { path: file, contentType: "application/json" });
});

test("história participativa conduz do bairro à comparação no computador", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Foco desta evolução: desktop.");
  await page.addInitScript(() => localStorage.removeItem("f360:story-seen"));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Fortaleza, vista pelo caminho até o cuidado." })).toBeVisible();
  await expect(page.locator(".reading-host")).toHaveCount(0);
  await page.screenshot({ path: "test-results/journey-story-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 1280, height: 720 });
  await expect(page.getByRole("button", { name: "Próximo", exact: true })).toBeInViewport();
  await page.screenshot({ path: "test-results/journey-story-1280.png", fullPage: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole("button", { name: "Ir para o capítulo: Seu bairro" }).click();
  await page.getByLabel("Escolha um bairro na história").selectOption({ label: "Meireles" });
  await expect(page.locator(".story-participation")).toContainText("Meireles");
  await page.screenshot({ path: "test-results/journey-participation-desktop.png", fullPage: true });
  const continueButton = page.getByRole("button", { name: "Conhecer este bairro" });
  const buttonBox = await continueButton.boundingBox();
  expect(buttonBox).not.toBeNull();
  await page.mouse.move(buttonBox!.x + buttonBox!.width / 2, buttonBox!.y + buttonBox!.height - 0.25);
  const positions = await continueButton.evaluate(async button => {
    const positions = [];
    for (let i = 0; i < 10; i++) {
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      positions.push(button.getBoundingClientRect().y);
    }
    return [...new Set(positions)];
  });
  expect(positions).toHaveLength(1);
  await continueButton.click();
  await expect(page.getByRole("heading", { name: "Meireles", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Ver detalhes", exact: true }).click();
  await expect(page.getByRole("region", { name: "Leitura do mapa", exact: true })).toBeFocused();
  await page.getByRole("button", { name: "Comparar este bairro" }).click();
  await expect(page.getByLabel("Bairro A", { exact: true })).toHaveValue(distanceNeighborhood.code);
  await page.getByLabel("Bairro B", { exact: true }).selectOption({ label: "Jangurussu" });
  await expect(page.getByRole("region", { name: "O que a comparação mostra" })).toBeVisible();
  await expect(page.locator("[data-comparison='A'] path")).toBeInViewport();
  await expect(page.locator("[data-comparison='B'] path")).toBeInViewport();
  await expect(page.getByRole("table")).toHaveCount(0);
  await page.screenshot({ path: "test-results/journey-comparison-desktop.png", fullPage: true });
  await openDisclosure(page, ".comparison-figures");
  await expect(page.getByRole("columnheader", { name: "A · Meireles" })).toBeVisible();
});

test("leitura inicial é progressiva e números cabem no desktop de 1280 px", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Foco desta evolução: desktop.");
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Comece pelo seu bairro." })).toBeVisible();
  await expect(page.locator(".city-figures")).not.toHaveAttribute("open");
  await expect(page.locator(".rail-body")).toBeHidden();
  await page.screenshot({ path: "test-results/journey-explore-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 1280, height: 720 });
  await openDisclosure(page, ".city-figures");
  expect(await page.locator(".readout strong").evaluateAll(values => values.every(value => value.scrollWidth <= value.clientWidth))).toBe(true);
  expect(await page.locator(".reading-host").evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  await page.screenshot({ path: "test-results/journey-1280-desktop.png", fullPage: true });
});
