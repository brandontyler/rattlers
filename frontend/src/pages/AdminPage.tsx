import { useState, useEffect } from 'react';
import { Button, Card, Badge } from '@/components/ui';
import { apiService } from '@/services/api';

interface Suggestion {
  id: string;
  address: string;
  description: string;
  lat: number;
  lng: number;
  photos: string[];
  status: string;
  submittedBy: string;
  submittedByEmail?: string;
  createdAt: string;
}

export default function AdminPage() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [locationCount, setLocationCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

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
    } catch {
      // Silently fail - count is not critical
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
    <div className="min-h-[calc(100vh-300px)] gradient-winter py-12 px-4 animate-fade-in">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-burgundy-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-burgundy-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h1 className="font-display text-3xl md:text-4xl font-bold text-forest-900">
                Admin Dashboard
              </h1>
              <p className="text-forest-600">Manage locations and community suggestions</p>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6 card-glow">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 bg-gold-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-gold-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              {suggestions.length > 0 && <Badge variant="gold">New</Badge>}
            </div>
            <p className="text-4xl font-display font-bold text-forest-900 mb-1">
              {isLoading ? '...' : suggestions.length}
            </p>
            <p className="text-sm font-medium text-forest-600">Pending Suggestions</p>
          </Card>

          <Card className="p-6 card-glow">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 bg-forest-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-forest-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </div>
            <p className="text-4xl font-display font-bold text-forest-900 mb-1">{locationCount ?? '...'}</p>
            <p className="text-sm font-medium text-forest-600">Total Locations</p>
          </Card>

          <Card className="p-6 card-glow">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 bg-burgundy-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-burgundy-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                </svg>
              </div>
            </div>
            <p className="text-4xl font-display font-bold text-forest-900 mb-1">0</p>
            <p className="text-sm font-medium text-forest-600">Flagged Locations</p>
          </Card>
        </div>

        {/* Pending Suggestions Section */}
        <Card className="p-6 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-display text-2xl font-bold text-forest-900 flex items-center gap-2">
                <svg className="w-6 h-6 text-burgundy-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Pending Suggestions
              </h2>
              <p className="text-sm text-forest-600 mt-1">
                Review and approve new location submissions from the community
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={fetchSuggestions} disabled={isLoading}>
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
                  className="border-2 border-forest-100 rounded-lg p-6 hover:border-forest-200 transition-colors duration-200"
                >
                  <div className="flex flex-col lg:flex-row gap-6">
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-display text-lg font-semibold text-forest-900 mb-1">
                            {suggestion.address}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-forest-600">
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              {suggestion.submittedByEmail || 'Anonymous'}
                            </span>
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {formatDate(suggestion.createdAt)}
                            </span>
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              </svg>
                              {suggestion.lat.toFixed(4)}, {suggestion.lng.toFixed(4)}
                            </span>
                            {suggestion.photos.length > 0 && (
                              <span className="flex items-center gap-1 text-gold-600">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                {suggestion.photos.length} photo{suggestion.photos.length > 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <p className="text-forest-700 leading-relaxed mb-4">{suggestion.description}</p>
                      
                      {/* Photo Thumbnails */}
                      {suggestion.photos.length > 0 && (
                        <div className="flex gap-2 flex-wrap">
                          {suggestion.photos.map((photoUrl, idx) => (
                            <button
                              key={idx}
                              onClick={() => setLightboxImage(photoUrl)}
                              className="w-20 h-20 rounded-lg overflow-hidden border-2 border-forest-200 hover:border-forest-400 transition-colors focus:outline-none focus:ring-2 focus:ring-forest-500"
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

                    <div className="flex lg:flex-col gap-3 lg:min-w-[140px]">
                      <Button
                        variant="primary"
                        size="md"
                        fullWidth
                        onClick={() => handleApprove(suggestion.id)}
                        loading={processingId === suggestion.id}
                        disabled={processingId !== null}
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
    </div>
  );
}
