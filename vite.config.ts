import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// For GitHub Pages project sites, the app is served under /<repo>/ — hence BASE_URL.
// Override with: BASE_URL=/ npm run build (for root-served deploys).
export default defineConfig(({ command }) => ({
  plugins: [react()],
  // "/" in dev so http://localhost:5173/ works; repo path in build for GH Pages.
  base: command === "build" ? process.env.BASE_URL ?? "/CafeRaidPlanner-Web/" : "/",
}));
