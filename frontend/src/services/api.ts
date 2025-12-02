import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  LocationsResponse,
  LocationDetailResponse,
  ApiResponse,
  LocationFilters,
  FeedbackRequest,
  SuggestionRequest,
  ReportRequest,
  UserProfile,
  PhotoUploadRequest,
  UploadUrlResponse,
  Location,
} from '@/types';

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

  // Feedback endpoints
  async submitFeedback(locationId: string, feedback: FeedbackRequest): Promise<ApiResponse<void>> {
    const { data } = await this.api.post<ApiResponse<void>>(
      `/locations/${locationId}/feedback`,
      feedback
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

  async uploadPhoto(uploadUrl: string, file: File): Promise<void> {
    await axios.put(uploadUrl, file, {
      headers: {
        'Content-Type': file.type,
      },
    });
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
