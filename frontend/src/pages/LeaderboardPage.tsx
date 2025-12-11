import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiService } from '@/services/api';
import type { LeaderboardEntry, LocationLeaderboardEntry } from '@/types';

type TabType = 'contributors' | 'locations';

const BADGE_STYLES = {
  'first-light': {
    bgClass: 'bg-gradient-to-br from-gold-400 to-gold-600',
    textClass: 'text-gold-900',
  },
  scout: {
    bgClass: 'bg-gradient-to-br from-forest-500 to-forest-700',
    textClass: 'text-cream-50',
  },
  enthusiast: {
    bgClass: 'bg-gradient-to-br from-burgundy-500 to-burgundy-700',
    textClass: 'text-cream-50',
  },
  expert: {
    bgClass: 'bg-gradient-to-br from-gold-500 to-gold-700',
    textClass: 'text-gold-900',
  },
};

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState<TabType>('contributors');
  const [contributors, setContributors] = useState<LeaderboardEntry[]>([]);
  const [locations, setLocations] = useState<LocationLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        if (activeTab === 'contributors') {
          const response = await apiService.getLeaderboard();
          if (response.success && response.data) {
            setContributors(response.data);
          } else {
            setError('Failed to load leaderboard');
          }
        } else {
          const response = await apiService.getLocationsLeaderboard();
          if (response.success && response.data) {
            setLocations(response.data);
          } else {
            setError('Failed to load leaderboard');
          }
        }
      } catch (err) {
        console.error('Failed to fetch leaderboard:', err);
        setError('Failed to load leaderboard. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeTab]);

  const formatJoinDate = (dateString: string | null) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    });
  };

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gold-100 text-gold-800 border-gold-300';
      case 2:
        return 'bg-gray-100 text-gray-700 border-gray-300';
      case 3:
        return 'bg-amber-100 text-amber-800 border-amber-300';
      default:
        return 'bg-forest-50 text-forest-700 border-forest-200';
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) {
      return (
        <svg className="w-6 h-6 text-gold-500" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M5 2a2 2 0 00-2 2v14l3.5-2 3.5 2 3.5-2 3.5 2V4a2 2 0 00-2-2H5zm4.707 3.707a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L8.414 9H10a3 3 0 013 3v1a1 1 0 102 0v-1a5 5 0 00-5-5H8.414l1.293-1.293z"
            clipRule="evenodd"
          />
        </svg>
      );
    }
    return <span className="font-bold text-lg">{rank}</span>;
  };

  const UserAvatar = ({ username }: { username: string }) => (
    <div className="w-8 h-8 rounded-full bg-forest-100 flex items-center justify-center text-forest-600 font-semibold text-sm">
      {username.charAt(0).toUpperCase()}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Page Header */}
      <div className="mb-6 text-center">
        <h1 className="font-display text-4xl font-bold text-forest-900 mb-2">
          Leaderboards
        </h1>
        <p className="text-forest-600">
          Celebrating the community members who help families find Christmas magic
        </p>
      </div>

      {/* Tab Switcher */}
      <div className="flex justify-center mb-6">
        <div className="inline-flex bg-forest-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('contributors')}
            className={`px-6 py-2 rounded-md font-medium transition-colors ${
              activeTab === 'contributors'
                ? 'bg-white text-forest-900 shadow-sm'
                : 'text-forest-600 hover:text-forest-900'
            }`}
          >
            🏆 Contributors
          </button>
          <button
            onClick={() => setActiveTab('locations')}
            className={`px-6 py-2 rounded-md font-medium transition-colors ${
              activeTab === 'locations'
                ? 'bg-white text-forest-900 shadow-sm'
                : 'text-forest-600 hover:text-forest-900'
            }`}
          >
            ❤️ Most Loved
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-burgundy-600 mb-4"></div>
            <p className="text-forest-600">Loading leaderboard...</p>
          </div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          {error}
        </div>
      ) : activeTab === 'contributors' ? (
        <ContributorsLeaderboard
          contributors={contributors}
          getRankStyle={getRankStyle}
          getRankIcon={getRankIcon}
          formatJoinDate={formatJoinDate}
        />
      ) : (
        <LocationsLeaderboard
          locations={locations}
          getRankStyle={getRankStyle}
          getRankIcon={getRankIcon}
          UserAvatar={UserAvatar}
        />
      )}

      {/* Call to Action */}
      <div className="mt-8 text-center">
        <div className="bg-gradient-to-r from-burgundy-500 to-burgundy-700 rounded-lg p-6 text-cream-50">
          <h2 className="font-display text-2xl font-semibold mb-2">
            Join the Leaderboard!
          </h2>
          <p className="mb-4 text-cream-100">
            Submit Christmas light displays to earn badges and help families find holiday magic.
          </p>
          <Link
            to="/submit"
            className="inline-block px-6 py-3 bg-gold-500 text-forest-900 rounded-lg font-semibold hover:bg-gold-400 transition-colors"
          >
            Submit a Location
          </Link>
        </div>
      </div>
    </div>
  );
}

