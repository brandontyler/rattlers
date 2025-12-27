// Location types
export interface Location {
  id: string;
  address: string;
  lat: number;
  lng: number;
  description: string;
  photos: string[];
  status: 'active' | 'inactive' | 'flagged';
  likeCount: number;
  reportCount: number;
  viewCount: number;
  saveCount: number;
  createdAt: string;
  updatedAt?: string;
  googleMapsUrl?: string;
  createdBy?: string;
  createdByUsername?: string;
  source?: 'google-maps-import' | 'user-submission' | 'bot-scraper' | 'admin-created';
  // AI-generated fields
  decorations?: string[];  // Featured items visitors will see at this display
  aiDescription?: string;  // AI-generated description
  displayQuality?: 'minimal' | 'moderate' | 'impressive' | 'spectacular';
}

export interface LocationsResponse {
  success: boolean;
  data: Location[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface LocationDetailResponse {
  success: boolean;
  data: Location;
}

// Feedback types
export type FeedbackType = 'like';

export interface Feedback {
  id: string;
  locationId: string;
  userId: string;
  type: FeedbackType;
  createdAt: string;
}

export interface FeedbackRequest {
  type: FeedbackType;
}

export interface FeedbackResponse {
  liked?: boolean;
  id?: string;
  locationId: string;
}

export interface FeedbackStatusResponse {
  locationId: string;
  liked: boolean;
  reported: boolean;
  favorited: boolean;
  likedAt?: string;
  favoritedAt?: string;
}

// Suggestion types
export interface Suggestion {
  id: string;
  address: string;
  description: string;
  photos: string[];
  status: 'pending' | 'approved' | 'rejected';
  submittedBy: string;
  submittedByEmail?: string;
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface SuggestionRequest {
  // For new_location type (default)
  address?: string;
  description?: string;
  lat?: number;
  lng?: number;
  photos?: string[];
  // For photo_update type
  type?: 'new_location' | 'photo_update';
  targetLocationId?: string;
}

// User types
export type AdminGroup = 'NorthPoleCouncil' | 'SantasHelpers' | 'WorkshopElves' | 'ChimneySweeps' | 'Admins';

export interface UserPermissions {
  canApprove: boolean;    // Can approve/reject submissions
  canEdit: boolean;       // Can edit location details
  canModerate: boolean;   // Can handle reports
  canReject: boolean;     // Can reject content
  canDelete: boolean;     // Can delete permanently
  canViewAdmin: boolean;  // Can access admin dashboard
}

export interface User {
  id: string;
  email: string;
  username?: string;
  name?: string;
  isAdmin: boolean;
  groups: AdminGroup[];
  permissions: UserPermissions;
  createdAt?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  username?: string;
  name?: string;
  isAdmin: boolean;
  groups?: AdminGroup[];
  permissions?: UserPermissions;
  joinDate: string;
  stats: {
    totalSubmissions: number;
    approvedSubmissions: number;
    pendingSubmissions: number;
    rejectedSubmissions: number;
  };
}

export interface UserSubmission {
  id: string;
  address: string;
  description: string;
  photos: string[];
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  reviewedAt?: string;
  rejectionReason?: string;
  lat: number;
  lng: number;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  approvedSubmissions: number;
  joinDate: string | null;
  badge: {
    type: 'first-light' | 'scout' | 'enthusiast' | 'expert';
    label: string;
  } | null;
}

export interface LocationLeaderboardEntry {
  rank: number;
  locationId: string;
  address: string;
  description: string;
  aiDescription?: string;
  likeCount: number;
  photos: string[];
  createdBy?: string;
  createdByUsername?: string;
  decorations?: string[];
  displayQuality?: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string>;
}

// Search/Filter types
export interface LocationFilters {
  lat?: number;
  lng?: number;
  radius?: number;
  search?: string;
  status?: 'active' | 'inactive';
  minRating?: number;
  page?: number;
  pageSize?: number;
}

// Report types
export type ReportCategory =
  | 'no_lights'
  | 'wrong_description'
  | 'wrong_tags'
  | 'wrong_category'
  | 'blurry_photos'
  | 'have_better_photo'
  | 'wrong_location'
  | 'other';

export const REPORT_CATEGORIES: Record<ReportCategory, { label: string; description: string }> = {
  no_lights: {
    label: 'No lights here',
    description: 'The display is no longer active or was never here',
  },
  wrong_description: {
    label: 'Description is wrong',
    description: 'The description does not match what is actually there',
  },
  wrong_tags: {
    label: 'Tags are wrong',
    description: 'The decorations or categories listed are incorrect',
  },
  wrong_category: {
    label: 'Wrong quality rating',
    description: 'The display quality (minimal/impressive/etc) is inaccurate',
  },
  blurry_photos: {
    label: 'Photos are blurry or bad',
    description: 'The photos are low quality or do not show the display well',
  },
  have_better_photo: {
    label: 'I have a better photo',
    description: 'I can provide better photos of this display',
  },
  wrong_location: {
    label: 'Wrong address/location',
    description: 'The pin or address is incorrect',
  },
  other: {
    label: 'Other issue',
    description: 'Something else is wrong with this listing',
  },
};

export interface ReportRequest {
  reason: string;
  category?: ReportCategory;
}

// Photo upload types
export interface UploadUrlResponse {
  uploadUrl: string;
  fields: Record<string, string>;
  photoKey: string;
  expiresIn: number;
}

export interface PhotoUploadRequest {
  contentType: string;
  fileSize: number;
  suggestionId?: string;
}

// Address suggestion types
export interface AddressSuggestion {
  address: string;
  lat: number;
  lng: number;
  displayName: string;
}

export interface AddressSuggestionsRequest {
  query: string;
}

export interface AddressSuggestionsResponse {
  success: boolean;
  data: {
    suggestions: AddressSuggestion[];
    query: string;
  };
}

// Route PDF types
export interface RouteStop {
  id: string;
  address: string;
  lat: number;
  lng: number;
  description?: string;
  photos?: string[];
  averageRating?: number;
}

export interface RoutePdfRequest {
  stops: RouteStop[];
}

export interface RoutePdfResponse {
  downloadUrl: string;
  expiresIn: number;
}

// Saved Route types
export interface SavedRoute {
  id: string;
  title: string;
  description: string;
  locationIds: string[];
  locations?: Location[];  // Populated when fetching route details
  tags: string[];
  createdBy: string;
  createdByUsername?: string;
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'draft';
  isPublic: boolean;
  likeCount: number;
  saveCount: number;
  startCount: number;
  stopCount: number;
  estimatedMinutes: number;
  totalMiles: number;
  // User's feedback status (when authenticated)
  userLiked?: boolean;
  userSaved?: boolean;
}

export interface CreateRouteRequest {
  title: string;
  description: string;
  locationIds: string[];
  tags?: string[];
  isPublic?: boolean;
}

export interface UpdateRouteRequest {
  title?: string;
  description?: string;
  locationIds?: string[];
  tags?: string[];
  isPublic?: boolean;
}

export interface RouteFeedbackRequest {
  type: 'like' | 'save';
}

export interface RouteFeedbackResponse {
  liked?: boolean;
  saved?: boolean;
  id?: string;
  routeId: string;
}

export interface RouteFeedbackStatusResponse {
  routeId: string;
  liked: boolean;
  saved: boolean;
}

export interface RouteCreatorEntry {
  rank: number;
  userId: string;
  username: string;
  routeCount: number;
  totalLikes: number;
  totalSaves: number;
  badge: {
    type: 'route-scout' | 'trail-blazer' | 'route-master' | 'legend';
    label: string;
  } | null;
}

export interface RoutesLeaderboardResponse {
  routes: SavedRoute[];
  creators: RouteCreatorEntry[];
}

// Duplicate check types
export interface DuplicateCheckRequest {
  lat: number;
  lng: number;
  address: string;
}

export interface DuplicateLocation {
  id: string;
  address: string;
  description?: string;
  aiDescription?: string;
  photos: string[];
  hasPhotos: boolean;
  likeCount: number;
  displayQuality?: string;
  decorations?: string[];
}

export interface DuplicateCheckResponse {
  isDuplicate: boolean;
  location: DuplicateLocation | null;
  hasPendingSuggestion: boolean;
}
