interface BadgeProps {
  type: 'first-light' | 'scout' | 'enthusiast' | 'expert';
  earned: boolean;
  className?: string;
}

const BADGE_CONFIG = {
  'first-light': {
    name: 'First Light',
    description: '1 approved submission',
    color: 'gold',
    icon: (
      <svg
        className="w-8 h-8"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Candle icon */}
        <path d="M9 2v2" />
        <path d="M15 2v2" />
        <path d="M12 2v2" />
        <path d="M5 8h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z" />
        <path d="M9 12v6" />
        <path d="M12 12v6" />
        <path d="M15 12v6" />
        <path d="M12 2c0 1-1 2-1 2s1 1 1 2 1-1 1-2-1-1-1-2z" />
      </svg>
    ),
  },
  scout: {
    name: 'Scout',
    description: '5 approved submissions',
    color: 'forest',
    icon: (
      <svg
        className="w-8 h-8"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Binoculars icon */}
        <circle cx="7" cy="14" r="3" />
        <circle cx="17" cy="14" r="3" />
        <path d="M5 11h2" />
        <path d="M17 11h2" />
        <path d="M7 11v-1a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1" />
        <path d="M10 14h4" />
      </svg>
    ),
  },
  enthusiast: {
    name: 'Enthusiast',
    description: '15 approved submissions',
    color: 'burgundy',
    icon: (
      <svg
        className="w-8 h-8"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Star icon */}
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  },
  expert: {
    name: 'Expert',
    description: '50 approved submissions',
    color: 'gold',
    icon: (
      <svg
        className="w-8 h-8"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Crown icon */}
        <path d="M2 18h20" />
        <path d="M6 18V6l4 4 2-6 2 6 4-4v12" />
      </svg>
    ),
  },
};

export default function Badge({ type, earned, className = '' }: BadgeProps) {
  const config = BADGE_CONFIG[type];
  const colorClasses = earned
    ? {
        gold: 'bg-gradient-to-br from-gold-400 to-gold-600 text-gold-900 border-gold-300 shadow-glow-sm',
        forest: 'bg-gradient-to-br from-forest-500 to-forest-700 text-cream-50 border-forest-400',
        burgundy: 'bg-gradient-to-br from-burgundy-500 to-burgundy-700 text-cream-50 border-burgundy-400',
      }[config.color]
    : 'bg-gray-200 text-gray-400 border-gray-300 opacity-50';

  return (
    <div
      className={`flex flex-col items-center gap-2 ${className}`}
      title={`${config.name}: ${config.description}`}
    >
      {/* Badge Icon Circle */}
      <div
        className={`
          w-20 h-20 rounded-full border-4 flex items-center justify-center
          transition-all duration-300
          ${colorClasses}
          ${earned ? 'hover:scale-105 hover:shadow-glow' : 'cursor-not-allowed'}
        `}
      >
        {config.icon}
      </div>

      {/* Badge Name */}
      <div className="text-center">
        <div className={`font-semibold text-sm ${earned ? 'text-forest-900' : 'text-gray-500'}`}>
          {config.name}
        </div>
        <div className={`text-xs ${earned ? 'text-forest-600' : 'text-gray-400'}`}>
          {config.description}
        </div>
      </div>
    </div>
  );
}
