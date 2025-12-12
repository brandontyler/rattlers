import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiService } from '@/services/api';
import type { SavedRoute } from '@/types';
import { LoadingSpinner } from '@/components/ui';

type SortType = 'popular' | 'new';

export default function RoutesPage() {
  const [activeSort, setActiveSort] = useState<SortType>('popular');
  const [routes, setRoutes] = useState<SavedRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRoutes = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiService.getRoutes(activeSort);
        if (response.success && response.data) {
          setRoutes(response.data);
        } else {
          setError('Failed to load routes');
        }
      } catch (err) {
        console.error('Failed to fetch routes:', err);
        setError('Failed to load routes. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchRoutes();
  }, [activeSort]);

  const UserAvatar = ({ username }: { username: string }) => (
    <div className="w-8 h-8 rounded-full bg-forest-100 flex items-center justify-center text-forest-600 font-semibold text-sm">
      {username.charAt(0).toUpperCase()}
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* Page Header */}
      <div className="mb-6 text-center">
        <h1 className="font-display text-4xl font-bold text-forest-900 mb-2">
          Community Routes
        </h1>
        <p className="text-forest-600">
          Discover amazing Christmas light routes created by the community
        </p>
      </div>

      {/* Sort Tabs */}
      <div className="flex justify-center mb-6">
        <div className="inline-flex bg-forest-100 rounded-lg p-1">
          <button
            onClick={() => setActiveSort('popular')}
            className={`px-6 py-2 rounded-md font-medium transition-colors ${
              activeSort === 'popular'
                ? 'bg-white text-forest-900 shadow-sm'
                : 'text-forest-600 hover:text-forest-900'
            }`}
          >
            Popular
          </button>
          <button
            onClick={() => setActiveSort('new')}
            className={`px-6 py-2 rounded-md font-medium transition-colors ${
              activeSort === 'new'
                ? 'bg-white text-forest-900 shadow-sm'
                : 'text-forest-600 hover:text-forest-900'
            }`}
          >
            Newest
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          {error}
        </div>
      ) : routes.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-md">
          <div className="text-6xl mb-4">🎄</div>
          <p className="text-forest-600 mb-2">No routes yet</p>
          <p className="text-sm text-forest-500 mb-4">
            Be the first to create and share a route!
          </p>
          <Link
            to="/"
            className="inline-block px-6 py-2 bg-burgundy-600 text-white rounded-lg font-medium hover:bg-burgundy-700 transition-colors"
          >
            Create a Route
          </Link>
        </div>
      ) : (
        <>
          {/* Stats Summary */}
          <div className="bg-gradient-to-r from-burgundy-50 to-gold-50 rounded-lg p-6 mb-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-3xl font-bold text-forest-900">{routes.length}</div>
                <div className="text-sm text-forest-600">Routes</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-forest-900">
                  {routes.reduce((sum, r) => sum + r.stopCount, 0)}
                </div>
                <div className="text-sm text-forest-600">Total Stops</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-forest-900">
                  {routes.reduce((sum, r) => sum + r.likeCount, 0)}
                </div>
                <div className="text-sm text-forest-600">Total Likes</div>
              </div>
            </div>
          </div>

          {/* Routes List */}
          <div className="space-y-4">
            {routes.map((route, index) => (
              <Link
                key={route.id}
                to={`/routes/${route.id}`}
                className={`block bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-all hover:-translate-y-0.5 ${
                  index < 3 && activeSort === 'popular' ? 'ring-2 ring-gold-200' : ''
                }`}
              >
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    {/* Rank (for popular sort) */}
                    {activeSort === 'popular' && (
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-bold ${
                        index === 0 ? 'bg-gold-100 text-gold-800' :
                        index === 1 ? 'bg-gray-100 text-gray-700' :
                        index === 2 ? 'bg-amber-100 text-amber-800' :
                        'bg-forest-50 text-forest-700'
                      }`}>
                        {index + 1}
                      </div>
                    )}

                    {/* Main content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-display text-xl font-semibold text-forest-900 mb-1">
                            {route.title}
                          </h3>
                          {route.description && (
                            <p className="text-sm text-forest-600 line-clamp-2 mb-2">
                              {route.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Stats row */}
                      <div className="flex items-center gap-4 text-sm text-forest-600 mb-3">
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          </svg>
                          {route.stopCount} stops
                        </span>
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          ~{route.estimatedMinutes} min
                        </span>
                        {route.totalMiles > 0 && (
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                            </svg>
                            {route.totalMiles} mi
                          </span>
                        )}
                      </div>

                      {/* Tags */}
                      {route.tags && route.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {route.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 rounded-full bg-forest-100 text-forest-700 text-xs"
                            >
                              {tag}
                            </span>
                          ))}
                          {route.tags.length > 3 && (
                            <span className="px-2 py-0.5 text-forest-500 text-xs">
                              +{route.tags.length - 3} more
                            </span>
                          )}
                        </div>
                      )}

                      {/* Footer */}
                      <div className="flex items-center justify-between">
                        {/* Creator */}
                        {route.createdByUsername && (
                          <div className="flex items-center gap-2 text-sm text-forest-500">
                            <UserAvatar username={route.createdByUsername} />
                            <span>{route.createdByUsername}</span>
                          </div>
                        )}

                        {/* Engagement stats */}
                        <div className="flex items-center gap-4 text-sm">
                          <span className="flex items-center gap-1 text-burgundy-600 font-medium">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                            </svg>
                            {route.likeCount}
                          </span>
                          <span className="flex items-center gap-1 text-forest-600">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                            </svg>
                            {route.saveCount}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      {/* Call to Action */}
      <div className="mt-8 text-center">
        <div className="bg-gradient-to-r from-burgundy-500 to-burgundy-700 rounded-lg p-6 text-cream-50">
          <h2 className="font-display text-2xl font-semibold mb-2">
            Create Your Own Route!
          </h2>
          <p className="mb-4 text-cream-100">
            Plan your perfect Christmas lights tour and share it with the community.
          </p>
          <Link
            to="/"
            className="inline-block px-6 py-3 bg-gold-500 text-forest-900 rounded-lg font-semibold hover:bg-gold-400 transition-colors"
          >
            Start Planning
          </Link>
        </div>
      </div>
    </div>
  );
}
