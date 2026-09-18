import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CvEditor } from './CvEditor';
import { CvBlock, JobRecord, Profile } from '../types';

// CvEditor é a tela do "estúdio de CV" (topbar + ATS Center + editor de blocos).
// Estes testes cobrem o fluxo de recomendação do ATS Center: clicar num botão
// de "ajustar X" deve fechar o painel E levar o usuário até a seção certa —
// nunca só fechar o painel sem fazer nada (bug corrigido em runAtsAction/
// no useEffect de scroll, que não reagia a mudanças em editingIds).

function makeJob(overrides: Partial<JobRecord> = {}): JobRecord {
  return {
    id: 'job-1',
    search_id: 'search-1',
    title: 'Dev Frontend',
    company: 'Acme',
    level: 'Pleno',
    remote: true,
    location: null,
    skills: [],
    description: '',
    salary: null,
    link: null,
    link_status: 'none',
    seen: false,
    dismissed: false,
    created_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    user: {
      login: 'ana',
      name: 'Ana Dev',
      bio: null,
      avatar_url: '',
      followers: 0,
      public_repos: 0,
    },
    repos: [],
    skills: [],
    ...overrides,
  };
}

// CV quase completo segundo o motor de ATS (src/utils/atsScore.ts) — só falta
// um link http/https válido no bloco de projetos. Isso deixa exatamente a
// recomendação "Adicione um link válido (http/https) aos projetos" no topo
// do ATS Center, com a ação `edit-block` sobre um bloco que JÁ EXISTE (o
// cenário que disparava o bug: setEditingIds muda, `blocks` não muda).
const COMPLETE_BLOCKS: CvBlock[] = [
  {
    id: 'b-resumo',
    type: 'resumo',
    title: 'RESUMO',
    content: 'Desenvolvedora frontend com 5 anos de experiência em React e TypeScript, focada em performance.',
    visible: true,
  },
  {
    id: 'b-experiencia',
    type: 'experiencia',
    title: 'EXPERIÊNCIA',
    content:
      '**Engenheira de Software** – Acme Corp (jan/2022 - presente)\n' +
      '- Responsavel por: XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX\n' +
      '- Resultado: R$ 10000 economizados',
    visible: true,
  },
  {
    id: 'b-formacao',
    type: 'formacao',
    title: 'FORMAÇÃO',
    content: '**Bacharelado em Ciência da Computação** — Universidade XYZ (2016 - 2020)',
    visible: true,
  },
  {
    id: 'b-skills',
    type: 'skills',
    title: 'HABILIDADES',
    content: '**Linguagens:** JavaScript, TypeScript, Python\n**Ferramentas:** Git, Docker, AWS',
    visible: true,
  },
  {
    id: 'b-projetos',
    type: 'projetos',
    title: 'PROJETOS',
    content: '**Projeto X** — DescricaoDoProjetoSemEspacosAqui [Repo](projeto.html)',
    visible: true,
  },
];

const CONTACT_HEADER =
  '# ANA DEV\nana@example.com | (11) 91234-5678 | linkedin.com/in/ana | github.com/ana | São Paulo - SP';

function renderCvEditor(overrides: { job?: Partial<JobRecord> } = {}) {
  return render(
    <CvEditor
      job={makeJob(overrides.job)}
      profile={makeProfile()}
      linkedIn={null}
      onBack={vi.fn()}
      onDismiss={vi.fn()}
      onGoToHistory={vi.fn()}
      initialCvId="cv-1"
      initialContent={CONTACT_HEADER}
      initialBlocks={COMPLETE_BLOCKS}
    />,
  );
}

beforeEach(() => {
  // jsdom não implementa scrollIntoView.
  Element.prototype.scrollIntoView = vi.fn();
});

describe('CvEditor — ATS Center', () => {
  it('abre e fecha o painel ao clicar no badge ATS', async () => {
    const user = userEvent.setup();
    renderCvEditor();

    await user.click(screen.getByTitle('ATS Center'));
    expect(screen.getByText('ATS Center')).toBeInTheDocument();

    await user.click(screen.getByText('fechar'));
    expect(screen.queryByText('O que fazer para melhorar')).not.toBeInTheDocument();
  });

  it('ao clicar em "ajustar" uma seção existente, fecha o painel E abre/rola até o bloco — não apenas fecha o menu', async () => {
    const user = userEvent.setup();
    renderCvEditor();

    await user.click(screen.getByTitle('ATS Center'));

    const recoLabel = 'Adicione um link válido (http/https) aos projetos';
    const reco = screen.getByText(recoLabel).closest('.cv-ats-reco');
    expect(reco).not.toBeNull();

    const actionButton = within(reco as HTMLElement).getByRole('button', { name: 'editar seção' });
    await user.click(actionButton);

    // efeito 1: o painel do ATS Center fecha
    expect(screen.queryByText('O que fazer para melhorar')).not.toBeInTheDocument();

    // efeito 2 (o que faltava antes do fix): o bloco de projetos, que já
    // existia, abre em modo de edição e a página rola até ele.
    const projetosBlock = document.getElementById('cv-block-b-projetos');
    expect(projetosBlock).not.toBeNull();
    expect(projetosBlock?.className).toContain('cv-block--editing');

    await waitFor(() => {
      expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    });
  });

  it('mostra "Adicione um link válido" quando o projeto não tem link http/https, mesmo com o resto do CV completo', async () => {
    const user = userEvent.setup();
    renderCvEditor();

    await user.click(screen.getByTitle('ATS Center'));
    expect(screen.getByText('Adicione um link válido (http/https) aos projetos')).toBeInTheDocument();
  });
});
