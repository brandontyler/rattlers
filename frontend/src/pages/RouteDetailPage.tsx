import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { Button, Card, Badge, LoadingSpinner } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useRoute } from '@/contexts/RouteContext';
import { apiService } from '@/services/api';
import type { SavedRoute } from '@/types';
import { getShortAddress } from '@/utils/address';

// Custom numbered marker icons
const createNumberedIcon = (number: number) => {
  return L.divIcon({
    className: 'custom-numbered-marker',
    html: `<div class="w-8 h-8 rounded-full bg-burgundy-600 text-white font-bold flex items-center justify-center text-sm shadow-lg border-2 border-white">${number}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

export default function RouteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { addStop, clearRoute } = useRoute();

  const [route, setRoute] = useState<SavedRoute | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasLiked, setHasLiked] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showCopied, setShowCopied] = useState(false);

  const isLikingRef = useRef(false);
  const isSavingRef = useRef(false);

  useEffect(() => {
    const fetchRoute = async () => {
      if (!id) return;

      try {
        setLoading(true);
        const response = await apiService.getRouteById(id);
        if (response.success && response.data) {
          setRoute(response.data);
          setHasLiked(response.data.userLiked ?? false);
          setHasSaved(response.data.userSaved ?? false);
        } else {
          setError('Route not found');
        }
      } catch (err) {
        console.error('Failed to fetch route:', err);
        setError('Failed to load route');
      } finally {
        setLoading(false);
      }
    };

    fetchRoute();
  }, [id]);

  const handleLike = async () => {
    if (!isAuthenticated || isLikingRef.current || !route) return;
    isLikingRef.current = true;
    setIsLiking(true);

    const previousLiked = hasLiked;
    setHasLiked(!hasLiked);

    try {
      const response = await apiService.submitRouteFeedback(route.id, { type: 'like' });
      if (response.success && response.data) {
        setHasLiked(response.data.liked ?? false);
        // Update local count
        setRoute(prev => prev ? {
          ...prev,
          likeCount: response.data?.liked
            ? prev.likeCount + 1
            : Math.max(0, prev.likeCount - 1)
        } : null);
      }
    } catch (err) {
      console.error('Failed to toggle like:', err);
      setHasLiked(previousLiked);
    } finally {
      isLikingRef.current = false;
      setIsLiking(false);
    }
  };

  const handleSave = async () => {
    if (!isAuthenticated || isSavingRef.current || !route) return;
    isSavingRef.current = true;
    setIsSaving(true);

    const previousSaved = hasSaved;
    setHasSaved(!hasSaved);

    try {
      const response = await apiService.submitRouteFeedback(route.id, { type: 'save' });
      if (response.success && response.data) {
        setHasSaved(response.data.saved ?? false);
      }
    } catch (err) {
      console.error('Failed to toggle save:', err);
      setHasSaved(previousSaved);
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  };

  const handleStartRoute = () => {
    if (!route?.locations) return;

    // Clear current route and add all stops from this saved route
    clearRoute();
    route.locations.forEach(loc => addStop(loc));
    navigate('/');
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !route) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h2 className="font-display text-3xl font-bold text-forest-900 mb-4">
          Route Not Found
        </h2>
        <p className="text-forest-600 mb-8">
          {error || "We couldn't find the route you're looking for."}
        </p>
        <Button onClick={() => navigate('/routes')}>
          Browse Routes
        </Button>
      </div>
    );
  }

  const _isOwner = user?.id === route.createdBy;
  const locations = route.locations || [];
  const mapCenter = locations.length > 0
    ? { lat: locations[0].lat, lng: locations[0].lng }
    : { lat: 32.7767, lng: -96.7970 }; // Default to Dallas

  // Create polyline coordinates
  const polylinePositions = locations.map(loc => [loc.lat, loc.lng] as [number, number]);

  return (
    <div className="animate-fade-in">
      {/* Breadcrumb */}
      <div className="bg-cream-100 py-4">
        <div className="container mx-auto px-4">
          <nav className="flex items-center gap-2 text-sm">
            <Link to="/" className="text-forest-600 hover:text-forest-700">Home</Link>
            <span className="text-forest-400">/</span>
            <Link to="/routes" className="text-forest-600 hover:text-forest-700">Routes</Link>
            <span className="text-forest-400">/</span>
            <span className="text-forest-900 font-medium">{route.title}</span>
          </nav>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <Badge variant="forest">
                    {route.stopCount} stops
                  </Badge>
                  <Badge variant="burgundy">
                    ~{route.estimatedMinutes} min
                  </Badge>
                  {route.totalMiles > 0 && (
                    <Badge variant="gold">
                      {route.totalMiles} mi
                    </Badge>
                  )}
                </div>
                <h1 className="font-display text-3xl md:text-4xl font-bold text-forest-900 mb-2">
                  {route.title}
                </h1>
                <div className="flex items-center gap-4 text-forest-600 flex-wrap">
                  <div className="flex items-center gap-1">
                    <svg className="w-5 h-5 text-burgundy-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                    </svg>
                    <span>{route.likeCount} likes</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <svg className="w-5 h-5 text-forest-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                    </svg>
                    <span>{route.saveCount} saved</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <svg className="w-5 h-5 text-gold-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                    <span>{route.startCount} started</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Button variant="gold" onClick={handleStartRoute}>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Start This Route
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={handleLike}
                    disabled={!isAuthenticated || isLiking}
                    className={hasLiked ? 'bg-burgundy-50 border-burgundy-600' : ''}
                  >
                    <svg className="w-5 h-5" fill={hasLiked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={handleSave}
                    disabled={!isAuthenticated || isSaving}
                    className={hasSaved ? 'bg-gold-50 border-gold-600' : ''}
                  >
                    <svg className="w-5 h-5" fill={hasSaved ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                  </Button>
                </div>
              </div>
            </div>

            {/* Creator info */}
            {route.createdByUsername && (
              <div className="flex items-center gap-2 text-sm text-forest-600">
                <div className="w-6 h-6 rounded-full bg-forest-100 flex items-center justify-center text-forest-600 font-semibold text-xs">
                  {route.createdByUsername.charAt(0).toUpperCase()}
                </div>
                <span>Created by {route.createdByUsername}</span>
                <span>•</span>
                <span>{new Date(route.createdAt).toLocaleDateString()}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Map and Description */}
            <div className="lg:col-span-2 space-y-6">
              {/* Route Map */}
              <Card padding="none" className="overflow-hidden">
                <div className="h-96">
                  <MapContainer
                    center={[mapCenter.lat, mapCenter.lng]}
                    zoom={12}
                    className="h-full w-full"
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    />
                    {/* Route line */}
                    {polylinePositions.length > 1 && (
                      <Polyline
                        positions={polylinePositions}
                        color="#7C2D36"
                        weight={3}
                        opacity={0.7}
                        dashArray="10, 10"
                      />
                    )}
                    {/* Numbered markers */}
                    {locations.map((loc, index) => (
                      <Marker
                        key={loc.id}
                        position={[loc.lat, loc.lng]}
                        icon={createNumberedIcon(index + 1)}
                      >
                        <Popup>
                          <div className="text-sm">
                            <strong>Stop {index + 1}</strong>
                            <p>{getShortAddress(loc.address)}</p>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                  </MapContainer>
                </div>
              </Card>

              {/* Description */}
              {route.description && (
                <Card>
                  <h2 className="font-display text-2xl font-semibold text-forest-900 mb-4">
                    About This Route
                  </h2>
                  <p className="text-forest-700 leading-relaxed whitespace-pre-line">
                    {route.description}
                  </p>
                </Card>
              )}

              {/* Tags */}
              {route.tags && route.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {route.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 rounded-full bg-forest-100 text-forest-700 text-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Stops List */}
              <Card>
                <h2 className="font-display text-2xl font-semibold text-forest-900 mb-4">
                  Route Stops ({locations.length})
                </h2>
                <div className="space-y-4">
                  {locations.map((loc, index) => (
                    <Link
                      key={loc.id}
                      to={`/location/${loc.id}`}
                      className="flex gap-4 p-3 rounded-lg hover:bg-cream-50 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-burgundy-600 text-white font-bold flex items-center justify-center flex-shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-forest-900 truncate">
                          {getShortAddress(loc.address)}
                        </h3>
                        {loc.description && (
                          <p className="text-sm text-forest-600 line-clamp-1">
                            {loc.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-1 text-xs text-forest-500">
                          {loc.displayQuality && (
                            <span className="capitalize">{loc.displayQuality}</span>
                          )}
                          {loc.likeCount > 0 && (
                            <span>{loc.likeCount} likes</span>
                          )}
                        </div>
                      </div>
                      {loc.photos && loc.photos[0] && (
                        <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                          <img
                            src={loc.photos[0]}
                            alt={loc.address}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              </Card>
            </div>

            {/* Right Column - Quick Actions */}
            <div className="space-y-6">
              <Card>
                <h3 className="font-display text-lg font-semibold text-forest-900 mb-4">
                  Route Stats
                </h3>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-burgundy-600">{route.stopCount}</div>
                    <div className="text-sm text-forest-600">Stops</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-burgundy-600">~{route.estimatedMinutes}</div>
                    <div className="text-sm text-forest-600">Minutes</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-burgundy-600">{route.totalMiles}</div>
                    <div className="text-sm text-forest-600">Miles</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-burgundy-600">{route.startCount}</div>
                    <div className="text-sm text-forest-600">Started</div>
                  </div>
                </div>
              </Card>

              <Card>
                <h3 className="font-display text-lg font-semibold text-forest-900 mb-4">
                  Share This Route
                </h3>
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={handleCopyLink}
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  {showCopied ? 'Copied!' : 'Copy Link'}
                </Button>
              </Card>

              {!isAuthenticated && (
                <Card className="bg-burgundy-50 border-2 border-burgundy-200">
                  <h3 className="font-display text-lg font-semibold text-burgundy-900 mb-2">
                    Sign in to save routes
                  </h3>
                  <p className="text-sm text-burgundy-700 mb-4">
                    Create an account to save your favorite routes and create your own!
                  </p>
                  <Link to="/login">
                    <Button variant="primary" fullWidth>
                      Sign In
                    </Button>
                  </Link>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
