import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        game: resolve(__dirname, "game/index.html"),
        legacyGame: resolve(__dirname, "game.html"),
      },
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/firebase") || id.includes("node_modules/@firebase")) return "firebase";
          return undefined;
        },
      },
    },
  },
});
