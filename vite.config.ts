import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    spa: {
      enabled: true,
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
