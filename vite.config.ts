import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { nitro } from "nitro/vite";

export default defineConfig({
  base: "/your-training-hub/",
  
  tanstackStart: {
    server: { entry: "server" },
    prerender: {
      enabled: true,
      autoSubfolderIndex: true,
      autoStaticPathsDiscovery: true,
      crawlLinks: true,
    },
  },

  vite: {
    plugins: [
      nitro({
        preset: "node-server",
      }),
    ],
  },
});
