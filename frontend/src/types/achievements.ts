// Achievement system types and definitions
// Xbox-style achievements with creative Christmas-themed names

export type AchievementId =
  // First-time achievements
  | 'let-there-be-light'      // First submission
  | 'the-first-noel'          // First approved submission
  | 'finding-your-way'        // Add first location to a route
  | 'trail-blazer'            // Create your first route
  | 'heart-of-gold'           // Like your first location

  // Quality achievements
  | 'deck-the-halls'          // Get "moderate" or higher rating
  | 'making-spirits-bright'   // Get "impressive" rating
  | 'clark-griswold'          // Get "spectacular" rating

  // Popularity achievements (likes received)
  | 'crowd-pleaser'           // Get 10 likes on a submission
  | 'local-celebrity'         // Get 25 likes on a submission
  | 'holiday-hero'            // Get 50 likes on a submission
  | 'legendary-display'       // Get 100 likes on a submission

  // Quantity achievements (approved submissions)
  | 'scout'                   // 5 approved submissions
  | 'enthusiast'              // 15 approved submissions
  | 'master-illuminator'      // 50 approved submissions
  | 'light-keeper'            // 100 approved submissions

  // Engagement achievements
  | 'social-butterfly'        // Like 20 different locations
  | 'explorer'                // View 25 different locations
  | 'route-master'            // Create 5 routes
  | 'trendsetter'             // Have your location added to 5 routes
  | 'community-champion';     // Have 10 different people like your submissions

export type AchievementRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export type AchievementCategory =
  | 'first-steps'     // First-time achievements
  | 'quality'         // Quality-based achievements
  | 'popularity'      // Likes received
  | 'contributor'     // Submission quantity
  | 'engagement';     // Community engagement

export interface Achievement {
  id: AchievementId;
  name: string;
  description: string;
  hint: string;           // Shown when locked - gives a clue
  category: AchievementCategory;
  rarity: AchievementRarity;
  xp: number;             // XP value for gamification
  icon: string;           // Icon identifier
  secret?: boolean;       // Hidden until unlocked
}

export interface UnlockedAchievement {
  id: AchievementId;
  unlockedAt: string;
  triggerData?: {
    locationId?: string;
    likeCount?: number;
    quality?: string;
  };
}

export interface AchievementProgress {
  id: AchievementId;
  current: number;
  target: number;
  percentage: number;
}

