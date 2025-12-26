import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Button, Card, Badge, LoadingSpinner, Lightbox } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { apiService } from '@/services/api';
import { useLocation as useLocationData } from '@/hooks';
import { getShortAddress, getDirectionsUrl } from '@/utils/address';
import AddPhotoModal from '@/components/AddPhotoModal';
import ReportModal from '@/components/ReportModal';
import type { ReportCategory } from '@/types';

export default function LocationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { data: location, isLoading: loading, error: queryError, refetch } = useLocationData(id || '');
  const [hasLiked, setHasLiked] = useState(false);
  const [hasReported, setHasReported] = useState(false);
  const [hasFavorited, setHasFavorited] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [isFavoriting, setIsFavoriting] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showLightbox, setShowLightbox] = useState(false);
  const [showCopied, setShowCopied] = useState(false);
  const [showAddPhotoModal, setShowAddPhotoModal] = useState(false);
  const [hasPendingPhotoSubmission, setHasPendingPhotoSubmission] = useState(false);
  const [photoSubmissionSuccess, setPhotoSubmissionSuccess] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  // Refs for bulletproof click protection (state updates are async, refs are sync)
  const isLikingRef = useRef(false);
  const isReportingRef = useRef(false);
  const isFavoritingRef = useRef(false);

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
          setHasFavorited(response.data.favorited ?? false);
        }
      } catch (err) {
        console.error('Failed to fetch feedback status:', err);
        setHasLiked(false);
      }
    };

    fetchFeedbackStatus();
  }, [id, isAuthenticated]);

  // Check for pending photo submission (only for locations without photos)
  useEffect(() => {
    if (!isAuthenticated || !id || !location) {
      return;
    }

    // Only check if location has no photos
    if (location.photos && location.photos.length > 0) {
      return;
    }

    const checkPendingPhotoSubmission = async () => {
      try {
        const response = await apiService.hasPendingPhotoSubmission(id);
        if (response.success && response.data) {
          setHasPendingPhotoSubmission(response.data.hasPending);
        }
      } catch (err) {
        console.error('Failed to check pending photo submission:', err);
      }
    };

    checkPendingPhotoSubmission();
  }, [id, isAuthenticated, location]);

  const handlePhotoSubmissionSuccess = () => {
    setHasPendingPhotoSubmission(true);
    setPhotoSubmissionSuccess(true);
    // Hide success message after 5 seconds
    setTimeout(() => setPhotoSubmissionSuccess(false), 5000);
  };

  const handleFavorite = async () => {
    if (!isAuthenticated || !id || isFavoritingRef.current) return;
    isFavoritingRef.current = true;
    setIsFavoriting(true);
    const previousFavorited = hasFavorited;
    setHasFavorited(!hasFavorited);

    try {
      const response = await apiService.toggleFavorite(id);
      if (response.success && response.data) {
        setHasFavorited(response.data.favorited);
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      setHasFavorited(previousFavorited);
    } finally {
      isFavoritingRef.current = false;
      setIsFavoriting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (queryError || !location) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h2 className="font-display text-3xl font-bold text-forest-900 mb-4">
          Location Not Found
        </h2>
        <p className="text-forest-600 mb-8">
          {queryError ? "Failed to load location" : "We couldn't find the location you're looking for."}
        </p>
        <Button onClick={() => navigate('/')}>
          Back to Map
        </Button>
      </div>
    );
  }

  const handleGetDirections = () => {
    // Use address-based URL for better display in Google Maps
    const url = getDirectionsUrl(location.address, location.lat, location.lng);
    window.open(url, '_blank');
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
      // Refetch location to get accurate count from server
      refetch();
    } catch (err) {
      console.error('Failed to toggle like:', err);
    } finally {
      isLikingRef.current = false;
      setIsLiking(false);
    }
  };

  const handleReportClick = () => {
    if (!isAuthenticated || hasReported) return;
    setShowReportModal(true);
  };

  const handleReportSubmit = async (category: ReportCategory, reason: string) => {
    if (isReportingRef.current) return;

    isReportingRef.current = true;
    setIsReporting(true);

    try {
      await apiService.reportInactive(location.id, { reason, category });
      setHasReported(true);
    } catch (err) {
      console.error('Failed to report:', err);
      throw err;
    } finally {
      isReportingRef.current = false;
      setIsReporting(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const handleShareTwitter = () => {
    const text = `Check out this amazing Christmas light display! ${location.address}`;
    const url = window.location.href;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, '_blank', 'noopener,noreferrer');
  };

  const handleShareFacebook = () => {
    const url = window.location.href;
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    window.open(facebookUrl, '_blank', 'noopener,noreferrer');
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
                  {location.reportCount !== undefined && location.reportCount > 0 && (
                    <Badge variant="burgundy">⚠️ {location.reportCount} reports</Badge>
                  )}
                </div>
                <h1 className="font-display text-3xl md:text-4xl font-bold text-forest-900 mb-2">
                  {getShortAddress(location.address)}
                </h1>
                <div className="flex items-center gap-4 text-forest-600">
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
                  onClick={handleFavorite}
                  disabled={!isAuthenticated || isFavoriting}
                  className={hasFavorited ? 'bg-gold-50 border-gold-600' : ''}
                  title={!isAuthenticated ? 'Sign in to save' : hasFavorited ? 'Remove from favorites' : 'Save to favorites'}
                >
                  <svg className="w-5 h-5 mr-2" fill={hasFavorited ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                  {isFavoriting ? '...' : hasFavorited ? 'Saved' : 'Save'}
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
              {/* Photo Gallery or Placeholder */}
              {location.photos && location.photos.length > 0 ? (
                <Card padding="none" className="overflow-hidden">
                  <div className="relative h-96 bg-forest-100 group">
                    {/* Main Photo */}
                    <img
                      src={location.photos[currentPhotoIndex]}
                      alt={`${location.address} - Photo ${currentPhotoIndex + 1}`}
                      className="w-full h-full object-cover cursor-pointer"
                      onClick={() => setShowLightbox(true)}
                    />

                    {/* Photo Counter */}
                    {location.photos.length > 1 && (
                      <div className="absolute top-4 right-4 px-3 py-1 bg-black bg-opacity-60 text-white text-sm rounded-full">
                        {currentPhotoIndex + 1} / {location.photos.length}
                      </div>
                    )}

                    {/* Click to expand hint */}
                    <div
                      className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer"
                      onClick={() => setShowLightbox(true)}
                    >
                      <div className="bg-white bg-opacity-90 px-4 py-2 rounded-lg text-forest-900 font-medium pointer-events-none">
                        <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                        </svg>
                        Click to view full size
                      </div>
                    </div>

                    {/* Previous/Next Buttons (only if multiple photos) */}
                    {location.photos.length > 1 && (
                      <>
                        {currentPhotoIndex > 0 && (
                          <button
                            onClick={() => setCurrentPhotoIndex(prev => prev - 1)}
                            className="absolute left-4 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-white bg-opacity-80 hover:bg-opacity-100 rounded-full flex items-center justify-center transition-all shadow-lg"
                            aria-label="Previous photo"
                          >
                            <svg className="w-6 h-6 text-forest-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                          </button>
                        )}
                        {currentPhotoIndex < location.photos.length - 1 && (
                          <button
                            onClick={() => setCurrentPhotoIndex(prev => prev + 1)}
                            className="absolute right-4 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-white bg-opacity-80 hover:bg-opacity-100 rounded-full flex items-center justify-center transition-all shadow-lg"
                            aria-label="Next photo"
                          >
                            <svg className="w-6 h-6 text-forest-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        )}
                      </>
                    )}
                  </div>

                  {/* Thumbnail Strip (if multiple photos) */}
                  {location.photos.length > 1 && (
                    <div className="p-4 bg-cream-50 flex gap-2 overflow-x-auto">
                      {location.photos.map((photo, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentPhotoIndex(index)}
                          className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                            index === currentPhotoIndex
                              ? 'border-burgundy-600 ring-2 ring-burgundy-200'
                              : 'border-forest-200 hover:border-forest-400'
                          }`}
                        >
                          <img
                            src={photo}
                            alt={`Thumbnail ${index + 1}`}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </Card>
              ) : (
                <Card className="h-64 flex items-center justify-center gradient-winter">
                  <div className="text-center">
                    <svg className="w-20 h-20 mx-auto mb-4 text-forest-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-forest-600">No photos available yet</p>

                    {/* Photo submission success message */}
                    {photoSubmissionSuccess && (
                      <div className="mt-3 bg-gold-100 border border-gold-300 text-gold-800 px-4 py-2 rounded-lg">
                        <p className="text-sm font-medium">Photo submitted successfully!</p>
                        <p className="text-xs mt-1">Your photo is pending review.</p>
                      </div>
                    )}

                    {/* Show pending message or add photo button */}
                    {hasPendingPhotoSubmission && !photoSubmissionSuccess ? (
                      <div className="mt-3 bg-gold-50 border border-gold-200 text-gold-700 px-4 py-2 rounded-lg">
                        <p className="text-sm">Your photo is pending approval</p>
                      </div>
                    ) : !photoSubmissionSuccess && (
                      <>
                        <p className="text-sm text-forest-500 mt-1">Be the first to share a photo!</p>
                        {isAuthenticated ? (
                          <Button
                            variant="primary"
                            size="sm"
                            className="mt-4"
                            onClick={() => setShowAddPhotoModal(true)}
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Add a Photo
                          </Button>
                        ) : (
                          <p className="text-xs text-forest-400 mt-3">
                            <Link to="/login" className="underline hover:text-forest-600">Sign in</Link> to add a photo
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </Card>
              )}

              {/* Description */}
              <Card>
                <h2 className="font-display text-2xl font-semibold text-forest-900 mb-4">
                  About This Display
                </h2>
                {/* AI Description */}
                {location.aiDescription && (
                  <p className="text-forest-700 leading-relaxed mb-4">
                    {location.aiDescription}
                  </p>
                )}
                {/* User Description */}
                {location.description && location.description !== location.aiDescription && (
                  <p className="text-forest-600 leading-relaxed whitespace-pre-line text-sm italic">
                    "{location.description}"
                  </p>
                )}
                {!location.aiDescription && !location.description && (
                  <p className="text-forest-600">
                    No description available yet. Visit this display and share your experience!
                  </p>
                )}
              </Card>

              {/* Decorations & Features */}
              {(location.decorations?.length || location.categories?.length || location.theme || location.displayQuality) && (
                <Card>
                  <h2 className="font-display text-2xl font-semibold text-forest-900 mb-4">
                    What You'll See
                  </h2>

                  {/* Display Quality Badge */}
                  {location.displayQuality && (
                    <div className="mb-4">
                      <Badge variant={
                        location.displayQuality === 'spectacular' ? 'gold' :
                        location.displayQuality === 'impressive' ? 'forest' :
                        'burgundy'
                      }>
                        {location.displayQuality === 'spectacular' && '⭐ '}
                        {location.displayQuality === 'impressive' && '✨ '}
                        {location.displayQuality.charAt(0).toUpperCase() + location.displayQuality.slice(1)} Display
                      </Badge>
                    </div>
                  )}

                  {/* Theme */}
                  {location.theme && location.theme !== 'traditional' && (
                    <div className="mb-4">
                      <h3 className="text-sm font-medium text-forest-600 mb-2">Theme</h3>
                      <span className="inline-flex items-center px-3 py-1 rounded-full bg-gold-100 text-gold-800 font-medium">
                        🎭 {location.theme}
                      </span>
                    </div>
                  )}

                  {/* Decorations (specific items) */}
                  {location.decorations && location.decorations.length > 0 && (
                    <div className="mb-4">
                      <h3 className="text-sm font-medium text-forest-600 mb-2">Featured Items</h3>
                      <div className="flex flex-wrap gap-2">
                        {location.decorations.map((item, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-3 py-1 rounded-full bg-cream-100 text-forest-700 text-sm border border-forest-200"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Categories (broad types) */}
                  {location.categories && location.categories.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-forest-600 mb-2">Categories</h3>
                      <div className="flex flex-wrap gap-2">
                        {location.categories.map((category, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-3 py-1 rounded-full bg-burgundy-50 text-burgundy-700 text-sm"
                          >
                            {category}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              )}

              {/* Stats Card */}
              <Card>
                <h2 className="font-display text-2xl font-semibold text-forest-900 mb-4">
                  Community Stats
                </h2>
                <div className="flex justify-center">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-burgundy-600">{location.likeCount || 0}</div>
                    <div className="text-sm text-forest-600">Likes</div>
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

                  {location.createdByUsername && (
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-forest-100 flex items-center justify-center text-forest-600 font-semibold text-xs flex-shrink-0 mt-0.5">
                        {location.createdByUsername.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-forest-900">Submitted by</p>
                        <p className="text-sm text-forest-600">{location.createdByUsername}</p>
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              {/* Share Section */}
              <Card>
                <h3 className="font-display text-lg font-semibold text-forest-900 mb-4">
                  Share This Display
                </h3>
                <div className="space-y-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    fullWidth
                    onClick={handleCopyLink}
                    className="relative"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    {showCopied ? 'Copied!' : 'Copy Link'}
                  </Button>

                  <Button
                    variant="secondary"
                    size="sm"
                    fullWidth
                    onClick={handleShareTwitter}
                    className="hover:bg-[#1DA1F2] hover:text-white hover:border-[#1DA1F2]"
                  >
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                    Share on X
                  </Button>

                  <Button
                    variant="secondary"
                    size="sm"
                    fullWidth
                    onClick={handleShareFacebook}
                    className="hover:bg-[#1877F2] hover:text-white hover:border-[#1877F2]"
                  >
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                    Share on Facebook
                  </Button>
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
                  onClick={handleReportClick}
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

      {/* Lightbox */}
      {showLightbox && location.photos && location.photos.length > 0 && (
        <Lightbox
          images={location.photos}
          currentIndex={currentPhotoIndex}
          onClose={() => setShowLightbox(false)}
          onNext={() => setCurrentPhotoIndex(prev => Math.min(prev + 1, location.photos!.length - 1))}
          onPrev={() => setCurrentPhotoIndex(prev => Math.max(prev - 1, 0))}
          altText={location.address}
        />
      )}

      {/* Add Photo Modal */}
      <AddPhotoModal
        isOpen={showAddPhotoModal}
        onClose={() => setShowAddPhotoModal(false)}
        locationId={location.id}
        locationAddress={getShortAddress(location.address)}
        onSuccess={handlePhotoSubmissionSuccess}
      />

      {/* Report Modal */}
      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        onSubmit={handleReportSubmit}
        locationAddress={getShortAddress(location.address)}
      />
    </div>
  );
}
