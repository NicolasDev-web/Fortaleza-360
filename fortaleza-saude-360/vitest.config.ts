import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "jsdom",
    setupFiles: "./tests/setup.ts",
    testTimeout: 20000,
    // Cada arquivo cria um JSDOM pesado (mapa SVG completo); com um worker por núcleo,
    // os testes de digitação disputavam CPU e passavam de 20 s. Quatro é mais rápido no total.
    maxWorkers: 4,
    exclude: ["**/node_modules/**", "tests/e2e.spec.ts"],
  },
});
