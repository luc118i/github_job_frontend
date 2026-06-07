export function Footer() {
  return (
    <footer className="status-bar">
      <span className="status-bar-left">
        JOBFINDER OS <span className="status-bar-dot">•</span> v1.0.0
      </span>
      <span className="status-bar-center">
        <span className="status-online-dot" />
        Sistema online
        <span className="status-sep">|</span>
        Conectado ao Github Jobs API
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