// Achievement definitions with creative names
export const ACHIEVEMENTS: Record<AchievementId, Achievement> = {
  // === FIRST STEPS (Common) ===
  'let-there-be-light': {
    id: 'let-there-be-light',
    name: 'Let There Be Light',
    description: 'Submit your first Christmas light display',
    hint: 'Share a display with the community',
    category: 'first-steps',
    rarity: 'common',
    xp: 50,
    icon: 'sparkles',
  },
  'the-first-noel': {
    id: 'the-first-noel',
    name: 'The First Noel',
    description: 'Get your first submission approved',
    hint: 'Quality submissions get approved',
    category: 'first-steps',
    rarity: 'common',
    xp: 100,
    icon: 'star',
  },
  'finding-your-way': {
    id: 'finding-your-way',
    name: 'Finding Your Way',
    description: 'Add your first location to a route',
    hint: 'Plan a route through the lights',
    category: 'first-steps',
    rarity: 'common',
    xp: 50,
    icon: 'map-pin',
  },
  'trail-blazer': {
    id: 'trail-blazer',
    name: 'Trail Blazer',
    description: 'Create and save your first route',
    hint: 'Share your favorite path through the lights',
    category: 'first-steps',
    rarity: 'common',
    xp: 75,
    icon: 'route',
  },
  'heart-of-gold': {
    id: 'heart-of-gold',
    name: 'Heart of Gold',
    description: 'Like your first location',
    hint: 'Show some love to a display',
    category: 'first-steps',
    rarity: 'common',
    xp: 25,
    icon: 'heart',
  },

  // === QUALITY ACHIEVEMENTS ===
  'deck-the-halls': {
    id: 'deck-the-halls',
    name: 'Deck the Halls',
    description: 'Submit a display rated "Moderate" or higher',
    hint: 'Put some effort into your submission',
    category: 'quality',
    rarity: 'uncommon',
    xp: 150,
    icon: 'home',
  },
  'making-spirits-bright': {
    id: 'making-spirits-bright',
    name: 'Making Spirits Bright',
    description: 'Submit a display rated "Impressive"',
    hint: 'Find a display that really stands out',
    category: 'quality',
    rarity: 'rare',
    xp: 300,
    icon: 'sun',
  },
  'clark-griswold': {
    id: 'clark-griswold',
    name: 'The Clark Griswold Award',
    description: 'Submit a display rated "Spectacular"',
    hint: 'Find a legendary display worthy of the Griswolds',
    category: 'quality',
    rarity: 'epic',
    xp: 500,
    icon: 'crown',
  },

  // === POPULARITY ACHIEVEMENTS (Likes Received) ===
  'crowd-pleaser': {
    id: 'crowd-pleaser',
    name: 'Crowd Pleaser',
    description: 'Have one of your submissions reach 10 likes',
    hint: 'People are loving your finds!',
    category: 'popularity',
    rarity: 'uncommon',
    xp: 200,
    icon: 'users',
  },
  'local-celebrity': {
    id: 'local-celebrity',
    name: 'Local Celebrity',
    description: 'Have one of your submissions reach 25 likes',
    hint: 'You\'re becoming famous in the community',
    category: 'popularity',
    rarity: 'rare',
    xp: 350,
    icon: 'trending-up',
  },
  'holiday-hero': {
    id: 'holiday-hero',
    name: 'Holiday Hero',
    description: 'Have one of your submissions reach 50 likes',
    hint: 'A true champion of Christmas cheer',
    category: 'popularity',
    rarity: 'epic',
    xp: 500,
    icon: 'award',
  },
  'legendary-display': {
    id: 'legendary-display',
    name: 'Legendary Display',
    description: 'Have one of your submissions reach 100 likes',
    hint: 'Your discovery has become legendary',
    category: 'popularity',
    rarity: 'legendary',
    xp: 1000,
    icon: 'trophy',
  },

  // === CONTRIBUTOR ACHIEVEMENTS ===
  'scout': {
    id: 'scout',
    name: 'Light Scout',
    description: 'Get 5 submissions approved',
    hint: 'Keep finding those displays!',
    category: 'contributor',
    rarity: 'uncommon',
    xp: 250,
    icon: 'binoculars',
  },
  'enthusiast': {
    id: 'enthusiast',
    name: 'Holiday Enthusiast',
    description: 'Get 15 submissions approved',
    hint: 'You really love Christmas lights!',
    category: 'contributor',
    rarity: 'rare',
    xp: 500,
    icon: 'flame',
  },
  'master-illuminator': {
    id: 'master-illuminator',
    name: 'Master Illuminator',
    description: 'Get 50 submissions approved',
    hint: 'A true master of light discovery',
    category: 'contributor',
    rarity: 'epic',
    xp: 1000,
    icon: 'zap',
  },
  'light-keeper': {
    id: 'light-keeper',
    name: 'Keeper of the Light',
    description: 'Get 100 submissions approved',
    hint: 'The guardian of holiday illumination',
    category: 'contributor',
    rarity: 'legendary',
    xp: 2000,
    icon: 'shield',
  },

  // === ENGAGEMENT ACHIEVEMENTS ===
  'social-butterfly': {
    id: 'social-butterfly',
    name: 'Social Butterfly',
    description: 'Like 20 different locations',
    hint: 'Spread the love around',
    category: 'engagement',
    rarity: 'uncommon',
    xp: 150,
    icon: 'heart-handshake',
  },
  'explorer': {
    id: 'explorer',
    name: 'Night Explorer',
    description: 'View 25 different location details',
    hint: 'Explore what the community has found',
    category: 'engagement',
    rarity: 'uncommon',
    xp: 150,
    icon: 'compass',
  },
  'route-master': {
    id: 'route-master',
    name: 'Route Master',
    description: 'Create 5 different routes',
    hint: 'Help families plan their adventures',
    category: 'engagement',
    rarity: 'rare',
    xp: 400,
    icon: 'map',
  },
  'trendsetter': {
    id: 'trendsetter',
    name: 'Trendsetter',
    description: 'Have your locations added to 5 different routes',
    hint: 'Your discoveries inspire route creators',
    category: 'engagement',
    rarity: 'rare',
    xp: 350,
    icon: 'sparkle',
  },
  'community-champion': {
    id: 'community-champion',
    name: 'Community Champion',
    description: 'Receive likes from 10 different users',
    hint: 'Build your fan base',
    category: 'engagement',
    rarity: 'rare',
    xp: 400,
    icon: 'crown-simple',
  },
};

