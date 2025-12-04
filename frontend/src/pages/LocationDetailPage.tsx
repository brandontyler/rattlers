import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Button, Card, Badge, LoadingSpinner } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { apiService } from '@/services/api';
import type { Location } from '@/types';

export default function LocationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [location, setLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasLiked, setHasLiked] = useState(false);
  const [hasReported, setHasReported] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  
  // Refs for bulletproof click protection (state updates are async, refs are sync)
  const isLikingRef = useRef(false);
  const isReportingRef = useRef(false);

  useEffect(() => {
    const fetchLocation = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const response = await apiService.getLocationById(id);
        if (response.success && response.data) {
          setLocation(response.data);
        } else {
          setError('Location not found');
        }
      } catch (err) {
        console.error('Failed to fetch location:', err);
        setError('Failed to load location');
      } finally {
        setLoading(false);
      }
    };
    fetchLocation();
  }, [id]);

  // Fetch initial like and report state on mount
  useEffect(() => {
    if (!isAuthenticated || !id) {
      return;
    }

    const fetchFeedbackStatus = async () => {
      try {
        const response = await apiService.getFeedbackStatus(id);
        if (response.success && response.data) {
          setHasLiked(response.data.liked ?? false);
          setHasReported(response.data.reported ?? false);
        }
      } catch (err) {
        console.error('Failed to fetch feedback status:', err);
        setHasLiked(false);
      }
    };

    fetchFeedbackStatus();
  }, [id, isAuthenticated]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !location) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h2 className="font-display text-3xl font-bold text-forest-900 mb-4">
          Location Not Found
        </h2>
        <p className="text-forest-600 mb-8">
          {error || "We couldn't find the location you're looking for."}
        </p>
        <Button onClick={() => navigate('/')}>
          Back to Map
        </Button>
      </div>
    );
  }

  const handleGetDirections = () => {
    // Use Google Maps URL if available, otherwise use address
    if (location.googleMapsUrl) {
      window.open(location.googleMapsUrl, '_blank');
    } else {
      const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lng}`;
      window.open(googleMapsUrl, '_blank');
    }
  };

  const handleLike = async () => {
    // Use ref for synchronous check - state updates are async and unreliable for guards
    if (!isAuthenticated || isLikingRef.current || !location) return;
    
    isLikingRef.current = true;
    setIsLiking(true);
    
    try {
      const response = await apiService.submitFeedback(location.id, { type: 'like' });
      if (response.success && response.data) {
        const serverLiked = response.data.liked ?? false;
        setHasLiked(serverLiked);
      }
      // Always refetch location to get accurate count from server
      const locationResponse = await apiService.getLocationById(location.id);
      if (locationResponse.success && locationResponse.data) {
        setLocation(locationResponse.data);
      }
    } catch (err) {
      console.error('Failed to toggle like:', err);
    } finally {
      isLikingRef.current = false;
      setIsLiking(false);
    }
  };

  const handleReport = async () => {
    if (!isAuthenticated || isReportingRef.current || hasReported) return;
    
    isReportingRef.current = true;
    setIsReporting(true);
    
    try {
      await apiService.reportInactive(location.id, { reason: 'No lights visible' });
      setHasReported(true);
    } catch (err) {
      console.error('Failed to report:', err);
    } finally {
      isReportingRef.current = false;
      setIsReporting(false);
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Breadcrumb */}
      <div className="bg-cream-100 py-4">
        <div className="container mx-auto px-4">
          <nav className="flex items-center gap-2 text-sm">
            <Link to="/" className="text-forest-600 hover:text-forest-700">
              Home
            </Link>
            <span className="text-forest-400">/</span>
            <span className="text-forest-900 font-medium">Location Details</span>
          </nav>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header Section */}
          <div className="mb-8">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <Badge variant={location.status === 'active' ? 'forest' : 'burgundy'}>
                    {location.status === 'active' ? '✨ Active' : '❄️ Inactive'}
                  </Badge>
                  {location.averageRating !== undefined && location.averageRating >= 4.5 && (
                    <Badge variant="gold">⭐ Highly Rated</Badge>
                  )}
                  {location.reportCount !== undefined && location.reportCount > 0 && (
                    <Badge variant="burgundy">⚠️ {location.reportCount} reports</Badge>
                  )}
                </div>
                <h1 className="font-display text-3xl md:text-4xl font-bold text-forest-900 mb-2">
                  {location.address}
                </h1>
                <div className="flex items-center gap-4 text-forest-600">
                  <div className="flex items-center gap-1">
                    <svg className="w-5 h-5 text-gold-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span className="font-semibold">{location.averageRating?.toFixed(1) || 'N/A'}</span>
                    <span className="text-sm">({location.feedbackCount || 0} reviews)</span>
                  </div>
                  <span className="text-forest-400">•</span>
                  <div className="flex items-center gap-1">
                    <svg className="w-5 h-5 text-burgundy-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                    </svg>
                    <span>{location.likeCount || 0} likes</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Button variant="gold" onClick={handleGetDirections}>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                  Get Directions
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleLike}
                  disabled={!isAuthenticated || isLiking}
                  className={hasLiked ? 'bg-burgundy-50 border-burgundy-600' : ''}
                >
                  <svg className="w-5 h-5 mr-2" fill={hasLiked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  {isLiking ? '...' : hasLiked ? 'Unlike' : 'Like'}
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Photos and Description */}
            <div className="lg:col-span-2 space-y-6">
              {/* Photo or Placeholder */}
              {location.photos && location.photos.length > 0 ? (
                <Card padding="none" className="overflow-hidden">
                  <div className="relative h-96 bg-forest-100">
                    <img
                      src={location.photos[0]}
                      alt={location.address}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </Card>
              ) : (
                <Card className="h-64 flex items-center justify-center gradient-winter">
                  <div className="text-center">
                    <svg className="w-20 h-20 mx-auto mb-4 text-forest-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-forest-600">No photos available yet</p>
                    <p className="text-sm text-forest-500 mt-1">Be the first to share a photo!</p>
                  </div>
                </Card>
              )}

              {/* Description */}
              <Card>
                <h2 className="font-display text-2xl font-semibold text-forest-900 mb-4">
                  About This Display
                </h2>
                <p className="text-forest-700 leading-relaxed whitespace-pre-line">
                  {location.description || 'No description available yet. Visit this display and share your experience!'}
                </p>
              </Card>

              {/* Stats Card */}
              <Card>
                <h2 className="font-display text-2xl font-semibold text-forest-900 mb-4">
                  Community Stats
                </h2>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-3xl font-bold text-gold-600">{location.averageRating?.toFixed(1) || '—'}</div>
                    <div className="text-sm text-forest-600">Avg Rating</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-burgundy-600">{location.likeCount || 0}</div>
                    <div className="text-sm text-forest-600">Likes</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-forest-600">{location.feedbackCount || 0}</div>
                    <div className="text-sm text-forest-600">Reviews</div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Right Column - Quick Info */}
            <div className="space-y-6">
              <Card>
                <h3 className="font-display text-lg font-semibold text-forest-900 mb-4">
                  Quick Info
                </h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-burgundy-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <div>
                      <p className="font-medium text-forest-900">Address</p>
                      <p className="text-sm text-forest-600">{location.address}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-burgundy-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                    <div>
                      <p className="font-medium text-forest-900">Coordinates</p>
                      <p className="text-sm text-forest-600">{Number(location.lat).toFixed(4)}, {Number(location.lng).toFixed(4)}</p>
                    </div>
                  </div>

                  {location.createdAt && (
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-burgundy-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <div>
                        <p className="font-medium text-forest-900">Added</p>
                        <p className="text-sm text-forest-600">{new Date(location.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              <Card className="bg-burgundy-50 border-2 border-burgundy-200">
                <h3 className="font-display text-lg font-semibold text-burgundy-900 mb-3">
                  Something Wrong?
                </h3>
                <p className="text-sm text-burgundy-700 mb-4">
                  If this display is no longer active or has incorrect information, please let us know.
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  fullWidth
                  onClick={handleReport}
                  disabled={!isAuthenticated || isReporting || hasReported}
                >
                  {hasReported ? 'Reported - Thank you!' : isReporting ? 'Reporting...' : 'Report Issue'}
                </Button>
                {!isAuthenticated && (
                  <p className="text-xs text-burgundy-600 mt-2 text-center">
                    <Link to="/login" className="underline">Sign in</Link> to report issues
                  </p>
                )}
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
