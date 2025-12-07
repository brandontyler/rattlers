import Badge from './Badge';

interface BadgeDisplayProps {
  approvedSubmissions: number;
}

interface BadgeRequirement {
  type: 'first-light' | 'scout' | 'enthusiast' | 'expert';
  threshold: number;
}

const BADGE_REQUIREMENTS: BadgeRequirement[] = [
  { type: 'first-light', threshold: 1 },
  { type: 'scout', threshold: 5 },
  { type: 'enthusiast', threshold: 15 },
  { type: 'expert', threshold: 50 },
];

export default function BadgeDisplay({ approvedSubmissions }: BadgeDisplayProps) {
  const badgesWithStatus = BADGE_REQUIREMENTS.map((badge) => ({
    ...badge,
    earned: approvedSubmissions >= badge.threshold,
    remaining: Math.max(0, badge.threshold - approvedSubmissions),
  }));

  const earnedCount = badgesWithStatus.filter((b) => b.earned).length;
  const nextBadge = badgesWithStatus.find((b) => !b.earned);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* Section Header */}
      <div className="mb-6">
        <h2 className="font-display text-2xl font-semibold text-forest-900 mb-2">
          Contributor Badges
        </h2>
        <p className="text-forest-600">
          Earn badges by contributing quality Christmas light display submissions
        </p>
      </div>

      {/* Stats Summary */}
      <div className="bg-gradient-to-r from-burgundy-50 to-gold-50 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold text-forest-900">
              {earnedCount} / {BADGE_REQUIREMENTS.length}
            </div>
            <div className="text-sm text-forest-600">Badges Earned</div>
          </div>
          {nextBadge && (
            <div className="text-right">
              <div className="text-lg font-semibold text-burgundy-700">
                {nextBadge.remaining} more
              </div>
              <div className="text-sm text-forest-600">to unlock {nextBadge.type.replace('-', ' ')}</div>
            </div>
          )}
          {!nextBadge && (
            <div className="flex items-center gap-2 text-gold-600">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="font-semibold">All badges unlocked!</span>
            </div>
          )}
        </div>
      </div>

      {/* Badge Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {badgesWithStatus.map((badge) => (
          <div key={badge.type} className="relative">
            <Badge type={badge.type} earned={badge.earned} />

            {/* Progress indicator for unearned badges */}
            {!badge.earned && (
              <div className="mt-3 text-center">
                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div
                    className="bg-burgundy-500 h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, (approvedSubmissions / badge.threshold) * 100)}%`,
                    }}
                  />
                </div>
                <div className="text-xs text-gray-600">
                  {approvedSubmissions} / {badge.threshold}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Encouragement Message */}
      {earnedCount === 0 && (
        <div className="mt-6 bg-cream-100 border-l-4 border-gold-500 p-4 rounded">
          <div className="flex items-start gap-3">
            <svg
              className="w-6 h-6 text-gold-600 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
            <div>
              <p className="font-semibold text-forest-900 mb-1">
                Start earning badges today!
              </p>
              <p className="text-sm text-forest-700">
                Submit your first Christmas light display to earn your First Light badge.
                Every approved submission helps families find magical holiday displays!
              </p>
            </div>
          </div>
        </div>
      )}

      {earnedCount > 0 && earnedCount < BADGE_REQUIREMENTS.length && (
        <div className="mt-6 bg-burgundy-50 border-l-4 border-burgundy-500 p-4 rounded">
          <div className="flex items-start gap-3">
            <svg
              className="w-6 h-6 text-burgundy-600 flex-shrink-0 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <div>
              <p className="font-semibold text-forest-900 mb-1">
                Keep up the great work!
              </p>
              <p className="text-sm text-forest-700">
                You're making a real impact on the community. Just {nextBadge?.remaining} more approved{' '}
                {nextBadge?.remaining === 1 ? 'submission' : 'submissions'} to earn your next badge!
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
