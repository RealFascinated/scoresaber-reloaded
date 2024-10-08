import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  splitting: false,
  sourcemap: true,
  clean: true,
  dts: true, // Generates type declarations
  format: ["esm"], // Ensures output is in ESM format
});
