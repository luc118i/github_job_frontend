import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import "./styles/global.css";
import "./styles/design-system.css";
import App from "./App";

// Rota pública do portfólio: /p/<github_username>. O app não usa react-router,
// então detectamos o path aqui e renderizamos a página pública isolada (sem
// header/nav nem os fetches de auth do App). Requer fallback SPA no host.
const PublicPortfolio = lazy(() => import("./components/PublicPortfolio").then((m) => ({ default: m.PublicPortfolio })));
const portfolioMatch = window.location.pathname.match(/^\/p\/([^/]+)\/?$/);

console.log(
  `%c JobFinder %c v${__APP_VERSION__} %c`,
  "background:#7c3aed;color:#fff;font-weight:800;font-size:13px;padding:4px 8px;border-radius:4px 0 0 4px;font-family:monospace",
  "background:#06b6d4;color:#0a0a0f;font-weight:700;font-size:13px;padding:4px 8px;border-radius:0 4px 4px 0;font-family:monospace",
  "",
);
console.log(
  "%cVagas inteligentes para o seu perfil\n%cfeito por Lucas Inácio · Lucas Soluções\nhttps://lucasinaciosolucoes.vercel.app/",
  "color:#c4b5fd;font-size:12px;font-family:monospace;",
  "color:#67e8f9;font-size:11px;font-family:monospace;",
);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {portfolioMatch
      ? <Suspense fallback={<div className="pf-state">carregando portfólio…</div>}>
          <PublicPortfolio username={decodeURIComponent(portfolioMatch[1])} />
        </Suspense>
      : <App />}
  </StrictMode>,
);
