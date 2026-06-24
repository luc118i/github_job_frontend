import { useEffect, useRef, useState } from 'react';
import { PortfolioData, GitHubUser } from '../types';
import { fetchPublicPortfolio, askPortfolio, registerPortfolioView, PortfolioChatTurn } from '../services/portfolio';
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

  // "Pergunte sobre mim" — chat de IA do recrutador.
  const [chatOpen, setChatOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState<PortfolioChatTurn[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatHistory, chatLoading]);

  async function sendQuestion() {
    const q = chatInput.trim();
    if (!q || chatLoading) return;
    const next: PortfolioChatTurn[] = [...chatHistory, { role: 'recruiter', content: q }];
    setChatHistory(next);
    setChatInput('');
    setChatLoading(true);
    try {
      const answer = await askPortfolio(username, q, chatHistory);
      setChatHistory((h) => [...h, { role: 'ai', content: answer }]);
    } catch (e) {
      setChatHistory((h) => [...h, { role: 'ai', content: (e as Error).message }]);
    } finally {
      setChatLoading(false);
    }
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const pf = await fetchPublicPortfolio(username);
        if (!alive) return;
        if (!pf) { setNotFound(true); setLoading(false); return; }
        setData(pf);
        setLoading(false);
        // Registra a visualização 1x por sessão (não conta refresh repetido).
        const viewKey = `pf_viewed_${username.toLowerCase()}`;
        if (!sessionStorage.getItem(viewKey)) {
          sessionStorage.setItem(viewKey, '1');
          registerPortfolioView(pf.githubUsername);
        }
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

  // Resumo do recrutador — só os campos preenchidos.
  const recruiterFields = ([
    ['Nível', data.recruiter.level],
    ['Área', data.recruiter.area],
    ['Local', data.recruiter.location],
    ['Remoto', data.recruiter.remote],
    ['Pretensão', data.recruiter.salary],
  ] as const).filter(([, v]) => !!v);

  // Resultados — destaques agregados dos projetos.
  const resultados = data.projects.flatMap((p) => p.highlights).filter(Boolean).slice(0, 6);

  return (
    <div className="pf-page" data-template={data.template}>
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

        {/* ── Resumo do recrutador ── */}
        {recruiterFields.length > 0 && (
          <div className="pf-recruiter">
            {recruiterFields.map(([k, v]) => (
              <div key={k} className="pf-rec-cell">
                <span className="pf-rec-k">{k}</span>
                <span className="pf-rec-v">{v}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── Sobre ── */}
        {data.summary && (
          <section className="pf-section">
            <h2 className="pf-section-title">Sobre</h2>
            <p className="pf-summary">{data.summary}</p>
          </section>
        )}

        {/* ── Resultados ── */}
        {resultados.length > 0 && (
          <section className="pf-section">
            <h2 className="pf-section-title">Resultados</h2>
            <div className="pf-results">
              {resultados.map((r, i) => <div key={i} className="pf-result">{r}</div>)}
            </div>
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

        {/* ── Competências ── */}
        {data.competencies.length > 0 && (
          <section className="pf-section">
            <h2 className="pf-section-title">Competências</h2>
            <div className="pf-comp-list">
              {data.competencies.map((c) => <span key={c} className="pf-comp-pill">{c}</span>)}
            </div>
          </section>
        )}

        {/* ── Certificações ── */}
        {data.certifications.length > 0 && (
          <section className="pf-section">
            <h2 className="pf-section-title">Certificações</h2>
            <div className="pf-timeline">
              {data.certifications.map((c, i) => (
                <div key={i} className="pf-exp">
                  <div className="pf-exp-head">
                    <span className="pf-exp-title">{c.name}</span>
                    {(c.finishedOn || c.startedOn) && <span className="pf-exp-period">{c.finishedOn ?? c.startedOn}</span>}
                  </div>
                  {c.authority && <span className="pf-exp-company">{c.authority}</span>}
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

        {/* CTA: convida o visitante a criar o próprio portfólio */}
        <section className="pf-promo">
          <h2 className="pf-promo-title">Gostou? Crie o seu também.</h2>
          <p className="pf-promo-sub">
            Monte um portfólio profissional com IA em minutos — currículo, projetos e
            uma página pública que responde recrutadores. Grátis no JobFinder.
          </p>
          <a className="pf-promo-btn" href={window.location.origin + '/'}>Criar meu portfólio</a>
        </section>

        <footer className="pf-footer">
          Feito com JobFinder
        </footer>
      </main>

      {/* ── "Pergunte sobre mim" — chat de IA do recrutador ── */}
      {!chatOpen && (
        <button className="pf-ask-fab" onClick={() => setChatOpen(true)}>
          💬 Pergunte sobre mim
        </button>
      )}
      {chatOpen && (
        <div className="pf-chat">
          <div className="pf-chat-head">
            <span className="pf-chat-title">Pergunte sobre {data.name.split(' ')[0]}</span>
            <button className="pf-chat-close" onClick={() => setChatOpen(false)}>✕</button>
          </div>
          <div className="pf-chat-body">
            {chatHistory.length === 0 && !chatLoading && (
              <p className="pf-chat-hint">IA treinada no perfil. Pergunte sobre experiência, skills, disponibilidade…</p>
            )}
            {chatHistory.map((t, i) => (
              <div key={i} className={`pf-chat-msg pf-chat-msg--${t.role}`}>
                <span className="pf-chat-who">{t.role === 'ai' ? 'IA' : 'Você'}</span>
                <p className="pf-chat-text">{t.content}</p>
              </div>
            ))}
            {chatLoading && <div className="pf-chat-msg pf-chat-msg--ai"><span className="pf-chat-typing">digitando…</span></div>}
            <div ref={chatEndRef} />
          </div>
          <div className="pf-chat-input-row">
            <input
              className="pf-chat-input"
              placeholder={`Pergunte sobre ${data.name.split(' ')[0]}…`}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') sendQuestion(); }}
              disabled={chatLoading}
            />
            <button className="pf-chat-send" onClick={sendQuestion} disabled={chatLoading || !chatInput.trim()}>›</button>
          </div>
        </div>
      )}
    </div>
  );
}
