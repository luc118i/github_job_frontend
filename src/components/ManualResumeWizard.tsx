import { useState } from 'react';
import {
  LinkedInData,
  LinkedInPosition,
  LinkedInEducation,
  LinkedInCertification,
  LinkedInLanguage,
} from '../types';

interface Props {
  initial?: LinkedInData | null;
  onComplete: (data: LinkedInData) => void;
  onCancel: () => void;
}

type StepKey =
  | 'personal' | 'objective' | 'experience' | 'education'
  | 'certifications' | 'skills' | 'languages' | 'additional' | 'review';

const STEPS: { key: StepKey; label: string }[] = [
  { key: 'personal', label: 'Dados pessoais' },
  { key: 'objective', label: 'Objetivo' },
  { key: 'experience', label: 'Experiência' },
  { key: 'education', label: 'Formação' },
  { key: 'certifications', label: 'Certificações' },
  { key: 'skills', label: 'Habilidades' },
  { key: 'languages', label: 'Idiomas' },
  { key: 'additional', label: 'Adicionais' },
  { key: 'review', label: 'Revisão' },
];

const LANGUAGE_LEVELS = ['Básico', 'Intermediário', 'Avançado', 'Fluente', 'Nativo'];

const SUGGESTED_SKILLS = [
  'Comunicação', 'Trabalho em equipe', 'Organização', 'Proatividade',
  'Liderança', 'Atendimento ao cliente', 'Resolução de problemas',
  'Gestão de tempo', 'Excel', 'Vendas', 'Negociação', 'Inglês',
];

function emptyPosition(): LinkedInPosition {
  return { company: '', title: '', description: null, location: null, startedOn: '', finishedOn: null };
}
function emptyEducation(): LinkedInEducation {
  return { school: '', degree: null, startDate: null, endDate: '', notes: null };
}
function emptyCertification(): LinkedInCertification {
  return { name: '', authority: null, licenseNumber: null, startedOn: null, finishedOn: null };
}
function emptyLanguage(): LinkedInLanguage {
  return { name: '', level: null };
}

