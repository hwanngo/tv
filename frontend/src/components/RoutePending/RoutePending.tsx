import Spinner from '@components/Spinner';

/** Route-level Suspense fallback shown while a lazy route chunk loads. */
const RoutePending = () => (
  <div className="flex justify-center py-32">
    <Spinner size="lg" />
  </div>
);

export default RoutePending;
