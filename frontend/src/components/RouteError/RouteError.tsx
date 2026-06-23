import type { ErrorComponentProps } from '@tanstack/react-router';
import { ErrorFallback } from '@components/ErrorBoundary';

/** Per-route error element for TanStack Router (router `defaultErrorComponent`). */
const RouteError = ({ reset }: ErrorComponentProps) => <ErrorFallback onReset={reset} />;

export default RouteError;
