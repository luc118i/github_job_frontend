export function Footer() {
  return (
    <footer className="app-footer">
      <span>
        feito com <span className="footer-heart">♥</span> por{' '}
        <a
          className="footer-link"
          href="https://github.com/luccasinaacio"
          target="_blank"
          rel="noopener noreferrer"
        >
          lucca sinaacio
        </a>
      </span>
      <span className="footer-sep">·</span>
      <span>
        powered by{' '}
        <a
          className="footer-link"
          href="https://www.anthropic.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          claude ai
        </a>
        {' '}&{' '}
        <a
          className="footer-link"
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          github
        </a>
      </span>
      <span className="footer-sep">·</span>
      <span className="footer-version">v1.0</span>
    </footer>
  );
}
