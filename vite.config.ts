import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { readCloudConfig } from "./src/core/cloud-config";
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  readCloudConfig(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY);
  return {
    plugins: [react()],
    base: "./",
    server: { port: 5173, strictPort: true },
    build: {
      sourcemap: false,
      rollupOptions: {
        output: { manualChunks: { supabase: ["@supabase/supabase-js"] } },
      },
    },
  };
});
