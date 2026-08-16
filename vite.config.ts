import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    spa: {
      prerender: {
        outputPath: "/_shell.html",
        crawlLinks: true,
      },
    },
    server: {
      entry: "server",
    },
  },
});
