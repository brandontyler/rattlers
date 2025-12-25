import { useEffect, useState, useCallback } from 'react';
import { useAchievements } from '@/contexts/AchievementContext';
import { Achievement, getRarityColors } from '@/types/achievements';
import AchievementIcon from './AchievementIcon';

const DISPLAY_DURATION = 5000; // 5 seconds

export default function AchievementUnlockPopup() {
  const { achievementQueue, popNextAchievement } = useAchievements();
  const [currentAchievement, setCurrentAchievement] = useState<Achievement | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const showNextAchievement = useCallback(() => {
    const next = popNextAchievement();
    if (next) {
      setCurrentAchievement(next);
      setIsVisible(true);
      setIsExiting(false);

      // Auto-dismiss after duration
      setTimeout(() => {
        setIsExiting(true);
        setTimeout(() => {
          setIsVisible(false);
          setCurrentAchievement(null);
        }, 500); // Exit animation duration
      }, DISPLAY_DURATION);
    }
  }, [popNextAchievement]);

  // Show next achievement when queue has items and we're not showing one
  useEffect(() => {
    if (achievementQueue.length > 0 && !currentAchievement && !isVisible) {
      // Small delay before showing next
      const timer = setTimeout(showNextAchievement, 300);
      return () => clearTimeout(timer);
    }
  }, [achievementQueue.length, currentAchievement, isVisible, showNextAchievement]);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      setCurrentAchievement(null);
    }, 500);
  };

  if (!isVisible || !currentAchievement) return null;

  const colors = getRarityColors(currentAchievement.rarity);
  const rarityLabel = currentAchievement.rarity.charAt(0).toUpperCase() + currentAchievement.rarity.slice(1);

  return (
    <>
      {/* Backdrop overlay for epic/legendary */}
      {(currentAchievement.rarity === 'epic' || currentAchievement.rarity === 'legendary') && (
        <div
          className={`fixed inset-0 bg-black/30 z-[9998] transition-opacity duration-500 ${
            isExiting ? 'opacity-0' : 'opacity-100'
          }`}
          onClick={handleDismiss}
        />
      )}

      {/* Achievement popup */}
      <div
        className={`
          fixed top-4 left-1/2 -translate-x-1/2 z-[9999]
          transition-all duration-500 ease-out
          ${isExiting
            ? 'opacity-0 -translate-y-4 scale-95'
            : 'opacity-100 translate-y-0 scale-100'
          }
        `}
        style={{
          animation: isExiting ? undefined : 'achievement-enter 0.6s ease-out',
        }}
      >
        {/* Confetti burst for legendary */}
        {currentAchievement.rarity === 'legendary' && !isExiting && (
          <div className="absolute inset-0 -z-10 overflow-visible pointer-events-none">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 rounded-full"
                style={{
                  left: '50%',
                  top: '50%',
                  backgroundColor: ['#facc15', '#fde047', '#fef08a', '#fff'][i % 4],
                  animation: `confetti-burst 1s ease-out forwards`,
                  animationDelay: `${i * 30}ms`,
                  '--angle': `${(i / 20) * 360}deg`,
                  '--distance': `${80 + Math.random() * 60}px`,
                } as React.CSSProperties}
              />
            ))}
          </div>
        )}

        {/* Main container */}
        <div
          className={`
            relative overflow-hidden rounded-2xl
            min-w-[320px] max-w-[400px]
            ${colors.glow}
            border-2 ${colors.border}
            shadow-2xl
          `}
          onClick={handleDismiss}
          role="alert"
          aria-live="assertive"
        >
          {/* Background gradient */}
          <div className={`absolute inset-0 ${colors.bg} opacity-95`} />

          {/* Shimmer effect */}
          <div
            className="absolute inset-0 opacity-30"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
              animation: 'shimmer 2s linear infinite',
            }}
          />

          {/* Content */}
          <div className="relative p-5">
            {/* Header */}
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center gap-1.5">
                <svg className={`w-4 h-4 ${colors.text}`} fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z" />
                </svg>
                <span className={`text-xs font-bold uppercase tracking-wider ${colors.text}`}>
                  Achievement Unlocked!
                </span>
              </div>
              <span
                className={`
                  ml-auto px-2 py-0.5 text-xs font-semibold rounded-full
                  ${currentAchievement.rarity === 'legendary' ? 'bg-gold-900/30 text-gold-100' : 'bg-white/20'}
                `}
              >
                {rarityLabel}
              </span>
            </div>

            {/* Main content */}
            <div className="flex items-center gap-4">
              {/* Icon */}
              <div
                className={`
                  flex-shrink-0 w-16 h-16 rounded-xl
                  flex items-center justify-center
                  bg-white/20 backdrop-blur-sm
                  border border-white/30
                  ${currentAchievement.rarity === 'legendary' ? 'animate-pulse' : ''}
                `}
                style={{
                  animation: currentAchievement.rarity === 'legendary'
                    ? 'icon-glow 2s ease-in-out infinite'
                    : undefined,
                }}
              >
                <AchievementIcon
                  icon={currentAchievement.icon}
                  className={`w-8 h-8 ${colors.text}`}
                />
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <h3 className={`text-lg font-bold ${colors.text} leading-tight mb-1`}>
                  {currentAchievement.name}
                </h3>
                <p className={`text-sm ${colors.text} opacity-90 leading-snug`}>
                  {currentAchievement.description}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span
                    className={`
                      inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
                      bg-white/20
                    `}
                  >
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span className={colors.text}>+{currentAchievement.xp} XP</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Progress bar (timer) */}
            <div className="mt-4 h-1 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white/60 rounded-full"
                style={{
                  animation: `progress-shrink ${DISPLAY_DURATION}ms linear forwards`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Click to dismiss hint */}
        <p className="text-center text-white/70 text-xs mt-2 drop-shadow">
          Click to dismiss
        </p>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes achievement-enter {
          0% {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px) scale(0.8);
          }
          50% {
            transform: translateX(-50%) translateY(5px) scale(1.02);
          }
          100% {
            opacity: 1;
            transform: translateX(-50%) translateY(0) scale(1);
          }
        }

        @keyframes progress-shrink {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }

        @keyframes confetti-burst {
          0% {
            transform: translate(-50%, -50%) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translate(
              calc(-50% + cos(var(--angle)) * var(--distance)),
              calc(-50% + sin(var(--angle)) * var(--distance))
            ) rotate(720deg);
            opacity: 0;
          }
        }

        @keyframes icon-glow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(234, 179, 8, 0.4);
          }
          50% {
            box-shadow: 0 0 40px rgba(234, 179, 8, 0.8);
          }
        }

        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </>
  );
}
