import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  failed: boolean;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("NEXUS FIELD interface failure", error, info);
  }

  render() {
    if (this.state.failed) {
      return (
        <main className="fatal-error">
          <p className="eyebrow">SYSTEM INTERRUPTION</p>
          <h1>The interface could not continue.</h1>
          <p>Reload the page to restart the local session.</p>
          <button className="button button--primary" onClick={() => location.reload()}>
            RELOAD INTERFACE <span aria-hidden="true">↗</span>
          </button>
        </main>
      );
    }
    return this.props.children;
  }
}
