// Location types
export interface Location {
  id: string;
  address: string;
  lat: number;
  lng: number;
  description: string;
  photos: string[];
  status: 'active' | 'inactive' | 'flagged';
  feedbackCount: number;
  averageRating: number;
  likeCount: number;
  reportCount: number;
  createdAt: string;
  updatedAt?: string;
  googleMapsUrl?: string;
  createdBy?: string;
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
export type FeedbackType = 'like' | 'star';

export interface Feedback {
  id: string;
  locationId: string;
  userId: string;
  type: FeedbackType;
  rating?: number;
  createdAt: string;
}

export interface FeedbackRequest {
  type: FeedbackType;
  rating?: number;
}

export interface FeedbackResponse {
  liked?: boolean;
  id?: string;
  locationId: string;
  rating?: number;
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
  photos: string[];
}

// User types
export interface User {
  id: string;
  email: string;
  name?: string;
  isAdmin: boolean;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  isAdmin: boolean;
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
  photoUrl: string;
  expiresIn: number;
}

export interface PhotoUploadRequest {
  fileName: string;
  contentType: string;
}
