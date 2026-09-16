import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthModal } from './AuthModal';
import * as authService from '../services/auth';

function noop() {}

describe('AuthModal', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(authService, 'saveToken').mockImplementation(noop);
  });

  it('abre no modo entrar quando nao ha linkedInData nem resetToken', () => {
    render(<AuthModal open linkedInData={null} onSuccess={noop} onClose={noop} />);
    expect(screen.getByText('entrar', { selector: '.auth-title' })).toBeInTheDocument();
  });

  it('abre direto no modo nova senha quando resetToken esta presente', () => {
    render(<AuthModal open linkedInData={null} resetToken="token-123" onSuccess={noop} onClose={noop} />);
    expect(screen.getByText('nova senha', { selector: '.auth-title' })).toBeInTheDocument();
    // no modo reset nao ha campo de e-mail
    expect(screen.queryByPlaceholderText('seu@email.com')).not.toBeInTheDocument();
  });

  it('avisa que a conta nao existe ao sair do campo de e-mail no modo entrar', async () => {
    const user = userEvent.setup();
    vi.spyOn(authService, 'checkEmailExists').mockResolvedValue(false);
    render(<AuthModal open linkedInData={null} onSuccess={noop} onClose={noop} />);

    await user.type(screen.getByPlaceholderText('seu@email.com'), 'naoexiste@example.com');
    await user.tab(); // dispara onBlur

    await waitFor(() => {
      expect(screen.getByText(/Não encontramos conta com esse e-mail/)).toBeInTheDocument();
    });
  });

  it('fluxo completo de recuperacao de senha: pedir link', async () => {
    const user = userEvent.setup();
    vi.spyOn(authService, 'requestPasswordReset').mockResolvedValue(undefined);
    render(<AuthModal open linkedInData={null} onSuccess={noop} onClose={noop} />);

    await user.click(screen.getByText('esqueci minha senha'));
    expect(screen.getByText('recuperar senha', { selector: '.auth-title' })).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('seu@email.com'), 'user@example.com');
    await user.click(screen.getByRole('button', { name: 'enviar link' }));

    await waitFor(() => {
      expect(screen.getByText(/enviamos um link de redefinição/)).toBeInTheDocument();
    });
    expect(authService.requestPasswordReset).toHaveBeenCalledWith('user@example.com');
  });

  it('reset de senha: rejeita quando as senhas nao coincidem', async () => {
    const user = userEvent.setup();
    const resetSpy = vi.spyOn(authService, 'resetPassword');
    render(<AuthModal open linkedInData={null} resetToken="token-123" onSuccess={noop} onClose={noop} />);

    await user.type(screen.getByPlaceholderText('mínimo 6 caracteres'), 'novaSenha123');
    await user.type(screen.getByPlaceholderText('repita a nova senha'), 'outraSenha456');
    await user.click(screen.getByRole('button', { name: 'redefinir senha' }));

    expect(await screen.findByText('As senhas não coincidem.')).toBeInTheDocument();
    expect(resetSpy).not.toHaveBeenCalled();
  });

  it('reset de senha: sucesso volta para o modo entrar com mensagem de sucesso', async () => {
    const user = userEvent.setup();
    vi.spyOn(authService, 'resetPassword').mockResolvedValue(undefined);
    render(<AuthModal open linkedInData={null} resetToken="token-123" onSuccess={noop} onClose={noop} />);

    await user.type(screen.getByPlaceholderText('mínimo 6 caracteres'), 'novaSenha123');
    await user.type(screen.getByPlaceholderText('repita a nova senha'), 'novaSenha123');
    await user.click(screen.getByRole('button', { name: 'redefinir senha' }));

    await waitFor(() => {
      expect(screen.getByText('entrar', { selector: '.auth-title' })).toBeInTheDocument();
    });
    expect(screen.getByText(/Senha redefinida com sucesso/)).toBeInTheDocument();
    expect(authService.resetPassword).toHaveBeenCalledWith('token-123', 'novaSenha123');
  });

  it('login com sucesso chama onSuccess com o usuario retornado', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    const fakeUser = { id: '1', email: 'user@example.com', name: 'Fulano', github_username: null };
    vi.spyOn(authService, 'login').mockResolvedValue({ token: 'jwt-token', user: fakeUser });
    render(<AuthModal open linkedInData={null} onSuccess={onSuccess} onClose={noop} />);

    await user.type(screen.getByPlaceholderText('seu@email.com'), 'user@example.com');
    await user.type(screen.getByPlaceholderText('••••••••'), 'senha123456');
    await user.click(screen.getByRole('button', { name: 'entrar' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(fakeUser, undefined));
    expect(authService.saveToken).toHaveBeenCalledWith('jwt-token');
  });

  it('login com falha mostra a mensagem de erro do servico', async () => {
    const user = userEvent.setup();
    vi.spyOn(authService, 'login').mockRejectedValue(new Error('E-mail ou senha incorretos'));
    render(<AuthModal open linkedInData={null} onSuccess={noop} onClose={noop} />);

    await user.type(screen.getByPlaceholderText('seu@email.com'), 'user@example.com');
    await user.type(screen.getByPlaceholderText('••••••••'), 'senhaerrada');
    await user.click(screen.getByRole('button', { name: 'entrar' }));

    expect(await screen.findByText('E-mail ou senha incorretos')).toBeInTheDocument();
  });
});
