import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// תצורת Vite בסיסית עבור אפליקציית React + TypeScript
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
  },
});
