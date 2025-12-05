import { useRoute } from '@/contexts/RouteContext';
import type { Location } from '@/types';

interface AddToRouteButtonProps {
  location: Location;
  variant?: 'default' | 'compact' | 'icon';
  className?: string;
}

export default function AddToRouteButton({
  location,
  variant = 'default',
  className = '',
}: AddToRouteButtonProps) {
  const { addStop, removeStop, isInRoute, stops } = useRoute();

  const inRoute = isInRoute(location.id);
  const stopNumber = inRoute
    ? stops.findIndex((s) => s.id === location.id) + 1
    : null;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (inRoute) {
      removeStop(location.id);
    } else {
      addStop(location);
    }
  };

  if (variant === 'icon') {
    return (
      <button
        onClick={handleClick}
        className={`p-2 rounded-full transition-all ${
          inRoute
            ? 'bg-burgundy-600 text-white hover:bg-burgundy-700'
            : 'bg-forest-100 text-forest-600 hover:bg-forest-200'
        } ${className}`}
        title={inRoute ? 'Remove from route' : 'Add to route'}
      >
        {inRoute ? (
          <span className="flex items-center justify-center w-5 h-5 text-xs font-bold">
            {stopNumber}
          </span>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
        )}
      </button>
    );
  }

  if (variant === 'compact') {
    return (
      <button
        onClick={handleClick}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
          inRoute
            ? 'bg-burgundy-600 text-white hover:bg-burgundy-700'
            : 'bg-forest-100 text-forest-700 hover:bg-forest-200'
        } ${className}`}
      >
        {inRoute ? (
          <>
            <span className="flex items-center justify-center w-5 h-5 bg-white text-burgundy-600 rounded-full text-xs font-bold">
              {stopNumber}
            </span>
            <span>In Route</span>
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            <span>Add to Route</span>
          </>
        )}
      </button>
    );
  }

  // Default variant
  return (
    <button
      onClick={handleClick}
      className={`inline-flex items-center gap-2 px-4 py-2 font-medium rounded-lg transition-all ${
        inRoute
          ? 'bg-burgundy-600 text-white hover:bg-burgundy-700'
          : 'bg-forest-100 text-forest-700 hover:bg-forest-200 border border-forest-200'
      } ${className}`}
    >
      {inRoute ? (
        <>
          <span className="flex items-center justify-center w-6 h-6 bg-white text-burgundy-600 rounded-full text-sm font-bold">
            {stopNumber}
          </span>
          <span>Stop #{stopNumber} in Route</span>
          <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </>
      ) : (
        <>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
            />
          </svg>
          <span>Add to Route</span>
        </>
      )}
    </button>
  );
}
