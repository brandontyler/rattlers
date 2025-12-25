import { useState, useMemo } from 'react';
import { useAchievements } from '@/contexts/AchievementContext';
import {
  ACHIEVEMENTS,
  getRarityColors,
  AchievementRarity,
} from '@/types/achievements';
import AchievementIcon from './AchievementIcon';
import AchievementsShowcase from './AchievementsShowcase';

export default function AchievementsSummary() {
  const { unlockedAchievements, isUnlocked, totalXP } = useAchievements();
  const [showcaseOpen, setShowcaseOpen] = useState(false);

  const allAchievements = useMemo(() => Object.values(ACHIEVEMENTS), []);
  const unlockedCount = unlockedAchievements.length;
  const totalCount = allAchievements.length;

  // Get recently unlocked (last 3)
  const recentlyUnlocked = useMemo(() => {
    return [...unlockedAchievements]
      .sort((a, b) => new Date(b.unlockedAt).getTime() - new Date(a.unlockedAt).getTime())
      .slice(0, 3)
      .map(ua => ACHIEVEMENTS[ua.id])
      .filter(Boolean);
  }, [unlockedAchievements]);

  // Get next achievements to unlock (highest rarity unearned, max 3)
  const nextToUnlock = useMemo(() => {
    const rarityOrder: AchievementRarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
    return allAchievements
      .filter(a => !isUnlocked(a.id) && !a.secret)
      .sort((a, b) => rarityOrder.indexOf(a.rarity) - rarityOrder.indexOf(b.rarity))
      .slice(0, 3);
  }, [allAchievements, isUnlocked]);

  // Count by rarity
  const rarityStats = useMemo(() => {
    const stats: Record<AchievementRarity, { earned: number; total: number }> = {
      common: { earned: 0, total: 0 },
      uncommon: { earned: 0, total: 0 },
      rare: { earned: 0, total: 0 },
      epic: { earned: 0, total: 0 },
      legendary: { earned: 0, total: 0 },
    };

    allAchievements.forEach(a => {
      stats[a.rarity].total++;
      if (isUnlocked(a.id)) {
        stats[a.rarity].earned++;
      }
    });

    return stats;
  }, [allAchievements, isUnlocked]);

  return (
    <>
      <div className="bg-white rounded-lg shadow-md p-6">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-display text-2xl font-semibold text-forest-900 mb-1">
              Achievements
            </h2>
            <p className="text-forest-600 text-sm">
              Earn achievements by exploring and contributing
            </p>
          </div>
          <button
            onClick={() => setShowcaseOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-burgundy-600 text-white rounded-lg font-medium hover:bg-burgundy-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z" />
            </svg>
            View All
          </button>
        </div>

        {/* Stats Summary */}
        <div className="bg-gradient-to-r from-burgundy-50 to-gold-50 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            {/* Progress */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center">
                <div className="text-center">
                  <div className="text-xl font-bold text-burgundy-700">{unlockedCount}</div>
                  <div className="text-[10px] text-forest-500">of {totalCount}</div>
                </div>
              </div>
              <div>
                <div className="text-lg font-bold text-forest-900">
                  {Math.round((unlockedCount / totalCount) * 100)}% Complete
                </div>
                <div className="flex items-center gap-1 text-sm text-gold-700">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  {totalXP.toLocaleString()} XP earned
                </div>
              </div>
            </div>

            {/* Rarity breakdown */}
            <div className="flex gap-3">
              {(['legendary', 'epic', 'rare', 'uncommon'] as AchievementRarity[]).map(rarity => {
                const stats = rarityStats[rarity];
                const colors = getRarityColors(rarity);
                if (stats.total === 0) return null;

                return (
                  <div
                    key={rarity}
                    className={`
                      px-3 py-1.5 rounded-lg text-xs font-medium
                      ${stats.earned > 0 ? colors.bg + ' ' + colors.text : 'bg-gray-100 text-gray-500'}
                    `}
                    title={`${rarity}: ${stats.earned}/${stats.total}`}
                  >
                    {stats.earned}/{stats.total}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Recently Unlocked */}
        {recentlyUnlocked.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-forest-700 uppercase tracking-wider mb-3">
              Recently Unlocked
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {recentlyUnlocked.map(achievement => {
                const colors = getRarityColors(achievement.rarity);
                return (
                  <div
                    key={achievement.id}
                    className={`
                      p-3 rounded-lg flex items-center gap-3
                      ${colors.bg} ${colors.glow}
                    `}
                  >
                    <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                      <AchievementIcon icon={achievement.icon} className={`w-5 h-5 ${colors.text}`} />
                    </div>
                    <div className="min-w-0">
                      <div className={`font-semibold text-sm truncate ${colors.text}`}>
                        {achievement.name}
                      </div>
                      <div className={`text-xs opacity-80 ${colors.text}`}>
                        +{achievement.xp} XP
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Next to Unlock */}
        {nextToUnlock.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-forest-700 uppercase tracking-wider mb-3">
              Up Next
            </h3>
            <div className="space-y-2">
              {nextToUnlock.map(achievement => (
                <div
                  key={achievement.id}
                  className="flex items-center gap-3 p-3 bg-cream-50 rounded-lg"
                >
                  <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center flex-shrink-0">
                    <AchievementIcon icon={achievement.icon} className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-forest-800 text-sm">
                      {achievement.name}
                    </div>
                    <div className="text-xs text-forest-500">
                      {achievement.hint}
                    </div>
                  </div>
                  <span className="text-xs font-medium text-gray-400 uppercase">
                    {achievement.rarity}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All unlocked message */}
        {unlockedCount === totalCount && (
          <div className="text-center py-8 bg-gradient-to-r from-gold-100 to-gold-50 rounded-lg">
            <div className="text-4xl mb-2">🏆</div>
            <div className="text-lg font-bold text-gold-800 mb-1">
              Achievement Hunter!
            </div>
            <div className="text-sm text-gold-700">
              You've unlocked all achievements. Legendary status achieved!
            </div>
          </div>
        )}
      </div>

      {/* Showcase Modal */}
      <AchievementsShowcase isOpen={showcaseOpen} onClose={() => setShowcaseOpen(false)} />
    </>
  );
}
