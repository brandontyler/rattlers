import { useState, useEffect } from 'react';
import { Button, Card, Badge } from '@/components/ui';
import { apiService } from '@/services/api';
import EditEntryModal from '@/components/EditEntryModal';

interface Suggestion {
  id: string;
  type?: 'new_location' | 'photo_update';
  address?: string;
  description?: string;
  lat?: number;
  lng?: number;
  photos: string[];
  status: string;
  submittedBy: string;
  submittedByEmail?: string;
  createdAt: string;
  detectedTags?: string[];
  categories?: string[];
  theme?: string;
  aiDescription?: string;
  displayQuality?: 'minimal' | 'moderate' | 'impressive' | 'spectacular';
  flaggedForReview?: boolean;
  // For photo_update type
  targetLocationId?: string;
  targetAddress?: string;
}

interface Location {
  id: string;
  address: string;
  description?: string;
  aiDescription?: string;
  decorations?: string[];
  categories?: string[];
  theme?: string;
  displayQuality?: 'minimal' | 'moderate' | 'impressive' | 'spectacular';
  likeCount?: number;
  viewCount?: number;
  saveCount?: number;
  createdAt?: string;
}

export default function AdminPage() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [showLocations, setShowLocations] = useState(false);
  const [locationCount, setLocationCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Edit modal state
  const [editingSuggestion, setEditingSuggestion] = useState<Suggestion | null>(null);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);

  const flaggedCount = suggestions.filter(s => s.flaggedForReview).length;

  const qualityColors: Record<string, string> = {
    minimal: 'bg-gray-100 text-gray-700',
    moderate: 'bg-blue-100 text-blue-700',
    impressive: 'bg-gold-100 text-gold-700',
    spectacular: 'bg-burgundy-100 text-burgundy-700',
  };

  useEffect(() => {
    fetchSuggestions();
    fetchLocationCount();
  }, []);

  const fetchSuggestions = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.getSuggestions('pending');
      setSuggestions(response.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load suggestions');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLocationCount = async () => {
    try {
      const response = await apiService.getLocations({ pageSize: 500 });
      setLocationCount(response.pagination?.total || response.data?.length || 0);
      setLocations(response.data || []);
    } catch {
      // Silently fail - count is not critical
    }
  };

  const handleDeleteLocation = async (id: string) => {
    if (!confirm('Are you sure you want to delete this location? This will also delete all likes and photos.')) {
      return;
    }
    try {
      setDeletingId(id);
      await apiService.deleteLocation(id);
      setLocations(locations.filter(l => l.id !== id));
      setLocationCount(prev => (prev ?? 1) - 1);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete location');
    } finally {
      setDeletingId(null);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      setProcessingId(id);
      await apiService.approveSuggestion(id);
      setSuggestions(suggestions.filter(s => s.id !== id));
      setLocationCount(prev => (prev ?? 0) + 1);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to approve suggestion');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    try {
      setProcessingId(id);
      await apiService.rejectSuggestion(id, 'Rejected by admin');
      setSuggestions(suggestions.filter(s => s.id !== id));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reject suggestion');
    } finally {
      setProcessingId(null);
    }
  };

  const handleSaveSuggestion = async (updates: Partial<Suggestion>) => {
    if (!editingSuggestion) return;

    await apiService.updateSuggestion(editingSuggestion.id, updates);

    // Update the local state with the new data
    setSuggestions(suggestions.map(s =>
      s.id === editingSuggestion.id ? { ...s, ...updates } : s
    ));
  };

  const handleSaveLocation = async (updates: Partial<Location>) => {
    if (!editingLocation) return;

    await apiService.updateLocation(editingLocation.id, updates);

    // Update the local state with the new data
    setLocations(locations.map(l =>
      l.id === editingLocation.id ? { ...l, ...updates } : l
    ));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="min-h-[calc(100vh-300px)] gradient-winter py-6 sm:py-12 px-3 sm:px-4 animate-fade-in">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 sm:mb-12">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-burgundy-100 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-burgundy-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-forest-900">
                Admin Dashboard
              </h1>
              <p className="text-sm sm:text-base text-forest-600">Manage locations and suggestions</p>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-burgundy-50 border-2 border-burgundy-200 text-burgundy-800 px-4 py-3 rounded-lg mb-6">
            {error}
            <button onClick={() => setError('')} className="ml-4 text-burgundy-600 hover:text-burgundy-800">
              Dismiss
            </button>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <Card className="p-4 sm:p-6 card-glow">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 bg-gold-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-gold-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              {suggestions.length > 0 && <Badge variant="gold">New</Badge>}
            </div>
            <p className="text-3xl sm:text-4xl font-display font-bold text-forest-900 mb-1">
              {isLoading ? '...' : suggestions.length}
            </p>
            <p className="text-sm font-medium text-forest-600">Pending Suggestions</p>
          </Card>

          <Card className="p-4 sm:p-6 card-glow">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 bg-forest-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-forest-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl sm:text-4xl font-display font-bold text-forest-900 mb-1">{locationCount ?? '...'}</p>
            <p className="text-sm font-medium text-forest-600">Total Locations</p>
          </Card>

          <Card className="p-4 sm:p-6 card-glow">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 bg-burgundy-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-burgundy-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                </svg>
              </div>
              {flaggedCount > 0 && <Badge variant="burgundy">Review</Badge>}
            </div>
            <p className="text-3xl sm:text-4xl font-display font-bold text-forest-900 mb-1">{isLoading ? '...' : flaggedCount}</p>
            <p className="text-sm font-medium text-forest-600">Flagged for Review</p>
          </Card>
        </div>

        {/* Location Analytics Stats */}
        <h2 className="font-display text-lg sm:text-xl font-bold text-forest-900 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Location Analytics
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <Card className="p-4 sm:p-6 card-glow">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl sm:text-4xl font-display font-bold text-forest-900 mb-1">
              {locations.reduce((sum, l) => sum + (l.viewCount || 0), 0).toLocaleString()}
            </p>
            <p className="text-sm font-medium text-forest-600">Total Views</p>
          </Card>

          <Card className="p-4 sm:p-6 card-glow">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl sm:text-4xl font-display font-bold text-forest-900 mb-1">
              {locations.reduce((sum, l) => sum + (l.likeCount || 0), 0).toLocaleString()}
            </p>
            <p className="text-sm font-medium text-forest-600">Total Likes</p>
          </Card>

          <Card className="p-4 sm:p-6 card-glow">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl sm:text-4xl font-display font-bold text-forest-900 mb-1">
              {locations.reduce((sum, l) => sum + (l.saveCount || 0), 0).toLocaleString()}
            </p>
            <p className="text-sm font-medium text-forest-600">Total Saves</p>
          </Card>

          <Card className="p-4 sm:p-6 card-glow">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
            <p className="text-3xl sm:text-4xl font-display font-bold text-forest-900 mb-1">
              {(() => {
                const totalViews = locations.reduce((sum, l) => sum + (l.viewCount || 0), 0);
                const totalLikes = locations.reduce((sum, l) => sum + (l.likeCount || 0), 0);
                if (totalViews === 0) return '0%';
                return ((totalLikes / totalViews) * 100).toFixed(1) + '%';
              })()}
            </p>
            <p className="text-sm font-medium text-forest-600">Engagement Rate</p>
            <p className="text-xs text-forest-400 mt-1">Likes / Views</p>
          </Card>
        </div>

        {/* Pending Suggestions Section */}
        <Card className="p-4 sm:p-6 md:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="font-display text-xl sm:text-2xl font-bold text-forest-900 flex items-center gap-2">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-burgundy-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Pending Suggestions
              </h2>
              <p className="text-xs sm:text-sm text-forest-600 mt-1">
                Review and approve new location submissions
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={fetchSuggestions} disabled={isLoading} className="self-start sm:self-auto">
              Refresh
            </Button>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-4 border-forest-200 border-t-forest-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-forest-600">Loading suggestions...</p>
            </div>
          ) : suggestions.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-forest-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-forest-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-forest-600 font-medium">All caught up!</p>
              <p className="text-sm text-forest-500 mt-1">No pending suggestions at the moment</p>
            </div>
          ) : (
            <div className="space-y-4">
              {suggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className={`border-2 rounded-lg p-4 sm:p-6 transition-colors duration-200 ${
                    suggestion.flaggedForReview
                      ? 'border-burgundy-300 bg-burgundy-50/50'
                      : 'border-forest-100 hover:border-forest-200'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex flex-wrap items-start sm:items-center gap-2 mb-2">
                            <h3 className="font-display text-base sm:text-lg font-semibold text-forest-900 break-words">
                              {suggestion.type === 'photo_update' ? suggestion.targetAddress : suggestion.address}
                            </h3>
                            <div className="flex flex-wrap items-center gap-1.5">
                              {suggestion.type === 'photo_update' && (
                                <Badge variant="gold">📷 Photo Update</Badge>
                              )}
                              {suggestion.flaggedForReview && (
                                <Badge variant="burgundy">⚠️ Flagged</Badge>
                              )}
                              {suggestion.displayQuality && (
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize whitespace-nowrap ${qualityColors[suggestion.displayQuality] || qualityColors.moderate}`}>
                                  {suggestion.displayQuality}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-forest-600">
                            <span className="flex items-center gap-1 truncate max-w-[180px] sm:max-w-none">
                              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              <span className="truncate">{suggestion.submittedByEmail || 'Anonymous'}</span>
                            </span>
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {formatDate(suggestion.createdAt)}
                            </span>
                            {suggestion.lat && suggestion.lng && (
                              <span className="hidden md:flex items-center gap-1">
                                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                </svg>
                                {suggestion.lat.toFixed(4)}, {suggestion.lng.toFixed(4)}
                              </span>
                            )}
                            {(suggestion as any).googleMapsUrl && (
                              <a
                                href={(suggestion as any).googleMapsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                                Google Maps
                              </a>
                            )}
                            {suggestion.photos.length > 0 && (
                              <span className="flex items-center gap-1 text-gold-600">
                                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                {suggestion.photos.length} photo{suggestion.photos.length > 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* User Description or Photo Update Notice */}
                      {suggestion.type === 'photo_update' ? (
                        <p className="text-forest-600 italic mb-3">
                          Photo submission for existing location (no description required)
                        </p>
                      ) : (
                        <p className="text-forest-700 leading-relaxed mb-3">{suggestion.description}</p>
                      )}
                      
                      {/* AI Description */}
                      {suggestion.aiDescription && (
                        <div className="bg-forest-50 border border-forest-200 rounded-lg p-3 mb-3">
                          <p className="text-xs font-medium text-forest-500 mb-1 flex items-center gap-1">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 11H9v-2h2v2zm0-4H9V5h2v4z" />
                            </svg>
                            AI-Generated Description
                          </p>
                          <p className="text-sm text-forest-700">{suggestion.aiDescription}</p>
                        </div>
                      )}
                      
                      {/* Detected Tags */}
                      {suggestion.detectedTags && suggestion.detectedTags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {suggestion.detectedTags.map((tag) => (
                            <span
                              key={tag}
                              className="text-xs bg-forest-100 text-forest-700 px-2 py-1 rounded-full"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      
                      {/* Photo Thumbnails */}
                      {suggestion.photos.length > 0 && (
                        <div className="flex gap-2 flex-wrap">
                          {suggestion.photos.map((photoUrl, idx) => (
                            <button
                              key={idx}
                              onClick={() => setLightboxImage(photoUrl)}
                              className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border-2 border-forest-200 hover:border-forest-400 transition-colors focus:outline-none focus:ring-2 focus:ring-forest-500"
                            >
                              <img
                                src={photoUrl}
                                alt={`Photo ${idx + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row lg:flex-col gap-2 sm:gap-3 w-full sm:w-auto lg:min-w-[140px] mt-4 lg:mt-0">
                      <Button
                        variant="secondary"
                        size="md"
                        fullWidth
                        onClick={() => setEditingSuggestion(suggestion)}
                        disabled={processingId !== null}
                        className="justify-center"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </Button>
                      <Button
                        variant="primary"
                        size="md"
                        fullWidth
                        onClick={() => handleApprove(suggestion.id)}
                        loading={processingId === suggestion.id}
                        disabled={processingId !== null}
                        className="justify-center"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Approve
                      </Button>
                      <Button
                        variant="secondary"
                        size="md"
                        fullWidth
                        onClick={() => handleReject(suggestion.id)}
                        disabled={processingId !== null}
                        className="justify-center text-burgundy-600 hover:text-burgundy-700"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Manage Locations Section */}
        <Card className="p-4 sm:p-6 md:p-8 mt-6 sm:mt-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="font-display text-xl sm:text-2xl font-bold text-forest-900 flex items-center gap-2">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-forest-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
                Manage Locations
              </h2>
              <p className="text-xs sm:text-sm text-forest-600 mt-1">
                Edit descriptions, tags, and manage approved locations
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setShowLocations(!showLocations)} className="self-start sm:self-auto">
              {showLocations ? 'Hide' : 'Show'} Locations
            </Button>
          </div>

          {showLocations && (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {locations.map((location) => (
                <div
                  key={location.id}
                  className="flex items-center justify-between p-3 bg-forest-50 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-forest-900 truncate">{location.address}</p>
                    <p className="text-xs text-forest-500">
                      {location.viewCount || 0} views • {location.likeCount || 0} likes • {location.saveCount || 0} saved • ID: {location.id.slice(0, 8)}...
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setEditingLocation(location)}
                      disabled={deletingId !== null}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleDeleteLocation(location.id)}
                      loading={deletingId === location.id}
                      disabled={deletingId !== null}
                      className="text-burgundy-600 hover:text-burgundy-700"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </Button>
                  </div>
                </div>
              ))}
              {locations.length === 0 && (
                <p className="text-center text-forest-500 py-4">No locations found</p>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
            onClick={() => setLightboxImage(null)}
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img
            src={lightboxImage}
            alt="Full size preview"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Edit Suggestion Modal */}
      {editingSuggestion && (
        <EditEntryModal
          entry={editingSuggestion}
          isOpen={!!editingSuggestion}
          onClose={() => setEditingSuggestion(null)}
          onSave={handleSaveSuggestion}
          title="Edit Suggestion"
          type="suggestion"
        />
      )}

      {/* Edit Location Modal */}
      {editingLocation && (
        <EditEntryModal
          entry={editingLocation}
          isOpen={!!editingLocation}
          onClose={() => setEditingLocation(null)}
          onSave={handleSaveLocation}
          title="Edit Location"
          type="location"
        />
      )}
    </div>
  );
}
