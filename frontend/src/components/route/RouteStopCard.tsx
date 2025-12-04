import type { Location } from '@/types';

interface RouteStopCardProps {
  stop: Location;
  index: number;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}

export default function RouteStopCard({
  stop,
  index,
  onRemove,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: RouteStopCardProps) {
  return (
    <div className="bg-white border border-forest-200 rounded-lg p-3 mb-2 group hover:border-forest-300 transition-colors">
      <div className="flex items-start gap-3">
        {/* Stop number */}
        <div className="flex-shrink-0 w-7 h-7 bg-burgundy-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
          {index + 1}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-forest-900 truncate">
            {stop.address.split(',')[0]}
          </p>
          <p className="text-xs text-forest-500 truncate">
            {stop.address.split(',').slice(1).join(',').trim()}
          </p>
          {stop.description && (
            <p className="text-xs text-forest-600 mt-1 line-clamp-2">
              {stop.description}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onMoveUp}
            disabled={isFirst}
            className="p-1 text-forest-500 hover:text-forest-700 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Move up"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
          <button
            onClick={onMoveDown}
            disabled={isLast}
            className="p-1 text-forest-500 hover:text-forest-700 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Move down"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <button
            onClick={onRemove}
            className="p-1 text-burgundy-500 hover:text-burgundy-700"
            title="Remove from route"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
