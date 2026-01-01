import { useState, useEffect } from 'react';
import { CheckIn, CheckInStatus as CheckInStatusType, CHECK_IN_STATUS_LABELS, LocationCheckInSummary } from '@/types';
import { apiService } from '@/services/api';

interface CheckInStatusProps {
  locationId: string;
  /** Compact mode for cards/popups */
  compact?: boolean;
  /** Callback when check-in button is clicked */
  onCheckInClick?: () => void;
  /** Whether user is authenticated */
  isAuthenticated?: boolean;
}

/**
 * Formats a relative time string like "2 hours ago" or "just now"
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
}

export default function CheckInStatus({
  locationId,
  compact = false,
  onCheckInClick,
  isAuthenticated = false,
}: CheckInStatusProps) {
  const [summary, setSummary] = useState<LocationCheckInSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCheckIns = async () => {
      try {
        setLoading(true);
        const response = await apiService.getCheckIns(locationId, compact ? 1 : 5);
        if (response.success && response.data) {
          setSummary(response.data);
        }
      } catch (err) {
        console.error('Error fetching check-ins:', err);
        setError('Failed to load check-ins');
      } finally {
        setLoading(false);
      }
    };

    fetchCheckIns();
  }, [locationId, compact]);

  if (loading) {
    return compact ? null : (
      <div className="text-sm text-forest-400 animate-pulse">
        Loading check-ins...
      </div>
    );
  }

  if (error || !summary) {
    return null;
  }

  const { latestCheckIn, recentCheckIns, checkInCount } = summary;

  // Compact mode - just show the latest check-in status
  if (compact) {
    if (!latestCheckIn) {
      return (
        <div className="flex items-center gap-2 text-sm text-forest-500">
          <span className="text-lg">📍</span>
          <span>No check-ins yet</span>
          {isAuthenticated && onCheckInClick && (
            <button
              onClick={onCheckInClick}
              className="text-burgundy-600 hover:text-burgundy-700 font-medium"
            >
              Be first!
            </button>
          )}
        </div>
      );
    }

    const statusInfo = CHECK_IN_STATUS_LABELS[latestCheckIn.status];
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="text-lg">{statusInfo.icon}</span>
        <span className={`font-medium ${
          latestCheckIn.status === 'on' || latestCheckIn.status === 'amazing'
            ? 'text-green-700'
            : latestCheckIn.status === 'off'
            ? 'text-forest-500'
            : 'text-amber-600'
        }`}>
          {statusInfo.label}
        </span>
        <span className="text-forest-400">
          {formatRelativeTime(latestCheckIn.createdAt)}
        </span>
      </div>
    );
  }

  // Full mode - show check-in history and button
  return (
    <div className="space-y-4">
      {/* Header with check-in button */}
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold text-forest-900">
          Live Status
        </h3>
        {isAuthenticated && onCheckInClick && (
          <button
            onClick={onCheckInClick}
            className="flex items-center gap-2 px-4 py-2 bg-burgundy-600 hover:bg-burgundy-700 text-white rounded-lg font-medium transition-colors"
          >
            <span>📍</span>
            Check In
          </button>
        )}
      </div>

      {/* Latest check-in highlight */}
      {latestCheckIn ? (
        <div className="bg-cream-50 border border-forest-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="text-3xl">{CHECK_IN_STATUS_LABELS[latestCheckIn.status].icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`font-semibold ${
                  latestCheckIn.status === 'on' || latestCheckIn.status === 'amazing'
                    ? 'text-green-700'
                    : latestCheckIn.status === 'off'
                    ? 'text-forest-600'
                    : 'text-amber-600'
                }`}>
                  {CHECK_IN_STATUS_LABELS[latestCheckIn.status].label}
                </span>
                <span className="text-forest-400 text-sm">
                  {formatRelativeTime(latestCheckIn.createdAt)}
                </span>
              </div>
              <div className="text-sm text-forest-600 mt-1">
                by @{latestCheckIn.username}
              </div>
              {latestCheckIn.note && (
                <p className="text-sm text-forest-700 mt-2 italic">
                  "{latestCheckIn.note}"
                </p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-cream-50 border border-forest-200 rounded-lg p-4 text-center">
          <span className="text-2xl mb-2 block">📍</span>
          <p className="text-forest-600">
            No check-ins yet. {isAuthenticated ? 'Be the first to report the status!' : 'Sign in to check in!'}
          </p>
        </div>
      )}

      {/* Recent check-ins list */}
      {recentCheckIns.length > 1 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-forest-700">Recent Check-ins</h4>
          <div className="space-y-2">
            {recentCheckIns.slice(1).map((checkIn) => (
              <div
                key={checkIn.id}
                className="flex items-center gap-3 text-sm py-2 border-b border-forest-100 last:border-0"
              >
                <span>{CHECK_IN_STATUS_LABELS[checkIn.status].icon}</span>
                <span className="font-medium text-forest-700">
                  {CHECK_IN_STATUS_LABELS[checkIn.status].label}
                </span>
                <span className="text-forest-400">
                  {formatRelativeTime(checkIn.createdAt)} by @{checkIn.username}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Total count */}
      {checkInCount > 0 && (
        <p className="text-xs text-forest-400 text-right">
          {checkInCount} total check-in{checkInCount === 1 ? '' : 's'}
        </p>
      )}
    </div>
  );
}
