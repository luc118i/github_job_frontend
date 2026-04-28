import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/global.css";
import App from "./App";

console.log(
  "%c JobFinder %c v1.0 %c",
  "background:#7c3aed;color:#fff;font-weight:800;font-size:13px;padding:4px 8px;border-radius:4px 0 0 4px;font-family:monospace",
  "background:#06b6d4;color:#0a0a0f;font-weight:700;font-size:13px;padding:4px 8px;border-radius:0 4px 4px 0;font-family:monospace",
  "",
);
console.log(
  "%cVagas inteligentes para o seu perfil\n%cpowered by Claude AI × GitHub API\nfeito por lucca sinaacio — github.com/luc118i",
  "color:#c4b5fd;font-size:12px;font-family:monospace;",
  "color:#67e8f9;font-size:11px;font-family:monospace;",
);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
