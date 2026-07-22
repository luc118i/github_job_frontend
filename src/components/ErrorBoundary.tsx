import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Rótulo da área protegida, usado na mensagem de erro. */
  area?: string;
  /** Callback opcional para voltar a um estado seguro (ex.: ir pra Home). */
  onReset?: () => void;
}

interface State {
  error: Error | null;
}

/**
 * Captura erros de render dos filhos e mostra um fallback em vez de
 * apagar o app inteiro (tela preta). Sem isso, qualquer throw em um
 * componente derruba toda a árvore React.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', this.props.area ?? '', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.error) {
      return (
        <div className="err-boundary">
          <div className="err-boundary-card">
            <svg className="err-boundary-icon" width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M14 3l12 21H2L14 3z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
              <path d="M14 11v6M14 20.5v.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            <h2 className="err-boundary-title">Algo deu errado nesta área</h2>
            <p className="err-boundary-msg">
              {this.props.area ? `Falha ao carregar "${this.props.area}". ` : ''}
              Tente voltar ao início. Se persistir, recarregue a página.
            </p>
            <pre className="err-boundary-detail">{this.state.error.message}</pre>
            <button className="err-boundary-btn" onClick={this.handleReset}>
              Voltar ao início
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
