import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  timeout: 30_000,
  use: { baseURL: process.env.E2E_URL ?? "http://localhost:3100" },
  webServer: process.env.E2E_URL
    ? undefined
    : { command: "npm run start -- -p 3100", url: "http://localhost:3100", reuseExistingServer: true },
  projects: [
    { name: "celular", use: { ...devices["Pixel 7"] } },
    { name: "escritorio", use: { viewport: { width: 1440, height: 900 } } },
  ],
});
