import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import type { AchievementId, UnlockedAchievement, Achievement } from '@/types/achievements';
import { ACHIEVEMENTS } from '@/types/achievements';
import { useAuth } from './AuthContext';

interface AchievementContextValue {
  // Unlocked achievements
  unlockedAchievements: UnlockedAchievement[];
  isUnlocked: (id: AchievementId) => boolean;

  // Unlock an achievement (triggers popup)
  unlockAchievement: (id: AchievementId, triggerData?: UnlockedAchievement['triggerData']) => void;

  // Check and unlock achievements based on stats
  checkAchievements: (stats: AchievementCheckStats) => void;

  // Queue of achievements to show (for popup component)
  achievementQueue: Achievement[];
  popNextAchievement: () => Achievement | undefined;

  // Loading state
  isLoading: boolean;

  // Total XP
  totalXP: number;
}

export interface AchievementCheckStats {
  approvedSubmissions?: number;
  totalLikesReceived?: number;
  maxLikesOnSingleLocation?: number;
  locationsLiked?: number;
  locationsViewed?: number;
  routesCreated?: number;
  hasFirstSubmission?: boolean;
  hasFirstApproval?: boolean;
  hasFirstLike?: boolean;
  hasFirstRoute?: boolean;
  hasAddedToRoute?: boolean;
  displayQualities?: ('minimal' | 'moderate' | 'impressive' | 'spectacular')[];
  uniqueLikers?: number;
  routesContainingUserLocations?: number;
}

const STORAGE_KEY = 'christmas-lights-achievements';

const AchievementContext = createContext<AchievementContextValue | null>(null);