// Get achievements by category
export function getAchievementsByCategory(category: AchievementCategory): Achievement[] {
  return Object.values(ACHIEVEMENTS).filter(a => a.category === category);
}

// Get achievements by rarity
export function getAchievementsByRarity(rarity: AchievementRarity): Achievement[] {
  return Object.values(ACHIEVEMENTS).filter(a => a.rarity === rarity);
}

// Calculate total XP from unlocked achievements
export function calculateTotalXP(unlockedIds: AchievementId[]): number {
  return unlockedIds.reduce((total, id) => total + (ACHIEVEMENTS[id]?.xp || 0), 0);
}

// Get rarity color classes
export function getRarityColors(rarity: AchievementRarity): { bg: string; text: string; border: string; glow: string } {
  switch (rarity) {
    case 'common':
      return {
        bg: 'bg-gradient-to-br from-gray-400 to-gray-600',
        text: 'text-gray-100',
        border: 'border-gray-300',
        glow: '',
      };
    case 'uncommon':
      return {
        bg: 'bg-gradient-to-br from-forest-500 to-forest-700',
        text: 'text-cream-50',
        border: 'border-forest-400',
        glow: 'shadow-[0_0_15px_rgba(4,120,87,0.4)]',
      };
    case 'rare':
      return {
        bg: 'bg-gradient-to-br from-blue-500 to-blue-700',
        text: 'text-blue-50',
        border: 'border-blue-400',
        glow: 'shadow-[0_0_20px_rgba(59,130,246,0.5)]',
      };
    case 'epic':
      return {
        bg: 'bg-gradient-to-br from-purple-500 to-purple-700',
        text: 'text-purple-50',
        border: 'border-purple-400',
        glow: 'shadow-[0_0_25px_rgba(168,85,247,0.5)]',
      };
    case 'legendary':
      return {
        bg: 'bg-gradient-to-br from-gold-400 via-gold-500 to-gold-600',
        text: 'text-gold-900',
        border: 'border-gold-300',
        glow: 'shadow-glow animate-glow',
      };
  }
}

// Category display info
export const CATEGORY_INFO: Record<AchievementCategory, { name: string; icon: string; description: string }> = {
  'first-steps': {
    name: 'First Steps',
    icon: 'footprints',
    description: 'Getting started with the community',
  },
  'quality': {
    name: 'Quality Finder',
    icon: 'gem',
    description: 'Finding impressive displays',
  },
  'popularity': {
    name: 'Fan Favorite',
    icon: 'heart',
    description: 'Getting recognition from the community',
  },
  'contributor': {
    name: 'Contributor',
    icon: 'gift',
    description: 'Building up your contribution count',
  },
  'engagement': {
    name: 'Community',
    icon: 'users',
    description: 'Engaging with the community',
  },
};
