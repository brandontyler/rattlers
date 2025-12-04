import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  LocationsResponse,
  LocationDetailResponse,
  ApiResponse,
  LocationFilters,
  FeedbackRequest,
  FeedbackResponse,
  FeedbackStatusResponse,
  SuggestionRequest,
  ReportRequest,
  UserProfile,
  PhotoUploadRequest,
  UploadUrlResponse,
  Location,
  AddressSuggestionsRequest,
  AddressSuggestionsResponse,
} from '@/types';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: import.meta.env.VITE_API_ENDPOINT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      (config) => {
        const token = this.getAuthToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Token expired or invalid - redirect to login
          this.handleUnauthorized();
        }
        return Promise.reject(error);
      }
    );
  }

  private getAuthToken(): string | null {
    // Will be implemented with Cognito integration
    return localStorage.getItem('authToken');
  }

  private handleUnauthorized(): void {
    localStorage.removeItem('authToken');
    window.location.href = '/login';
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Locations endpoints
  async getLocations(filters?: LocationFilters): Promise<LocationsResponse> {
    const { data } = await this.api.get<LocationsResponse>('/locations', {
      params: filters,
    });
    return data;
  }

  async getLocationById(id: string): Promise<LocationDetailResponse> {
    const { data } = await this.api.get<LocationDetailResponse>(`/locations/${id}`);
    return data;
  }

  async createLocation(location: Partial<Location>): Promise<ApiResponse<Location>> {
    const { data } = await this.api.post<ApiResponse<Location>>('/locations', location);
    return data;
  }

  async updateLocation(id: string, updates: Partial<Location>): Promise<ApiResponse<Location>> {
    const { data } = await this.api.put<ApiResponse<Location>>(`/locations/${id}`, updates);
    return data;
  }

  async deleteLocation(id: string): Promise<ApiResponse<void>> {
    const { data } = await this.api.delete<ApiResponse<void>>(`/locations/${id}`);
    return data;
  }

  async suggestAddresses(request: AddressSuggestionsRequest): Promise<AddressSuggestionsResponse> {
    const { data } = await this.api.post<AddressSuggestionsResponse>('/locations/suggest-addresses', request);
    return data;
  }

  // Feedback endpoints
  async submitFeedback(locationId: string, feedback: FeedbackRequest): Promise<ApiResponse<FeedbackResponse>> {
    const { data } = await this.api.post<ApiResponse<FeedbackResponse>>(
      `/locations/${locationId}/feedback`,
      feedback
    );
    return data;
  }

  async getFeedbackStatus(locationId: string): Promise<ApiResponse<FeedbackStatusResponse>> {
    const { data } = await this.api.get<ApiResponse<FeedbackStatusResponse>>(
      `/locations/${locationId}/feedback/status`
    );
    return data;
  }

  async reportInactive(locationId: string, report: ReportRequest): Promise<ApiResponse<void>> {
    const { data } = await this.api.post<ApiResponse<void>>(
      `/locations/${locationId}/report`,
      report
    );
    return data;
  }

  // Suggestions endpoints
  async submitSuggestion(suggestion: SuggestionRequest): Promise<ApiResponse<void>> {
    const { data } = await this.api.post<ApiResponse<void>>('/suggestions', suggestion);
    return data;
  }

  async getSuggestions(status?: string): Promise<ApiResponse<any>> {
    const { data } = await this.api.get<ApiResponse<any>>('/suggestions', {
      params: { status },
    });
    return data;
  }

  async approveSuggestion(id: string): Promise<ApiResponse<void>> {
    const { data } = await this.api.post<ApiResponse<void>>(`/suggestions/${id}/approve`);
    return data;
  }

  async rejectSuggestion(id: string, reason: string): Promise<ApiResponse<void>> {
    const { data } = await this.api.post<ApiResponse<void>>(`/suggestions/${id}/reject`, {
      reason,
    });
    return data;
  }

  // Photo upload endpoints
  async getUploadUrl(request: PhotoUploadRequest): Promise<ApiResponse<UploadUrlResponse>> {
    const { data } = await this.api.post<ApiResponse<UploadUrlResponse>>(
      '/photos/upload-url',
      request
    );
    return data;
  }

  async uploadPhoto(uploadUrl: string, fields: Record<string, string>, file: File): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const formData = new FormData();

        // Add all presigned fields first (order matters)
        Object.entries(fields).forEach(([key, value]) => {
          formData.append(key, value);
        });

        // Add the file last
        formData.append('file', file);

        // Upload using fetch (axios has issues with FormData to S3)
        const response = await fetch(uploadUrl, {
          method: 'POST',
          body: formData,
        });

        if (response.ok || response.status === 204) {
          return;
        }

        throw new Error(`Upload failed: ${response.status}`);
      } catch (err) {
        lastError = err as Error;
        if (attempt < MAX_RETRIES - 1) {
          await this.sleep(RETRY_DELAY * (attempt + 1));
        }
      }
    }

    throw lastError || new Error('Upload failed after retries');
  }

  // User endpoints
  async getCurrentUser(): Promise<ApiResponse<UserProfile>> {
    const { data } = await this.api.get<ApiResponse<UserProfile>>('/users/me');
    return data;
  }

  async updateProfile(updates: Partial<UserProfile>): Promise<ApiResponse<UserProfile>> {
    const { data } = await this.api.put<ApiResponse<UserProfile>>('/users/me', updates);
    return data;
  }
}

export const apiService = new ApiService();
