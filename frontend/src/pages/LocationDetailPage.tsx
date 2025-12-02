import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Button, Card, Badge, LoadingSpinner } from '@/components/ui';
import type { Location } from '@/types';

// Mock location data (will be replaced with API call)
const mockLocation: Location = {
  id: '1',
  address: '123 Christmas Lane, Dallas, TX 75201',
  lat: 32.7767,
  lng: -96.7970,
  description: 'This spectacular display features over 50,000 synchronized LED lights dancing to classic Christmas music. The homeowners have been putting on this show for 15 years, bringing joy to thousands of families each season. Don\'t miss the grand finale at the top of each hour!',
  photos: [
    'https://images.unsplash.com/photo-1512389142860-9c449e58a543?w=800',
    'https://images.unsplash.com/photo-1482517967863-00e15c9b44be?w=800',
    'https://images.unsplash.com/photo-1544552866-d3ed42536cfd?w=800',
  ],
  status: 'active',
  feedbackCount: 127,
  averageRating: 4.8,
  likeCount: 456,
  reportCount: 0,
  createdAt: '2024-11-15T10:00:00Z',
  updatedAt: '2024-12-01T15:30:00Z',
};

export default function LocationDetailPage() {
  const { id: _id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [selectedPhoto, setSelectedPhoto] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);

  // In production, this would be fetched from API using _id
  const location = mockLocation;
  const loading = false;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!location) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h2 className="font-display text-3xl font-bold text-forest-900 mb-4">
          Location Not Found
        </h2>
        <p className="text-forest-600 mb-8">
          We couldn't find the location you're looking for.
        </p>
        <Button onClick={() => navigate('/')}>
          Back to Map
        </Button>
      </div>
    );
  }

  const handleGetDirections = () => {
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(location.address)}`;
    window.open(googleMapsUrl, '_blank');
  };

  const handleLike = () => {
    setHasLiked(!hasLiked);
    // In production: API call to save like
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
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <Badge
                    variant={location.status === 'active' ? 'forest' : 'burgundy'}
                  >
                    {location.status === 'active' ? '✨ Active' : '❄️ Inactive'}
                  </Badge>
                  {location.averageRating && location.averageRating >= 4.5 && (
                    <Badge variant="gold">
                      ⭐ Highly Rated
                    </Badge>
                  )}
                </div>
                <h1 className="font-display text-4xl md:text-5xl font-bold text-forest-900 mb-2">
                  {location.address}
                </h1>
                <div className="flex items-center gap-4 text-forest-600">
                  <div className="flex items-center gap-1">
                    <svg className="w-5 h-5 text-gold-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span className="font-semibold">{location.averageRating?.toFixed(1)}</span>
                    <span className="text-sm">({location.feedbackCount} reviews)</span>
                  </div>
                  <span className="text-forest-400">•</span>
                  <div className="flex items-center gap-1">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                    </svg>
                    <span>{location.likeCount} likes</span>
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
                  className={hasLiked ? 'bg-burgundy-50 border-burgundy-600' : ''}
                >
                  <svg className="w-5 h-5 mr-2" fill={hasLiked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  {hasLiked ? 'Liked' : 'Like'}
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Photos and Description */}
            <div className="lg:col-span-2 space-y-6">
              {/* Photo Gallery */}
              {location.photos && location.photos.length > 0 ? (
                <Card padding="none" className="overflow-hidden">
                  {/* Main Photo */}
                  <div className="relative h-96 bg-forest-100">
                    <img
                      src={location.photos[selectedPhoto]}
                      alt={`Photo ${selectedPhoto + 1} of ${location.address}`}
                      className="w-full h-full object-cover"
                    />
                    {location.photos.length > 1 && (
                      <>
                        <button
                          onClick={() => setSelectedPhoto((prev) => (prev - 1 + location.photos!.length) % location.photos!.length)}
                          className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-3 rounded-full shadow-soft transition-all"
                        >
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setSelectedPhoto((prev) => (prev + 1) % location.photos!.length)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-3 rounded-full shadow-soft transition-all"
                        >
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>

                  {/* Thumbnail Strip */}
                  {location.photos.length > 1 && (
                    <div className="flex gap-2 p-4 overflow-x-auto">
                      {location.photos.map((photo, index) => (
                        <button
                          key={index}
                          onClick={() => setSelectedPhoto(index)}
                          className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                            selectedPhoto === index
                              ? 'border-gold-500 scale-105'
                              : 'border-transparent hover:border-forest-300'
                          }`}
                        >
                          <img
                            src={photo}
                            alt={`Thumbnail ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </Card>
              ) : (
                <Card className="h-96 flex items-center justify-center gradient-winter">
                  <div className="text-center">
                    <svg className="w-20 h-20 mx-auto mb-4 text-forest-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-forest-600">No photos available yet</p>
                  </div>
                </Card>
              )}

              {/* Description */}
              <Card>
                <h2 className="font-display text-2xl font-semibold text-forest-900 mb-4">
                  About This Display
                </h2>
                <p className="text-forest-700 leading-relaxed whitespace-pre-line">
                  {location.description || 'No description available.'}
                </p>
              </Card>

              {/* Reviews Section */}
              <Card>
                <h2 className="font-display text-2xl font-semibold text-forest-900 mb-6">
                  Community Reviews
                </h2>
                <div className="space-y-4">
                  {/* Sample reviews - in production, these would come from API */}
                  <div className="border-b border-forest-100 pb-4 last:border-0">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-burgundy-500 flex items-center justify-center text-white font-bold">
                        S
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-forest-900">Sarah M.</span>
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <svg key={i} className="w-4 h-4 text-gold-500" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            ))}
                          </div>
                          <span className="text-sm text-forest-500">2 days ago</span>
                        </div>
                        <p className="text-forest-700">
                          Absolutely stunning! The synchronized lights to music were incredible. Our kids couldn't stop talking about it. Definitely worth the drive!
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="border-b border-forest-100 pb-4 last:border-0">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-forest-500 flex items-center justify-center text-white font-bold">
                        J
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-forest-900">John D.</span>
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <svg key={i} className="w-4 h-4 text-gold-500" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            ))}
                          </div>
                          <span className="text-sm text-forest-500">1 week ago</span>
                        </div>
                        <p className="text-forest-700">
                          A true neighborhood gem! The homeowners are so welcoming and clearly put a lot of love into this display.
                        </p>
                      </div>
                    </div>
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
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="font-medium text-forest-900">Best Time to Visit</p>
                      <p className="text-sm text-forest-600">7:00 PM - 10:00 PM</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-burgundy-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <div>
                      <p className="font-medium text-forest-900">Season</p>
                      <p className="text-sm text-forest-600">Dec 1 - Dec 31</p>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="bg-burgundy-50 border-2 border-burgundy-200">
                <h3 className="font-display text-lg font-semibold text-burgundy-900 mb-3">
                  Something Wrong?
                </h3>
                <p className="text-sm text-burgundy-700 mb-4">
                  If this display is no longer active or has incorrect information, please let us know.
                </p>
                <Button variant="secondary" size="sm" fullWidth>
                  Report Issue
                </Button>
              </Card>

              <Card className="bg-gold-50 border-2 border-gold-200">
                <h3 className="font-display text-lg font-semibold text-gold-900 mb-3">
                  Share Your Experience
                </h3>
                <p className="text-sm text-gold-700 mb-4">
                  Visited this display? Share your photos and help others discover the magic!
                </p>
                <Button variant="gold" size="sm" fullWidth>
                  Leave a Review
                </Button>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
