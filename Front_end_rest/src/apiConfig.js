// Centralized API configuration
// VITE_API_BASE is set in Vercel dashboard (production) or .env.local (development)
// Fallback chain: env var → current Render URL → localhost

export const API_BASE =
  import.meta.env.VITE_API_BASE ||
  "https://agri-chain-api.onrender.com" ||
  "http://localhost:8000";