export function AchievementProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const [unlockedAchievements, setUnlockedAchievements] = useState<UnlockedAchievement[]>([]);
  const [achievementQueue, setAchievementQueue] = useState<Achievement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const hasLoadedRef = useRef(false);

  // Load achievements from localStorage on mount (per user)
  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setUnlockedAchievements([]);
      setIsLoading(false);
      return;
    }

    // Prevent double loading
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    const storageKey = `${STORAGE_KEY}-${user.id}`;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        setUnlockedAchievements(parsed);
      }
    } catch (e) {
      console.error('Failed to load achievements:', e);
    }
    setIsLoading(false);
  }, [isAuthenticated, user?.id]);

  // Save achievements to localStorage when they change
  useEffect(() => {
    if (!user?.id || isLoading) return;

    const storageKey = `${STORAGE_KEY}-${user.id}`;
    try {
      localStorage.setItem(storageKey, JSON.stringify(unlockedAchievements));
    } catch (e) {
      console.error('Failed to save achievements:', e);
    }
  }, [unlockedAchievements, user?.id, isLoading]);

  const isUnlocked = useCallback((id: AchievementId): boolean => {
    return unlockedAchievements.some(a => a.id === id);
  }, [unlockedAchievements]);

  const unlockAchievement = useCallback((
    id: AchievementId,
    triggerData?: UnlockedAchievement['triggerData']
  ) => {
    // Don't unlock if already unlocked
    if (unlockedAchievements.some(a => a.id === id)) {
      return;
    }

    const achievement = ACHIEVEMENTS[id];
    if (!achievement) {
      console.warn(`Unknown achievement: ${id}`);
      return;
    }

    // Add to unlocked list
    const unlocked: UnlockedAchievement = {
      id,
      unlockedAt: new Date().toISOString(),
      triggerData,
    };

    setUnlockedAchievements(prev => [...prev, unlocked]);

    // Add to queue for popup
    setAchievementQueue(prev => [...prev, achievement]);

    console.log(`Achievement unlocked: ${achievement.name}`);
  }, [unlockedAchievements]);

  const popNextAchievement = useCallback((): Achievement | undefined => {
    if (achievementQueue.length === 0) return undefined;

    const next = achievementQueue[0];
    setAchievementQueue(prev => prev.slice(1));
    return next;
  }, [achievementQueue]);

  const checkAchievements = useCallback((stats: AchievementCheckStats) => {
    // First Steps
    if (stats.hasFirstSubmission && !isUnlocked('let-there-be-light')) {
      unlockAchievement('let-there-be-light');
    }

    if (stats.hasFirstApproval && !isUnlocked('the-first-noel')) {
      unlockAchievement('the-first-noel');
    }

    if (stats.hasFirstLike && !isUnlocked('heart-of-gold')) {
      unlockAchievement('heart-of-gold');
    }

    if (stats.hasAddedToRoute && !isUnlocked('finding-your-way')) {
      unlockAchievement('finding-your-way');
    }

    if (stats.hasFirstRoute && !isUnlocked('trail-blazer')) {
      unlockAchievement('trail-blazer');
    }

    // Quality achievements
    if (stats.displayQualities) {
      const hasModerateOrHigher = stats.displayQualities.some(
        q => ['moderate', 'impressive', 'spectacular'].includes(q)
      );
      const hasImpressive = stats.displayQualities.some(
        q => ['impressive', 'spectacular'].includes(q)
      );
      const hasSpectacular = stats.displayQualities.includes('spectacular');

      if (hasModerateOrHigher && !isUnlocked('deck-the-halls')) {
        unlockAchievement('deck-the-halls');
      }
      if (hasImpressive && !isUnlocked('making-spirits-bright')) {
        unlockAchievement('making-spirits-bright');
      }
      if (hasSpectacular && !isUnlocked('clark-griswold')) {
        unlockAchievement('clark-griswold');
      }
    }

    // Popularity achievements (max likes on single location)
    const maxLikes = stats.maxLikesOnSingleLocation || 0;
    if (maxLikes >= 10 && !isUnlocked('crowd-pleaser')) {
      unlockAchievement('crowd-pleaser', { likeCount: maxLikes });
    }
    if (maxLikes >= 25 && !isUnlocked('local-celebrity')) {
      unlockAchievement('local-celebrity', { likeCount: maxLikes });
    }
    if (maxLikes >= 50 && !isUnlocked('holiday-hero')) {
      unlockAchievement('holiday-hero', { likeCount: maxLikes });
    }
    if (maxLikes >= 100 && !isUnlocked('legendary-display')) {
      unlockAchievement('legendary-display', { likeCount: maxLikes });
    }

    // Contributor achievements
    const approved = stats.approvedSubmissions || 0;
    if (approved >= 5 && !isUnlocked('scout')) {
      unlockAchievement('scout');
    }
    if (approved >= 15 && !isUnlocked('enthusiast')) {
      unlockAchievement('enthusiast');
    }
    if (approved >= 50 && !isUnlocked('master-illuminator')) {
      unlockAchievement('master-illuminator');
    }
    if (approved >= 100 && !isUnlocked('light-keeper')) {
      unlockAchievement('light-keeper');
    }

    // Engagement achievements
    const locationsLiked = stats.locationsLiked || 0;
    if (locationsLiked >= 20 && !isUnlocked('social-butterfly')) {
      unlockAchievement('social-butterfly');
    }

    const locationsViewed = stats.locationsViewed || 0;
    if (locationsViewed >= 25 && !isUnlocked('explorer')) {
      unlockAchievement('explorer');
    }

    const routesCreated = stats.routesCreated || 0;
    if (routesCreated >= 5 && !isUnlocked('route-master')) {
      unlockAchievement('route-master');
    }

    const routesWithUserLocations = stats.routesContainingUserLocations || 0;
    if (routesWithUserLocations >= 5 && !isUnlocked('trendsetter')) {
      unlockAchievement('trendsetter');
    }

    const uniqueLikers = stats.uniqueLikers || 0;
    if (uniqueLikers >= 10 && !isUnlocked('community-champion')) {
      unlockAchievement('community-champion');
    }
  }, [isUnlocked, unlockAchievement]);

  // Calculate total XP
  const totalXP = unlockedAchievements.reduce((sum, ua) => {
    const achievement = ACHIEVEMENTS[ua.id];
    return sum + (achievement?.xp || 0);
  }, 0);

  return (
    <AchievementContext.Provider value={{
      unlockedAchievements,
      isUnlocked,
      unlockAchievement,
      checkAchievements,
      achievementQueue,
      popNextAchievement,
      isLoading,
      totalXP,
    }}>
      {children}
    </AchievementContext.Provider>
  );
}

export function useAchievements() {
  const context = useContext(AchievementContext);
  if (!context) {
    throw new Error('useAchievements must be used within an AchievementProvider');
  }
  return context;
}
