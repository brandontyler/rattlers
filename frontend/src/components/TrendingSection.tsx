import { Link } from 'react-router-dom';
import { useTrendingLocations } from '@/hooks';
import { Card, Badge } from '@/components/ui';
import { CHECK_IN_STATUS_LABELS } from '@/types';
import type { TrendingLocation } from '@/types';

/**
 * Format relative time (e.g., "2 hours ago", "3 days ago")
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 60) {
    return diffMins <= 1 ? 'just now' : `${diffMins}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays === 1) {
    return 'yesterday';
  } else {
    return `${diffDays}d ago`;
  }
}

/**
 * Individual trending location card
 */
function TrendingCard({ location, rank }: { location: TrendingLocation; rank: number }) {
  const statusInfo = location.latestCheckInStatus
    ? CHECK_IN_STATUS_LABELS[location.latestCheckInStatus]
    : null;

  // Get the first photo URL or placeholder
  const photoUrl = location.photos?.[0]
    ? `${import.meta.env.VITE_PHOTOS_CDN_URL}/${location.photos[0]}`
    : null;

  return (
    <Link
      to={`/location/${location.id}`}
      className="block group"
    >
      <Card className="h-full transition-all duration-300 hover:shadow-lg hover:-translate-y-1 relative overflow-hidden" padding="none">
        {/* Rank badge */}
        <div className="absolute top-3 left-3 z-10">
          <div className={`
            w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-lg
            ${rank === 1 ? 'bg-gold-500 text-white' : ''}
            ${rank === 2 ? 'bg-gray-300 text-gray-700' : ''}
            ${rank === 3 ? 'bg-amber-600 text-white' : ''}
            ${rank > 3 ? 'bg-burgundy-600 text-white' : ''}
          `}>
            {rank}
          </div>
        </div>

        {/* Hot badge */}
        <div className="absolute top-3 right-3 z-10">
          <Badge variant="burgundy" className="flex items-center gap-1 shadow-lg">
            <span className="text-sm">🔥</span>
            <span className="text-xs font-semibold">HOT</span>
          </Badge>
        </div>

        {/* Photo or placeholder */}
        <div className="h-32 bg-gradient-to-br from-burgundy-100 to-forest-100 relative">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={location.address}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl opacity-50">
              🎄
            </div>
          )}
          {/* Gradient overlay for readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Address */}
          <h3 className="font-medium text-forest-900 text-sm line-clamp-1 group-hover:text-burgundy-600 transition-colors">
            {location.address}
          </h3>

          {/* Stats row */}
          <div className="flex items-center gap-3 mt-2 text-xs text-forest-600">
            {/* Check-in status */}
            {statusInfo && (
              <span className="flex items-center gap-1">
                <span>{statusInfo.icon}</span>
                <span>{statusInfo.label}</span>
              </span>
            )}

            {/* Recent activity */}
            {location.latestCheckInAt && (
              <span className="text-forest-400">
                {formatRelativeTime(location.latestCheckInAt)}
              </span>
            )}
          </div>

          {/* Activity indicator */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-cream-200">
            <span className="text-xs text-forest-500">
              {location.recentCheckInCount} check-in{location.recentCheckInCount !== 1 ? 's' : ''} this week
            </span>
            <span className="text-xs text-burgundy-600 font-medium">
              View →
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}

/**
 * Empty state when no trending locations
 */
function EmptyState() {
  return (
    <Card className="text-center py-12">
      <div className="text-5xl mb-4">🔥</div>
      <h3 className="font-display text-xl font-semibold text-forest-900 mb-2">
        No trending spots yet
      </h3>
      <p className="text-forest-600 max-w-md mx-auto">
        Be the first to check in at a location this week! Your check-ins help others discover the best displays.
      </p>
      <Link
        to="/"
        className="inline-block mt-4 text-burgundy-600 hover:text-burgundy-700 font-medium"
      >
        Explore the map →
      </Link>
    </Card>
  );
}

/**
 * Loading skeleton
 */
function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} padding="none" className="animate-pulse">
          <div className="h-32 bg-cream-200" />
          <div className="p-4 space-y-3">
            <div className="h-4 bg-cream-200 rounded w-3/4" />
            <div className="h-3 bg-cream-200 rounded w-1/2" />
            <div className="h-3 bg-cream-200 rounded w-1/3 mt-3" />
          </div>
        </Card>
      ))}
    </div>
  );
}

/**
 * Trending locations section for the home page
 */
export default function TrendingSection() {
  const { data: trendingLocations = [], isLoading, isError } = useTrendingLocations(8, 7);

  // Don't show section if loading failed
  if (isError) {
    return null;
  }

  return (
    <section className="py-12 bg-white">
      <div className="container mx-auto px-4">
        {/* Section header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">🔥</span>
              <h2 className="font-display text-2xl md:text-3xl font-bold text-forest-900">
                Trending This Week
              </h2>
            </div>
            <p className="text-forest-600">
              The most active displays based on community check-ins
            </p>
          </div>

          {/* View all link when there are results */}
          {trendingLocations.length > 0 && (
            <Link
              to="/leaderboard"
              className="hidden sm:flex items-center gap-1 text-burgundy-600 hover:text-burgundy-700 font-medium text-sm"
            >
              View Leaderboard
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          )}
        </div>

        {/* Content */}
        {isLoading ? (
          <LoadingSkeleton />
        ) : trendingLocations.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {trendingLocations.map((location, index) => (
              <TrendingCard
                key={location.id}
                location={location}
                rank={index + 1}
              />
            ))}
          </div>
        )}

        {/* Mobile view all link */}
        {trendingLocations.length > 0 && (
          <div className="mt-6 text-center sm:hidden">
            <Link
              to="/leaderboard"
              className="inline-flex items-center gap-1 text-burgundy-600 hover:text-burgundy-700 font-medium"
            >
              View Leaderboard
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
