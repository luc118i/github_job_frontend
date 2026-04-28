export function Footer() {
  return (
    <footer className="app-footer">
      <a
        className="footer-link"
        href="https://github.com/luc118i"
        target="_blank"
        rel="noopener noreferrer"
      >
        Lucas Inacio
      </a>
      <span className="footer-sep">·</span>
      <span>
        powered by{" "}
        <a
          className="footer-link"
          href="https://www.anthropic.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          claude ai
        </a>{" "}
        &times;{" "}
        <a
          className="footer-link"
          href="https://docs.github.com/en/rest"
          target="_blank"
          rel="noopener noreferrer"
        >
          github api
        </a>
      </span>
      <span className="footer-sep">·</span>
      <span className="footer-version">v1.0</span>
    </footer>
  );
}
