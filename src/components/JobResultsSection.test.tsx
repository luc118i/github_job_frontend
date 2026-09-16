import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { JobResultsSection } from './JobResultsSection';
import { ProfessionJobRecord } from '../types';

function makeJob(overrides: Partial<ProfessionJobRecord>): ProfessionJobRecord {
  return {
    id: '1',
    search_id: 'search-1',
    title: 'Dev Frontend',
    company: 'Acme',
    level: 'Pleno',
    remote: true,
    location: null,
    skills: ['React'],
    description: '',
    salary: null,
    link: null,
    link_status: 'none',
    seen: false,
    dismissed: false,
    created_at: '2026-01-01T00:00:00.000Z',
    match: 80,
    ...overrides,
  };
}

const noop = vi.fn();

describe('JobResultsSection', () => {
  it('mostra a mensagem de vazio quando nao ha vagas', () => {
    render(
      <JobResultsSection
        jobs={[]}
        tagFilter="all"
        onTagFilterChange={noop}
        emptyMessage="Nenhuma vaga por aqui."
        onGenerateCv={noop} onViewCv={noop} onLike={noop} onBlock={noop} onLikeSource={noop} onBlockSource={noop}
      />,
    );
    expect(screen.getByText('Nenhuma vaga por aqui.')).toBeInTheDocument();
  });

  it('mantem a barra de filtro visivel mesmo quando o filtro de tag zera os resultados', () => {
    // Bug corrigido: antes, ao filtrar por uma tag sem resultados, a barra de
    // filtro desaparecia junto com a mensagem de vazio, e o usuario ficava
    // sem jeito de voltar para "todos" sem resetar a busca inteira.
    const jobs = [
      makeJob({ id: '1', title: 'Dev React', skills: ['React'] }),
      makeJob({ id: '2', title: 'Dev Vue', skills: ['Vue'] }),
    ];
    render(
      <JobResultsSection
        jobs={jobs}
        tagFilter="Vue"
        onTagFilterChange={noop}
        onGenerateCv={noop} onViewCv={noop} onLike={noop} onBlock={noop} onLikeSource={noop} onBlockSource={noop}
      />,
    );
    // so a vaga com skill "Vue" deveria aparecer (a de skill "React" some do resultado)
    expect(screen.getByRole('heading', { name: 'Dev Vue' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Dev React' })).not.toBeInTheDocument();

    // a barra de filtro (botao "todos") continua visivel para o usuario poder voltar
    expect(screen.getByRole('button', { name: 'todos' })).toBeInTheDocument();
  });

  it('chama onTagFilterChange ao clicar num filtro de tag', async () => {
    const user = userEvent.setup();
    const onTagFilterChange = vi.fn();
    const jobs = [makeJob({ id: '1', skills: ['React'] }), makeJob({ id: '2', skills: ['Vue'] })];
    render(
      <JobResultsSection
        jobs={jobs}
        tagFilter="all"
        onTagFilterChange={onTagFilterChange}
        onGenerateCv={noop} onViewCv={noop} onLike={noop} onBlock={noop} onLikeSource={noop} onBlockSource={noop}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Vue' }));
    expect(onTagFilterChange).toHaveBeenCalledWith('Vue');
  });
});
