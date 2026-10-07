import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// "base" is the folder the app lives in on GitHub Pages: https://<user>.github.io/liftlog/
export default defineConfig({
  base: "/liftlog/",
  plugins: [react()],
});
