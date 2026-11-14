import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const rootEnv = loadEnv(mode, fileURLToPath(new URL("../..", import.meta.url)), "");
  for (const [key, value] of Object.entries(rootEnv)) {
    if (process.env[key] === undefined) process.env[key] = value;
  }

  return {
    environments: {
      client: {
        build: {
          outDir: ".output/client",
        },
      },
      ssr: {
        build: {
          outDir: ".output/server",
          rollupOptions: { input: fileURLToPath(import.meta.resolve("@tanstack/react-start/server-entry")) },
        },
      },
    },
    plugins: [tanstackStart({ spa: { enabled: true, prerender: { outputPath: "/index" } } }), tailwindcss(), react()],
    resolve: {
      tsconfigPaths: true,
    },
    server: {
      proxy: {

        "/api": {
          target: process.env.API_PROXY_TARGET ?? "http://localhost:8089",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api(?!\/v1)/, "/api/v1"),
        },
      },
    },
    preview: {
      allowedHosts: process.env.PREVIEW_ALLOWED_HOSTS?.split(",").map((h) => h.trim()) ?? ["miva.oktopals.com"],
      proxy: {
        "/api": {
          target: process.env.API_PROXY_TARGET ?? "http://localhost:8089",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api(?!\/v1)/, "/api/v1"),
        },
      },
    },
  };
});
