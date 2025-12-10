/**
 * Compact badge component to display user's highest achievement
 * Shows next to username in headers and profile displays
 */

interface UserBadgeProps {
  approvedSubmissions: number;
  className?: string;
}

interface BadgeLevel {
  type: 'first-light' | 'scout' | 'enthusiast' | 'expert';
  name: string;
  threshold: number;
  color: string;
  icon: JSX.Element;
}

const BADGE_LEVELS: BadgeLevel[] = [
  {
    type: 'first-light',
    name: 'First Light',
    threshold: 1,
    color: 'gold',
    icon: (
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2c0 1-1 2-1 2s1 1 1 2 1-1 1-2-1-1-1-2z" />
        <path d="M5 8h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z" />
      </svg>
    ),
  },
  {
    type: 'scout',
    name: 'Scout',
    threshold: 5,
    color: 'forest',
    icon: (
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="7" cy="14" r="3" />
        <circle cx="17" cy="14" r="3" />
        <path d="M10 14h4" />
      </svg>
    ),
  },
  {
    type: 'enthusiast',
    name: 'Enthusiast',
    threshold: 15,
    color: 'burgundy',
    icon: (
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  },
  {
    type: 'expert',
    name: 'Expert',
    threshold: 50,
    color: 'gold',
    icon: (
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
        <path d="M6 18V6l4 4 2-6 2 6 4-4v12" />
        <path d="M2 18h20" />
      </svg>
    ),
  },
];

export default function UserBadge({ approvedSubmissions, className = '' }: UserBadgeProps) {
  // Find the highest badge earned
  const highestBadge = [...BADGE_LEVELS]
    .reverse()
    .find((badge) => approvedSubmissions >= badge.threshold);

  if (!highestBadge) {
    return null; // No badge earned yet
  }

  const colorClasses = {
    gold: 'bg-gradient-to-br from-gold-400 to-gold-600 text-gold-900 border-gold-300',
    forest: 'bg-gradient-to-br from-forest-500 to-forest-700 text-cream-50 border-forest-400',
    burgundy: 'bg-gradient-to-br from-burgundy-500 to-burgundy-700 text-cream-50 border-burgundy-400',
  }[highestBadge.color];

  return (
    <div
      className={`flex items-center gap-1 ${className}`}
      title={`${highestBadge.name} - ${approvedSubmissions} approved submissions`}
    >
      <div
        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${colorClasses}`}
      >
        {highestBadge.icon}
      </div>
    </div>
  );
}

/**
 * Helper function to get badge info for a given submission count
 * Useful for displaying badge data without rendering the component
 */
export function getUserBadgeInfo(approvedSubmissions: number) {
  const highestBadge = [...BADGE_LEVELS]
    .reverse()
    .find((badge) => approvedSubmissions >= badge.threshold);

  return highestBadge || null;
}
