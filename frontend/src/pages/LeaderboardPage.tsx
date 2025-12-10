import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiService } from '@/services/api';
import type { LeaderboardEntry } from '@/types';

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
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiService.getLeaderboard();
        if (response.success && response.data) {
          setLeaderboard(response.data);
        } else {
          setError('Failed to load leaderboard');
        }
      } catch (err) {
        console.error('Failed to fetch leaderboard:', err);
        setError('Failed to load leaderboard. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-burgundy-600 mb-4"></div>
          <p className="text-forest-600">Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Page Header */}
      <div className="mb-8 text-center">
        <h1 className="font-display text-4xl font-bold text-forest-900 mb-2">
          Top Contributors
        </h1>
        <p className="text-forest-600">
          Celebrating the community members who help families find Christmas magic
        </p>
      </div>

      {/* Stats Summary */}
      <div className="bg-gradient-to-r from-burgundy-50 to-gold-50 rounded-lg p-6 mb-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-3xl font-bold text-forest-900">
              {leaderboard.length}
            </div>
            <div className="text-sm text-forest-600">Contributors</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-forest-900">
              {leaderboard.reduce((sum, e) => sum + e.approvedSubmissions, 0)}
            </div>
            <div className="text-sm text-forest-600">Total Submissions</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-forest-900">
              {leaderboard.filter((e) => e.badge?.type === 'expert').length}
            </div>
            <div className="text-sm text-forest-600">Expert Contributors</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-forest-900">
              {leaderboard[0]?.approvedSubmissions || 0}
            </div>
            <div className="text-sm text-forest-600">Top Score</div>
          </div>
        </div>
      </div>

      {/* Leaderboard Table */}
      {leaderboard.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-md">
          <svg
            className="w-16 h-16 mx-auto text-forest-300 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
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
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Table Header */}
          <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-4 bg-forest-50 border-b border-forest-200 text-sm font-medium text-forest-700">
            <div className="col-span-1 text-center">Rank</div>
            <div className="col-span-4">Contributor</div>
            <div className="col-span-3 text-center">Badge</div>
            <div className="col-span-2 text-center">Submissions</div>
            <div className="col-span-2 text-center">Member Since</div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-forest-100">
            {leaderboard.map((entry) => (
              <div
                key={entry.userId}
                className={`grid grid-cols-1 md:grid-cols-12 gap-4 px-6 py-4 items-center transition-colors hover:bg-cream-50 ${
                  entry.rank <= 3 ? 'bg-cream-50/50' : ''
                }`}
              >
                {/* Rank */}
                <div className="col-span-1 flex justify-center md:justify-center">
                  <div
                    className={`w-10 h-10 rounded-full border-2 flex items-center justify-center ${getRankStyle(
                      entry.rank
                    )}`}
                  >
                    {getRankIcon(entry.rank)}
                  </div>
                </div>

                {/* Username */}
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

                {/* Badge */}
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

                {/* Submissions Count */}
                <div className="col-span-2 text-center hidden md:block">
                  <span className="text-xl font-bold text-burgundy-600">
                    {entry.approvedSubmissions}
                  </span>
                </div>

                {/* Join Date */}
                <div className="col-span-2 text-center text-sm text-forest-600 hidden md:block">
                  {formatJoinDate(entry.joinDate)}
                </div>
              </div>
            ))}
          </div>
        </div>
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
