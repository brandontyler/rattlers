import { useState, useMemo } from 'react';
import { useAchievements } from '@/contexts/AchievementContext';
import {
  ACHIEVEMENTS,
  Achievement,
  AchievementCategory,
  AchievementRarity,
  getRarityColors,
  CATEGORY_INFO,
  getAchievementsByCategory,
} from '@/types/achievements';
import AchievementIcon from './AchievementIcon';

interface AchievementsShowcaseProps {
  isOpen: boolean;
  onClose: () => void;
}

type FilterType = 'all' | AchievementCategory;

export default function AchievementsShowcase({ isOpen, onClose }: AchievementsShowcaseProps) {
  const { unlockedAchievements, isUnlocked, totalXP } = useAchievements();
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);

  const allAchievements = useMemo(() => Object.values(ACHIEVEMENTS), []);
  const unlockedCount = unlockedAchievements.length;
  const totalCount = allAchievements.length;

  const filteredAchievements = useMemo(() => {
    if (filter === 'all') return allAchievements;
    return getAchievementsByCategory(filter);
  }, [filter, allAchievements]);

  const categories: { id: FilterType; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'first-steps', label: 'First Steps' },
    { id: 'quality', label: 'Quality' },
    { id: 'popularity', label: 'Popularity' },
    { id: 'contributor', label: 'Contributor' },
    { id: 'engagement', label: 'Community' },
  ];

  // Group achievements by rarity for display
  const rarityOrder: AchievementRarity[] = ['legendary', 'epic', 'rare', 'uncommon', 'common'];

  const sortedAchievements = useMemo(() => {
    return [...filteredAchievements].sort((a, b) => {
      // Unlocked first
      const aUnlocked = isUnlocked(a.id);
      const bUnlocked = isUnlocked(b.id);
      if (aUnlocked !== bUnlocked) return aUnlocked ? -1 : 1;

      // Then by rarity (higher first)
      const aRarityIndex = rarityOrder.indexOf(a.rarity);
      const bRarityIndex = rarityOrder.indexOf(b.rarity);
      return aRarityIndex - bRarityIndex;
    });
  }, [filteredAchievements, isUnlocked]);

  if (!isOpen) return null;

  const getUnlockDate = (achievementId: string): string | null => {
    const unlocked = unlockedAchievements.find(ua => ua.id === achievementId);
    if (!unlocked) return null;
    return new Date(unlocked.unlockedAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-burgundy-600 to-burgundy-700 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-2xl font-bold mb-1">Achievements</h2>
              <p className="text-burgundy-100">
                Collect achievements as you explore and contribute
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Stats bar */}
          <div className="mt-4 flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z" />
                </svg>
              </div>
              <div>
                <div className="text-xl font-bold">{unlockedCount}/{totalCount}</div>
                <div className="text-xs text-burgundy-200">Unlocked</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-gold-400/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-gold-300" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </div>
              <div>
                <div className="text-xl font-bold">{totalXP.toLocaleString()}</div>
                <div className="text-xs text-burgundy-200">Total XP</div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="flex-1 ml-4">
              <div className="flex items-center justify-between text-xs text-burgundy-200 mb-1">
                <span>Progress</span>
                <span>{Math.round((unlockedCount / totalCount) * 100)}%</span>
              </div>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gold-400 rounded-full transition-all duration-500"
                  style={{ width: `${(unlockedCount / totalCount) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Category filter tabs */}
        <div className="flex gap-2 p-4 border-b border-forest-200 overflow-x-auto">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setFilter(cat.id)}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors
                ${filter === cat.id
                  ? 'bg-burgundy-600 text-white'
                  : 'bg-cream-100 text-forest-700 hover:bg-cream-200'
                }
              `}
            >
              {cat.label}
              {cat.id !== 'all' && (
                <span className="ml-1.5 opacity-70">
                  ({getAchievementsByCategory(cat.id as AchievementCategory).filter(a => isUnlocked(a.id)).length}/
                  {getAchievementsByCategory(cat.id as AchievementCategory).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Achievements grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {sortedAchievements.map(achievement => {
              const unlocked = isUnlocked(achievement.id);
              const colors = getRarityColors(achievement.rarity);
              const unlockDate = getUnlockDate(achievement.id);

              return (
                <button
                  key={achievement.id}
                  onClick={() => setSelectedAchievement(achievement)}
                  className={`
                    relative p-4 rounded-xl text-left transition-all duration-200
                    ${unlocked
                      ? `${colors.bg} ${colors.glow} border-2 ${colors.border} hover:scale-105`
                      : 'bg-gray-100 border-2 border-gray-200 opacity-60 hover:opacity-80'
                    }
                  `}
                >
                  {/* Rarity badge */}
                  <span
                    className={`
                      absolute top-2 right-2 px-1.5 py-0.5 text-[10px] font-bold uppercase rounded
                      ${unlocked ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-500'}
                    `}
                  >
                    {achievement.rarity}
                  </span>

                  {/* Icon */}
                  <div
                    className={`
                      w-12 h-12 rounded-lg mb-3 flex items-center justify-center
                      ${unlocked ? 'bg-white/20' : 'bg-gray-200'}
                    `}
                  >
                    <AchievementIcon
                      icon={achievement.icon}
                      className={`w-6 h-6 ${unlocked ? colors.text : 'text-gray-400'}`}
                    />
                  </div>

                  {/* Title */}
                  <h3
                    className={`
                      font-semibold text-sm leading-tight mb-1
                      ${unlocked ? colors.text : 'text-gray-500'}
                    `}
                  >
                    {unlocked || !achievement.secret ? achievement.name : '???'}
                  </h3>

                  {/* Description or hint */}
                  <p
                    className={`
                      text-xs leading-snug
                      ${unlocked ? `${colors.text} opacity-80` : 'text-gray-400'}
                    `}
                  >
                    {unlocked ? achievement.description : achievement.hint}
                  </p>

                  {/* XP */}
                  <div
                    className={`
                      mt-2 inline-flex items-center gap-1 text-xs font-medium
                      ${unlocked ? colors.text : 'text-gray-400'}
                    `}
                  >
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    {achievement.xp} XP
                  </div>

                  {/* Lock icon for locked achievements */}
                  {!unlocked && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900/10 rounded-xl">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                  )}

                  {/* Unlock date */}
                  {unlockDate && (
                    <div className={`mt-2 text-[10px] ${colors.text} opacity-60`}>
                      Unlocked {unlockDate}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Achievement detail modal */}
        {selectedAchievement && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4">
            <div
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {(() => {
                const unlocked = isUnlocked(selectedAchievement.id);
                const colors = getRarityColors(selectedAchievement.rarity);
                const unlockDate = getUnlockDate(selectedAchievement.id);

                return (
                  <>
                    {/* Header */}
                    <div className={`${unlocked ? colors.bg : 'bg-gray-400'} p-6 text-center`}>
                      <div
                        className={`
                          w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center
                          ${unlocked ? 'bg-white/20' : 'bg-gray-300'}
                          ${unlocked && selectedAchievement.rarity === 'legendary' ? 'animate-pulse' : ''}
                        `}
                      >
                        <AchievementIcon
                          icon={selectedAchievement.icon}
                          className={`w-10 h-10 ${unlocked ? colors.text : 'text-gray-500'}`}
                        />
                      </div>
                      <h3 className={`text-xl font-bold ${unlocked ? colors.text : 'text-gray-100'} mb-1`}>
                        {selectedAchievement.name}
                      </h3>
                      <span
                        className={`
                          inline-block px-2 py-0.5 text-xs font-bold uppercase rounded
                          ${unlocked ? 'bg-white/20' : 'bg-gray-300'}
                        `}
                      >
                        {selectedAchievement.rarity}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                      <p className="text-forest-700 text-center mb-4">
                        {selectedAchievement.description}
                      </p>

                      <div className="flex items-center justify-center gap-4 mb-4">
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1 text-gold-600">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            <span className="text-lg font-bold">{selectedAchievement.xp}</span>
                          </div>
                          <div className="text-xs text-forest-500">XP Reward</div>
                        </div>
                        <div className="w-px h-8 bg-forest-200" />
                        <div className="text-center">
                          <div className="text-lg font-bold text-forest-700">
                            {CATEGORY_INFO[selectedAchievement.category].name}
                          </div>
                          <div className="text-xs text-forest-500">Category</div>
                        </div>
                      </div>

                      {unlocked && unlockDate && (
                        <div className="text-center text-sm text-forest-500 mb-4">
                          <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          Unlocked on {unlockDate}
                        </div>
                      )}

                      {!unlocked && (
                        <div className="bg-cream-100 rounded-lg p-3 text-center mb-4">
                          <svg className="w-5 h-5 mx-auto text-gold-600 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                          <p className="text-sm text-forest-600">
                            <span className="font-medium">Hint:</span> {selectedAchievement.hint}
                          </p>
                        </div>
                      )}

                      <button
                        onClick={() => setSelectedAchievement(null)}
                        className="w-full py-3 bg-burgundy-600 text-white rounded-lg font-medium hover:bg-burgundy-700 transition-colors"
                      >
                        Close
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
