import { Link } from 'react-router-dom';
import type { Location } from '@/types';
import Badge from '../ui/Badge';

interface LocationPopupProps {
  location: Location;
}

export default function LocationPopup({ location }: LocationPopupProps) {
  const displayRating = location.averageRating
    ? location.averageRating.toFixed(1)
    : 'N/A';

  return (
    <div className="min-w-[280px] max-w-[320px]">
      {/* Image if available */}
      {location.photos && location.photos.length > 0 && (
        <div className="w-full h-40 overflow-hidden -mx-0 -mt-0 mb-3">
          <img
            src={location.photos[0]}
            alt={location.address}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Content */}
      <div className="p-3">
        {/* Status badge */}
        {location.status && (
          <Badge
            variant={location.status === 'active' ? 'forest' : 'burgundy'}
            className="mb-2"
          >
            {location.status}
          </Badge>
        )}

        {/* Address */}
        <h3 className="font-display font-semibold text-lg text-forest-900 mb-2">
          {location.address}
        </h3>

        {/* Description preview */}
        {location.description && (
          <p className="text-sm text-forest-600 mb-3 line-clamp-2">
            {location.description}
          </p>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 mb-3 text-sm">
          {/* Rating */}
          <div className="flex items-center gap-1">
            <svg
              className="w-4 h-4 text-gold-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="font-medium text-forest-700">{displayRating}</span>
          </div>

          {/* Feedback count */}
          {location.feedbackCount !== undefined && (
            <div className="flex items-center gap-1">
              <svg
                className="w-4 h-4 text-forest-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              </svg>
              <span className="text-forest-600">{location.feedbackCount} reviews</span>
            </div>
          )}
        </div>

        {/* View Details Link */}
        <Link
          to={`/location/${location.id}`}
          className="inline-block w-full text-center px-4 py-2 bg-burgundy-600 text-cream-50 rounded-lg font-medium hover:bg-burgundy-700 transition-colors"
        >
          View Details
        </Link>
      </div>
    </div>
  );
}
