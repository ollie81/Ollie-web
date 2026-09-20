import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

// Without this, any uncaught render/effect error anywhere in the tree
// unmounts the whole app -- React's default behavior since v16 -- which
// looks like a blank white page with zero feedback and no way back in
// short of a manual reload. This turns that into a recoverable screen.
// Class component because getDerivedStateFromError/componentDidCatch
// have no hook equivalent yet.
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: { componentStack: string }) {
    console.error('Uncaught render error:', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="page-shell" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'stretch', gap: 16, padding: '0 24px' }}>
        <div className="error-banner">Something went wrong. Reloading usually fixes it.</div>
        <button className="btn-pill" onClick={() => window.location.reload()}>
          Reload
        </button>
      </div>
    );
  }
}
