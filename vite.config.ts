import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    // Most of the data layer is pure TypeScript and needs no DOM. The few
    // tests that exercise the React bindings opt into jsdom with a
    // `@vitest-environment` docblock.
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
    restoreMocks: true,
  },
});
