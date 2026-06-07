export function Footer() {
  return (
    <footer className="status-bar">
      <span className="status-bar-left">
        JOBFINDER OS <span className="status-bar-dot">•</span> v{__APP_VERSION__}
      </span>
      <span className="status-bar-center">
        <span className="status-online-dot" />
        Sistema online
        <span className="status-sep">|</span>
        © 2026 JobFinder · Todos os direitos reservados
      </span>
      <span className="status-bar-right">
        feito por{' '}
        <a
          className="status-credit"
          href="https://lucasinaciosolucoes.vercel.app/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Lucas Soluções
        </a>
      </span>
    </footer>
  );
}