function RepeatableList<T>({ items, onChange, makeEmpty, renderItem, addLabel, emptyHint }: {
  items: T[];
  onChange: (items: T[]) => void;
  makeEmpty: () => T;
  renderItem: (item: T, update: (patch: Partial<T>) => void) => React.ReactNode;
  addLabel: string;
  emptyHint: string;
}) {
  function addItem() { onChange([...items, makeEmpty()]); }
  function updateItem(i: number, patch: Partial<T>) {
    onChange(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }
  function removeItem(i: number) { onChange(items.filter((_, idx) => idx !== i)); }

  return (
    <div className="mrw-list">
      {items.length === 0 && <p className="mrw-empty-hint">{emptyHint}</p>}
      {items.map((item, i) => (
        <div className="mrw-list-item" key={i}>
          <button type="button" className="mrw-remove-btn" onClick={() => removeItem(i)} title="Remover">×</button>
          {renderItem(item, (patch) => updateItem(i, patch))}
        </div>
      ))}
      <button type="button" className="mrw-add-btn" onClick={addItem}>+ {addLabel}</button>
    </div>
  );
}

export function ManualResumeWizard({ initial, onComplete, onCancel }: Props) {
  const [stepIndex, setStepIndex] = useState(0);
  const [name, setName] = useState(initial?.name ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [objective, setObjective] = useState(initial?.objective ?? '');
  const [positions, setPositions] = useState<LinkedInPosition[]>(initial?.positions ?? []);
  const [education, setEducation] = useState<LinkedInEducation[]>(initial?.education ?? []);
  const [certifications, setCertifications] = useState<LinkedInCertification[]>(initial?.certifications ?? []);
  const [skills, setSkills] = useState<string[]>(initial?.skills ?? []);
  const [skillDraft, setSkillDraft] = useState('');
  const [languages, setLanguages] = useState<LinkedInLanguage[]>(initial?.languages ?? []);
  const [additionalInfo, setAdditionalInfo] = useState(initial?.additionalInfo ?? '');

  const step = STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === STEPS.length - 1;
  const personalValid = name.trim().length > 0 && /\S+@\S+\.\S+/.test(email.trim());

  function next() {
    if (step.key === 'personal' && !personalValid) return;
    if (isLast) {
      onComplete({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        positions,
        education,
        certifications,
        objective: objective.trim() || null,
        skills,
        languages,
        additionalInfo: additionalInfo.trim() || null,
      });
      return;
    }
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  }

  function back() {
    if (isFirst) { onCancel(); return; }
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  function addSkill() {
    const v = skillDraft.trim();
    if (v && !skills.includes(v)) setSkills([...skills, v]);
    setSkillDraft('');
  }

  return (
    <div className="onb-card mrw-card">
      <div className="mrw-progress-label">Passo {stepIndex + 1} de {STEPS.length} — {step.label}</div>
      <div className="onb-progress-line">
        <div className="onb-progress-fill" style={{ width: `${(stepIndex / (STEPS.length - 1)) * 100}%` }} />
      </div>

      {step.key === 'personal' && (
        <div className="mrw-fields">
          <h2 className="onb-title mrw-step-title">Dados pessoais e contato</h2>
          <div className="auth-field">
            <label className="auth-label">nome completo</label>
            <input className="auth-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" autoFocus />
          </div>
          <div className="auth-field">
            <label className="auth-label">e-mail</label>
            <input className="auth-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" />
          </div>
          <div className="auth-field">
            <label className="auth-label">telefone (opcional)</label>
            <input className="auth-input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 90000-0000" />
          </div>
        </div>
      )}

      {step.key === 'objective' && (
        <div className="mrw-fields">
          <h2 className="onb-title mrw-step-title">Objetivo profissional</h2>
          <p className="onb-subtitle">Opcional. Resuma em poucas frases o que você busca na próxima oportunidade.</p>
          <textarea
            className="auth-input mrw-textarea"
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            placeholder="Ex: Atuar como desenvolvedor(a) backend em uma empresa que valorize..."
            rows={5}
          />
        </div>
      )}

      {step.key === 'experience' && (
        <div className="mrw-fields">
          <h2 className="onb-title mrw-step-title">Experiência profissional</h2>
          <RepeatableList
            items={positions}
            onChange={setPositions}
            makeEmpty={emptyPosition}
            addLabel="Adicionar experiência"
            emptyHint="Nenhuma experiência adicionada ainda — tudo bem se você está começando."
            renderItem={(p, update) => (
              <div className="mrw-grid">
                <input className="auth-input" placeholder="Cargo" value={p.title} onChange={(e) => update({ title: e.target.value })} />
                <input className="auth-input" placeholder="Empresa" value={p.company} onChange={(e) => update({ company: e.target.value })} />
                <input className="auth-input" placeholder="Local (opcional)" value={p.location ?? ''} onChange={(e) => update({ location: e.target.value || null })} />
                <div className="mrw-grid-2">
                  <label className="mrw-date-field">
                    <span className="mrw-date-label">Início</span>
                    <input className="auth-input" type="month" value={p.startedOn} onChange={(e) => update({ startedOn: e.target.value })} />
                  </label>
                  <label className="mrw-date-field">
                    <span className="mrw-date-label">Fim</span>
                    <input
                      className="auth-input"
                      type="month"
                      value={p.finishedOn ?? ''}
                      disabled={p.finishedOn === null}
                      onChange={(e) => update({ finishedOn: e.target.value })}
                    />
                  </label>
                </div>
                <label className="mrw-checkbox-row">
                  <input
                    type="checkbox"
                    checked={p.finishedOn === null}
                    onChange={(e) => update({ finishedOn: e.target.checked ? null : '' })}
                  />
                  Emprego atual
                </label>
                <textarea className="auth-input mrw-textarea" placeholder="Descrição das atividades (opcional)" rows={3} value={p.description ?? ''} onChange={(e) => update({ description: e.target.value || null })} />
              </div>
            )}
          />
        </div>
      )}

      {step.key === 'education' && (
        <div className="mrw-fields">
          <h2 className="onb-title mrw-step-title">Formação acadêmica</h2>
          <RepeatableList
            items={education}
            onChange={setEducation}
            makeEmpty={emptyEducation}
            addLabel="Adicionar formação"
            emptyHint="Nenhuma formação adicionada ainda."
            renderItem={(e, update) => (
              <div className="mrw-grid">
                <input className="auth-input" placeholder="Curso/Grau" value={e.degree ?? ''} onChange={(ev) => update({ degree: ev.target.value || null })} />
                <input className="auth-input" placeholder="Instituição" value={e.school} onChange={(ev) => update({ school: ev.target.value })} />
                <div className="mrw-grid-2">
                  <label className="mrw-date-field">
                    <span className="mrw-date-label">Início</span>
                    <input className="auth-input" type="month" value={e.startDate ?? ''} onChange={(ev) => update({ startDate: ev.target.value || null })} />
                  </label>
                  <label className="mrw-date-field">
                    <span className="mrw-date-label">Conclusão</span>
                    <input
                      className="auth-input"
                      type="month"
                      value={e.endDate ?? ''}
                      disabled={e.endDate === null}
                      onChange={(ev) => update({ endDate: ev.target.value })}
                    />
                  </label>
                </div>
                <label className="mrw-checkbox-row">
                  <input
                    type="checkbox"
                    checked={e.endDate === null}
                    onChange={(ev) => update({ endDate: ev.target.checked ? null : '' })}
                  />
                  Cursando atualmente
                </label>
                <input className="auth-input" placeholder="Observações (opcional)" value={e.notes ?? ''} onChange={(ev) => update({ notes: ev.target.value || null })} />
              </div>
            )}
          />
        </div>
      )}

      {step.key === 'certifications' && (
        <div className="mrw-fields">
          <h2 className="onb-title mrw-step-title">Cursos e certificações</h2>
          <RepeatableList
            items={certifications}
            onChange={setCertifications}
            makeEmpty={emptyCertification}
            addLabel="Adicionar certificação"
            emptyHint="Nenhuma certificação adicionada ainda."
            renderItem={(c, update) => (
              <div className="mrw-grid">
                <input className="auth-input" placeholder="Nome do curso/certificação" value={c.name} onChange={(e) => update({ name: e.target.value })} />
                <input className="auth-input" placeholder="Instituição/Autoridade (opcional)" value={c.authority ?? ''} onChange={(e) => update({ authority: e.target.value || null })} />
                <div className="mrw-grid-2">
                  <label className="mrw-date-field">
                    <span className="mrw-date-label">Início (opcional)</span>
                    <input className="auth-input" type="month" value={c.startedOn ?? ''} onChange={(e) => update({ startedOn: e.target.value || null })} />
                  </label>
                  <label className="mrw-date-field">
                    <span className="mrw-date-label">Conclusão (opcional)</span>
                    <input className="auth-input" type="month" value={c.finishedOn ?? ''} onChange={(e) => update({ finishedOn: e.target.value || null })} />
                  </label>
                </div>
              </div>
            )}
          />
        </div>
      )}

      {step.key === 'skills' && (
        <div className="mrw-fields">
          <h2 className="onb-title mrw-step-title">Habilidades</h2>
          <p className="onb-subtitle">Clique nas sugestões abaixo ou digite a sua e pressione Enter.</p>
          <div className="mrw-skill-suggestions">
            {SUGGESTED_SKILLS.filter((s) => !skills.includes(s)).map((s) => (
              <button key={s} type="button" className="mrw-skill-suggestion" onClick={() => setSkills([...skills, s])}>
                + {s}
              </button>
            ))}
          </div>
          <input
            className="auth-input"
            value={skillDraft}
            onChange={(e) => setSkillDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }}
            placeholder="Outra habilidade..."
          />
          <div className="onb-summary-tags mrw-skill-tags">
            {skills.map((s) => (
              <span key={s} className="onb-tag mrw-skill-tag">
                {s}
                <button type="button" className="mrw-tag-remove" onClick={() => setSkills(skills.filter((x) => x !== s))}>×</button>
              </span>
            ))}
          </div>
        </div>
      )}

      {step.key === 'languages' && (
        <div className="mrw-fields">
          <h2 className="onb-title mrw-step-title">Idiomas</h2>
          <RepeatableList
            items={languages}
            onChange={setLanguages}
            makeEmpty={emptyLanguage}
            addLabel="Adicionar idioma"
            emptyHint="Nenhum idioma adicionado ainda."
            renderItem={(l, update) => (
              <div className="mrw-grid-2">
                <input className="auth-input" placeholder="Idioma" value={l.name} onChange={(e) => update({ name: e.target.value })} />
                <select className="auth-input" value={l.level ?? ''} onChange={(e) => update({ level: e.target.value || null })}>
                  <option value="">Nível</option>
                  {LANGUAGE_LEVELS.map((lvl) => <option key={lvl} value={lvl}>{lvl}</option>)}
                </select>
              </div>
            )}
          />
        </div>
      )}

      {step.key === 'additional' && (
        <div className="mrw-fields">
          <h2 className="onb-title mrw-step-title">Informações adicionais</h2>
          <p className="onb-subtitle">Opcional. Qualquer coisa relevante que não coube nas outras seções.</p>
          <textarea
            className="auth-input mrw-textarea"
            value={additionalInfo}
            onChange={(e) => setAdditionalInfo(e.target.value)}
            placeholder="Ex: disponibilidade para viagens, CNH, voluntariado..."
            rows={4}
          />
        </div>
      )}

      {step.key === 'review' && (
        <div className="mrw-fields">
          <h2 className="onb-title mrw-step-title">Revisão</h2>
          <div className="onb-profile-summary">
            <div className="onb-summary-item">
              <span className="onb-summary-label">Nome</span>
              <span className="onb-summary-value">{name || '—'}</span>
            </div>
            <div className="onb-summary-item">
              <span className="onb-summary-label">Contato</span>
              <span className="onb-summary-value">{[email, phone].filter(Boolean).join(' · ') || '—'}</span>
            </div>
            <div className="onb-summary-item">
              <span className="onb-summary-label">Experiência / Formação / Certificações</span>
              <span className="onb-summary-value">{positions.length} experiência(s), {education.length} formação(ões), {certifications.length} certificação(ões)</span>
            </div>
            {skills.length > 0 && (
              <div className="onb-summary-item">
                <span className="onb-summary-label">Habilidades</span>
                <div className="onb-summary-tags">
                  {skills.map((s) => <span key={s} className="onb-tag">{s}</span>)}
                </div>
              </div>
            )}
            {languages.length > 0 && (
              <div className="onb-summary-item">
                <span className="onb-summary-label">Idiomas</span>
                <span className="onb-summary-value">{languages.map((l) => `${l.name}${l.level ? ` (${l.level})` : ''}`).join(', ')}</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="onb-actions mrw-actions">
        <button className="onb-btn onb-btn--primary" onClick={next} disabled={step.key === 'personal' && !personalValid}>
          {isLast ? 'Concluir currículo' : 'Continuar'}
        </button>
        <button className="onb-btn onb-btn--ghost" onClick={back}>
          {isFirst ? 'Cancelar' : 'Voltar'}
        </button>
      </div>
    </div>
  );
}
