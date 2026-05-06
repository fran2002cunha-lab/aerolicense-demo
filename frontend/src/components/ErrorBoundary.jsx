import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, textAlign: 'center', color: '#E74C3C' }}>
          <h2>Algo correu mal</h2>
          <p style={{ color: '#AABBCC', fontSize: 14, marginTop: 8 }}>
            {this.state.error?.message || 'Erro desconhecido'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{ marginTop: 16, padding: '8px 20px', background: '#0087CC',
              border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer' }}
          >
            Tentar novamente
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
