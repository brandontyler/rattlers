import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapView } from '@/components/map';
import { Button, Card, Input, Select, Badge } from '@/components/ui';
import { RoutePanel } from '@/components/route';
import { useLocations } from '@/hooks';
import { useAuth } from '@/contexts/AuthContext';
import { apiService } from '@/services/api';
import type { Location } from '@/types';

export default function HomePage() {
  const { data: locations = [], isLoading: loading } = useLocations();
  const { isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [qualityFilter, setQualityFilter] = useState('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [favorites, setFavorites] = useState<Location[]>([]);
  const [loadingFavorites, setLoadingFavorites] = useState(false);

  // Fetch favorites when toggle is turned on
  useEffect(() => {
    const fetchFavorites = async () => {
      if (showFavoritesOnly && isAuthenticated) {
        setLoadingFavorites(true);
        try {
          const response = await apiService.getFavorites();
          setFavorites(response.data || []);
        } catch (error) {
          console.error('Failed to fetch favorites:', error);
          setFavorites([]);
        } finally {
          setLoadingFavorites(false);
        }
      }
    };

    fetchFavorites();
  }, [showFavoritesOnly, isAuthenticated]);

  // Filter locations based on search and filters
  const filteredLocations = useMemo(() => {
    // Start with either all locations or just favorites
    const baseLocations = showFavoritesOnly ? favorites : locations;

    return baseLocations.filter((loc) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          loc.address.toLowerCase().includes(query) ||
          (loc.description || '').toLowerCase().includes(query) ||
          (loc.aiDescription || '').toLowerCase().includes(query) ||
          (loc.decorations || []).some((d) => d.toLowerCase().includes(query));
        if (!matchesSearch) return false;
      }

      // Quality filter
      if (qualityFilter) {
        if (loc.displayQuality !== qualityFilter) return false;
      }

      return true;
    });
  }, [locations, favorites, showFavoritesOnly, searchQuery, qualityFilter]);

  return (
    <div className="animate-fade-in">
      {/* Hero Section */}
      <section className="gradient-burgundy text-white py-20 md:py-32 relative overflow-hidden grain-texture">
        {/* Decorative elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 text-6xl animate-pulse-soft">✨</div>
          <div className="absolute top-20 right-20 text-5xl animate-pulse-soft" style={{ animationDelay: '0.5s' }}>⭐</div>
          <div className="absolute bottom-20 left-1/4 text-4xl animate-pulse-soft" style={{ animationDelay: '1s' }}>🎄</div>
          <div className="absolute bottom-10 right-1/3 text-5xl animate-pulse-soft" style={{ animationDelay: '1.5s' }}>❄️</div>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <Badge variant="gold" className="mb-6 text-lg px-6 py-2 animate-slide-up">
              🎅 Holiday Season 2025
            </Badge>

            <h1 className="font-display font-bold text-cream-50 mb-6 text-balance animate-slide-up" style={{ animationDelay: '0.1s' }}>
              Discover the Magic of
              <span className="block text-gold-300">Christmas Lights in DFW</span>
            </h1>

            <p className="text-xl md:text-2xl text-cream-100 mb-8 leading-relaxed animate-slide-up" style={{ animationDelay: '0.2s' }}>
              Explore over <span className="font-bold text-gold-300">{locations.length || 146} spectacular displays</span> across the Dallas-Fort Worth area.
              Plan your perfect tour and create magical memories this holiday season.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up" style={{ animationDelay: '0.3s' }}>
              <Button variant="gold" size="lg" onClick={() => document.getElementById('map-section')?.scrollIntoView({ behavior: 'smooth' })}>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                Explore Map
              </Button>
              <Link to="/submit">
                <Button variant="secondary" size="lg">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Share a Display
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <Card className="text-center card-glow">
              <div className="text-5xl md:text-6xl font-display font-bold text-burgundy-600 mb-2">
                {locations.length || '...'}
              </div>
              <p className="text-forest-700 font-medium">Light Displays</p>
              <p className="text-sm text-forest-500 mt-1">And growing every day!</p>
            </Card>

            <Card className="text-center card-glow">
              <div className="text-5xl md:text-6xl font-display font-bold text-forest-600 mb-2">
                0
              </div>
              <p className="text-forest-700 font-medium">Community Reviews</p>
              <p className="text-sm text-forest-500 mt-1">Be the first to review!</p>
            </Card>

            <Card className="text-center card-glow">
              <div className="text-5xl md:text-6xl font-display font-bold text-gold-600 mb-2">
                0
              </div>
              <p className="text-forest-700 font-medium">Routes Planned</p>
              <p className="text-sm text-forest-500 mt-1">Coming soon!</p>
            </Card>
          </div>
        </div>
      </section>

      {/* Search and Map Section */}
      <section id="map-section" className="py-16 gradient-winter">
        <div className="container mx-auto px-4">
          {/* Search and Filters */}
          <Card className="mb-8 max-w-5xl mx-auto">
            <h3 className="font-display text-2xl font-semibold text-forest-900 mb-6 flex items-center gap-2">
              <svg className="w-6 h-6 text-burgundy-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Find Your Perfect Display
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                type="text"
                placeholder="Search by address or featured items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />

              <Select
                value={qualityFilter}
                onChange={(e) => setQualityFilter(e.target.value)}
              >
                <option value="">All Display Levels</option>
                <option value="spectacular">Spectacular (Must-see)</option>
                <option value="impressive">Impressive</option>
                <option value="moderate">Moderate</option>
                <option value="minimal">Minimal</option>
              </Select>
            </div>

            {/* Favorites Filter Toggle */}
            {isAuthenticated && (
              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                  disabled={loadingFavorites}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg transition-all
                    ${showFavoritesOnly
                      ? 'bg-burgundy-600 text-white hover:bg-burgundy-700'
                      : 'bg-cream-100 text-forest-700 hover:bg-cream-200'
                    }
                    ${loadingFavorites ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                >
                  <svg className="w-5 h-5" fill={showFavoritesOnly ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  <span className="font-medium">
                    {loadingFavorites ? 'Loading...' : 'My Favorites Only'}
                  </span>
                  {showFavoritesOnly && !loadingFavorites && (
                    <span className="text-xs bg-white bg-opacity-20 px-2 py-0.5 rounded">
                      {favorites.length}
                    </span>
                  )}
                </button>
              </div>
            )}

            {/* Active filters indicator */}
            {(searchQuery || qualityFilter || showFavoritesOnly) && (
              <div className="mt-4 flex items-center gap-2 text-sm text-forest-600">
                <span>Showing {filteredLocations.length} of {showFavoritesOnly ? favorites.length : locations.length} displays</span>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setQualityFilter('');
                    setShowFavoritesOnly(false);
                  }}
                  className="text-burgundy-600 hover:text-burgundy-700 underline"
                >
                  Clear filters
                </button>
              </div>
            )}
          </Card>

          {/* Interactive Map */}
          <div className="max-w-7xl mx-auto">
            {loading ? (
              <div className="h-[650px] bg-cream-100 rounded-xl flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-burgundy-600 mx-auto mb-4"></div>
                  <p className="text-forest-600">Loading locations...</p>
                </div>
              </div>
            ) : (
              <MapView
                locations={filteredLocations}
                height="650px"
                onLocationClick={(location) => {
                  console.log('Location clicked:', location);
                }}
              />
            )}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <h2 className="font-display text-4xl md:text-5xl font-bold text-forest-900 mb-4">
              How It Works
            </h2>
            <p className="text-lg text-forest-600">
              Finding and sharing Christmas magic has never been easier
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <Card className="text-center">
              <div className="w-16 h-16 bg-burgundy-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-burgundy-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="font-display text-xl font-semibold text-forest-900 mb-2">
                1. Explore the Map
              </h3>
              <p className="text-forest-600">
                Browse our interactive map to discover amazing light displays near you. Filter by rating, distance, and more.
              </p>
            </Card>

            <Card className="text-center">
              <div className="w-16 h-16 bg-forest-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-forest-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <h3 className="font-display text-xl font-semibold text-forest-900 mb-2">
                2. Plan Your Route
              </h3>
              <p className="text-forest-600">
                Add your favorite displays to create a custom tour. Get directions and make the most of your evening.
              </p>
            </Card>

            <Card className="text-center">
              <div className="w-16 h-16 bg-gold-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gold-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>
              <h3 className="font-display text-xl font-semibold text-forest-900 mb-2">
                3. Share the Joy
              </h3>
              <p className="text-forest-600">
                Leave positive feedback and share new displays to help the community grow. Spread the holiday cheer!
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 gradient-forest text-cream-50 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 right-10 text-9xl">🎄</div>
          <div className="absolute bottom-10 left-10 text-8xl">⭐</div>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-6">
              Ready to Start Your Journey?
            </h2>
            <p className="text-xl text-cream-100 mb-8">
              Join our community of Christmas enthusiasts and help families create unforgettable holiday memories.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="gold" size="lg" onClick={() => document.getElementById('map-section')?.scrollIntoView({ behavior: 'smooth' })}>
                Get Started Now
              </Button>
              <Link to="/submit">
                <Button variant="secondary" size="lg">
                  Share Your Display
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Route Panel (floating) */}
      <RoutePanel />
    </div>
  );
}