// Contributors Leaderboard Component
function ContributorsLeaderboard({
  contributors,
  getRankStyle,
  getRankIcon,
  formatJoinDate,
}: {
  contributors: LeaderboardEntry[];
  getRankStyle: (rank: number) => string;
  getRankIcon: (rank: number) => React.ReactNode;
  formatJoinDate: (date: string | null) => string;
}) {
  if (contributors.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg shadow-md">
        <p className="text-forest-600 mb-2">No contributors yet</p>
        <p className="text-sm text-forest-500 mb-4">
          Be the first to submit a Christmas light display!
        </p>
        <Link
          to="/submit"
          className="inline-block px-6 py-2 bg-burgundy-600 text-cream-50 rounded-lg font-medium hover:bg-burgundy-700 transition-colors"
        >
          Submit a Location
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* Stats Summary */}
      <div className="bg-gradient-to-r from-burgundy-50 to-gold-50 rounded-lg p-6 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-3xl font-bold text-forest-900">{contributors.length}</div>
            <div className="text-sm text-forest-600">Contributors</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-forest-900">
              {contributors.reduce((sum, e) => sum + e.approvedSubmissions, 0)}
            </div>
            <div className="text-sm text-forest-600">Total Submissions</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-forest-900">
              {contributors.filter((e) => e.badge?.type === 'expert').length}
            </div>
            <div className="text-sm text-forest-600">Expert Contributors</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-forest-900">
              {contributors[0]?.approvedSubmissions || 0}
            </div>
            <div className="text-sm text-forest-600">Top Score</div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-4 bg-forest-50 border-b border-forest-200 text-sm font-medium text-forest-700">
          <div className="col-span-1 text-center">Rank</div>
          <div className="col-span-4">Contributor</div>
          <div className="col-span-3 text-center">Badge</div>
          <div className="col-span-2 text-center">Submissions</div>
          <div className="col-span-2 text-center">Member Since</div>
        </div>

        <div className="divide-y divide-forest-100">
          {contributors.map((entry) => (
            <div
              key={entry.userId}
              className={`grid grid-cols-1 md:grid-cols-12 gap-4 px-6 py-4 items-center transition-colors hover:bg-cream-50 ${
                entry.rank <= 3 ? 'bg-cream-50/50' : ''
              }`}
            >
              <div className="col-span-1 flex justify-center">
                <div
                  className={`w-10 h-10 rounded-full border-2 flex items-center justify-center ${getRankStyle(
                    entry.rank
                  )}`}
                >
                  {getRankIcon(entry.rank)}
                </div>
              </div>

              <div className="col-span-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-forest-100 flex items-center justify-center text-forest-600 font-semibold">
                  {entry.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold text-forest-900">{entry.username}</div>
                  <div className="text-xs text-forest-500 md:hidden">
                    {entry.approvedSubmissions} submissions
                  </div>
                </div>
              </div>

              <div className="col-span-3 flex justify-center">
                {entry.badge ? (
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      BADGE_STYLES[entry.badge.type].bgClass
                    } ${BADGE_STYLES[entry.badge.type].textClass}`}
                  >
                    {entry.badge.label}
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-500">
                    No Badge
                  </span>
                )}
              </div>

              <div className="col-span-2 text-center hidden md:block">
                <span className="text-xl font-bold text-burgundy-600">
                  {entry.approvedSubmissions}
                </span>
              </div>

              <div className="col-span-2 text-center text-sm text-forest-600 hidden md:block">
                {formatJoinDate(entry.joinDate)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// Locations Leaderboard Component
function LocationsLeaderboard({
  locations,
  getRankStyle,
  getRankIcon,
  UserAvatar,
}: {
  locations: LocationLeaderboardEntry[];
  getRankStyle: (rank: number) => string;
  getRankIcon: (rank: number) => React.ReactNode;
  UserAvatar: React.FC<{ username: string }>;
}) {
  if (locations.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg shadow-md">
        <p className="text-forest-600 mb-2">No locations yet</p>
        <p className="text-sm text-forest-500 mb-4">
          Be the first to submit a Christmas light display!
        </p>
        <Link
          to="/submit"
          className="inline-block px-6 py-2 bg-burgundy-600 text-cream-50 rounded-lg font-medium hover:bg-burgundy-700 transition-colors"
        >
          Submit a Location
        </Link>
      </div>
    );
  }

  const totalLikes = locations.reduce((sum, loc) => sum + loc.likeCount, 0);

  return (
    <>
      {/* Stats Summary */}
      <div className="bg-gradient-to-r from-burgundy-50 to-gold-50 rounded-lg p-6 mb-6">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-3xl font-bold text-forest-900">{locations.length}</div>
            <div className="text-sm text-forest-600">Locations</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-forest-900">{totalLikes}</div>
            <div className="text-sm text-forest-600">Total Likes</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-forest-900">
              {locations[0]?.likeCount || 0}
            </div>
            <div className="text-sm text-forest-600">Top Likes</div>
          </div>
        </div>
      </div>

      {/* Locations List */}
      <div className="space-y-4">
        {locations.map((location) => (
          <Link
            key={location.locationId}
            to={`/location/${location.locationId}`}
            className={`block bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow ${
              location.rank <= 3 ? 'ring-2 ring-gold-200' : ''
            }`}
          >
            <div className="flex">
              {/* Photo */}
              <div className="w-24 h-24 md:w-32 md:h-32 flex-shrink-0 bg-forest-100">
                {location.photos[0] ? (
                  <img
                    src={location.photos[0]}
                    alt={location.address}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-forest-400">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-start gap-3">
                    {/* Rank Badge */}
                    <div
                      className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${getRankStyle(
                        location.rank
                      )}`}
                    >
                      {getRankIcon(location.rank)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-forest-900 truncate">
                        {location.address}
                      </h3>
                      <p className="text-sm text-forest-600 line-clamp-2">
                        {location.aiDescription || location.description}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between mt-2">
                  {/* Submitted by */}
                  {location.createdByUsername && (
                    <div className="flex items-center gap-2 text-sm text-forest-500">
                      <UserAvatar username={location.createdByUsername} />
                      <span>{location.createdByUsername}</span>
                    </div>
                  )}

                  {/* Like count */}
                  <div className="flex items-center gap-1 text-burgundy-600 font-semibold">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>{location.likeCount}</span>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
