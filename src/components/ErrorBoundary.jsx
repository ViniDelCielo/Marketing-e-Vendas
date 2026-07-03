import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, background: '#fee2e2', color: '#991b1b', borderRadius: 8, margin: 20, border: '1px solid #f87171' }}>
          <h2>Algo deu errado ao carregar este painel.</h2>
          <details style={{ whiteSpace: 'pre-wrap', marginTop: 10, fontSize: '0.85rem' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>Saiba mais (Erro Técnico)</summary>
            <br />
            {this.state.error && this.state.error.toString()}
            <br /><br />
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
