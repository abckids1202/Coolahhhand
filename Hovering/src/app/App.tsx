import { ErrorBoundary } from "../components/common/ErrorBoundary";
import { AppShell } from "./AppShell";

export const App = () => (
  <ErrorBoundary>
    <AppShell />
  </ErrorBoundary>
);
