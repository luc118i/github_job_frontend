import { useEffect, useState } from 'react';
import { PortfolioData, GitHubUser } from '../types';
import { fetchPublicPortfolio } from '../services/portfolio';
import { fetchGitHubUser } from '../services/github';
import { CATEGORY } from '../utils/projectMatch';

interface PublicPortfolioProps {
  username: string;
}

// Cor da categoria (reusa os tokens do M5); fallback p/ categorias desconhecidas.
function catColor(category: string): string {
  return (CATEGORY as Record<string, { color: string }>)[category]?.color ?? '#64748B';
}

function catLabel(category: string): string {
  return (CATEGORY as Record<string, { label: string }>)[category]?.label ?? category;
}

/** Formata "ano de início — fim" das experiências (datas vêm como string livre). */
function period(start: string, end: string | null): string {
  const s = (start ?? '').trim();
  const e = (end ?? '').trim();
  if (!s && !e) return '';
  return `${s || '—'} — ${e || 'atual'}`;
}

export function PublicPortfolio({ username }: PublicPortfolioProps) {
  const [data, setData] = useState<PortfolioData | null>(null);
  const [gh, setGh] = useState<GitHubUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const pf = await fetchPublicPortfolio(username);
        if (!alive) return;
        if (!pf) { setNotFound(true); setLoading(false); return; }
        setData(pf);
        setLoading(false);
        // GitHub (avatar/bio) best-effort — não bloqueia a página.
        try {
          const user = await fetchGitHubUser(pf.githubUsername);
          if (alive) setGh(user);
        } catch { /* sem avatar/bio — segue */ }
      } catch {
        if (alive) { setNotFound(true); setLoading(false); }
      }
    })();
    return () => { alive = false; };
  }, [username]);

  useEffect(() => {
    document.title = data ? `${data.name} — Portfólio` : 'Portfólio';
  }, [data]);

  if (loading) {
    return <div className="pf-state">carregando portfólio…</div>;
  }
  if (notFound || !data) {
    return (
      <div className="pf-state">
        <h1 className="pf-404-title">Portfólio não encontrado</h1>
        <p>Este portfólio não existe ou ainda não foi publicado.</p>
      </div>
    );
  }

  const initials = data.name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');

  return (
    <div className="pf-page">
      <main className="pf-container">
        {/* ── Cabeçalho ── */}
        <header className="pf-hero">
          {gh?.avatar_url
            ? <img className="pf-avatar" src={gh.avatar_url} alt={data.name} />
            : <div className="pf-avatar pf-avatar--fallback">{initials}</div>}
          <div className="pf-hero-info">
            <h1 className="pf-name">{data.name}</h1>
            {data.headline && <p className="pf-headline">{data.headline}</p>}
            {gh?.bio && <p className="pf-bio">{gh.bio}</p>}
            <div className="pf-links">
              <a className="pf-link" href={`https://github.com/${data.githubUsername}`} target="_blank" rel="noopener noreferrer">GitHub</a>
              {data.contactEmail && <a className="pf-link" href={`mailto:${data.contactEmail}`}>Contato</a>}
            </div>
          </div>
        </header>

        {/* ── Sobre ── */}
        {data.summary && (
          <section className="pf-section">
            <h2 className="pf-section-title">Sobre</h2>
            <p className="pf-summary">{data.summary}</p>
          </section>
        )}

        {/* ── Projetos ── */}
        {data.projects.length > 0 && (
          <section className="pf-section">
            <h2 className="pf-section-title">Projetos</h2>
            <div className="pf-grid">
              {data.projects.map((p, i) => (
                <article key={i} className="pf-card" style={{ ['--accent' as string]: catColor(p.category) }}>
                  <span className="pf-card-cat" style={{ color: catColor(p.category), borderColor: catColor(p.category) }}>{catLabel(p.category)}</span>
                  <h3 className="pf-card-title">{p.title}</h3>
                  {p.description && <p className="pf-card-desc">{p.description}</p>}
                  {p.tech.length > 0 && (
                    <div className="pf-tech">
                      {p.tech.map((t) => <span key={t} className="pf-tech-chip" style={{ borderColor: catColor(p.category) }}>{t}</span>)}
                    </div>
                  )}
                  {p.link && <a className="pf-card-link" href={p.link} target="_blank" rel="noopener noreferrer">abrir ↗</a>}
                </article>
              ))}
            </div>
          </section>
        )}

        {/* ── Experiência ── */}
        {data.positions.length > 0 && (
          <section className="pf-section">
            <h2 className="pf-section-title">Experiência</h2>
            <div className="pf-timeline">
              {data.positions.map((pos, i) => (
                <div key={i} className="pf-exp">
                  <div className="pf-exp-head">
                    <span className="pf-exp-title">{pos.title}</span>
                    <span className="pf-exp-period">{period(pos.startedOn, pos.finishedOn)}</span>
                  </div>
                  <span className="pf-exp-company">{pos.company}</span>
                  {pos.description && <p className="pf-exp-desc">{pos.description}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Formação ── */}
        {data.education.length > 0 && (
          <section className="pf-section">
            <h2 className="pf-section-title">Formação</h2>
            <div className="pf-timeline">
              {data.education.map((ed, i) => (
                <div key={i} className="pf-exp">
                  <div className="pf-exp-head">
                    <span className="pf-exp-title">{ed.school}</span>
                    <span className="pf-exp-period">{period(ed.startDate ?? '', ed.endDate)}</span>
                  </div>
                  {ed.degree && <span className="pf-exp-company">{ed.degree}</span>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Contato / CTA ── */}
        {data.contactEmail && (
          <section className="pf-cta">
            <h2 className="pf-cta-title">Vamos conversar?</h2>
            <a className="pf-cta-btn" href={`mailto:${data.contactEmail}`}>Entrar em contato</a>
          </section>
        )}

        <footer className="pf-footer">
          Feito com JobFinder
        </footer>
      </main>
    </div>
  );
}
