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
  createdAt: string;
  updatedAt?: string;
  googleMapsUrl?: string;
  createdBy?: string;
  // AI-generated fields
  decorations?: string[];  // Specific items like "Grinch inflatable", "nativity scene"
  categories?: string[];   // Broad categories like "inflatables", "string lights"
  theme?: string;          // Display theme like "Grinch", "Star Wars", "traditional"
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
  address: string;
  description: string;
  lat: number;
  lng: number;
  photos?: string[];
}

// User types
export interface User {
  id: string;
  email: string;
  name?: string;
  isAdmin: boolean;
  createdAt?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  isAdmin: boolean;
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
export interface ReportRequest {
  reason: string;
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
