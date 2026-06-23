import {
  createRootRoute,
  createRoute,
  createRouter,
  lazyRouteComponent,
} from '@tanstack/react-router';
import RootLayout from '@src/RootLayout';
import NotFound from '@pages/NotFound';
import RoutePending from '@components/RoutePending';
import RouteError from '@components/RouteError';

const rootRoute = createRootRoute({ component: RootLayout, notFoundComponent: NotFound });

const watchRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  // Deep-link: `?ch=<id>` selects a channel on load (Task 16).
  validateSearch: (search: Record<string, unknown>): { ch?: string } => ({
    ch: typeof search.ch === 'string' ? search.ch : undefined,
  }),
  component: lazyRouteComponent(() => import('@pages/Watch')),
});

export const routeTree = rootRoute.addChildren([watchRoute]);

export const router = createRouter({
  routeTree,
  defaultPendingComponent: RoutePending,
  defaultErrorComponent: RouteError,
  defaultPendingMs: 0,
  defaultPendingMinMs: 0,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
