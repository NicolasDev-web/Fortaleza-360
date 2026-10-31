import { defineConfig } from "@playwright/test";

const remoteURL = process.env.F360_E2E_BASE_URL;
if (remoteURL) {
  const target = new URL(remoteURL);
  if (target.protocol !== "https:" || target.username || target.password || target.search || target.hash || target.pathname !== "/") {
    throw new Error("F360_E2E_BASE_URL exige uma origem HTTPS sem credenciais, caminho ou query.");
  }
}

export default defineConfig({
  testDir: "./tests",
  testMatch: "e2e.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45_000,
  expect: { timeout: 12_000 },
  use: {
    baseURL: remoteURL ?? "http://127.0.0.1:3100",
    browserName: "chromium",
    headless: true,
    reducedMotion: "reduce",
    // Traces remotos podem conter o header temporário de acesso ao preview.
    trace: remoteURL ? "off" : "retain-on-failure",
    screenshot: "only-on-failure",
    acceptDownloads: true,
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
  webServer: remoteURL ? undefined : {
    command: "npm run build && npm run start -- --hostname 127.0.0.1 --port 3100",
    url: "http://127.0.0.1:3100",
    timeout: 180_000,
    reuseExistingServer: false,
  },
});
