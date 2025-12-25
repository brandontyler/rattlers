import { useState, useRef, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Button from './ui/Button';
import { AchievementUnlockPopup } from './achievements';

export default function Layout() {
  const { isAuthenticated, user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setUserMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col bg-cream-50">
      {/* Achievement unlock popup */}
      <AchievementUnlockPopup />

      {/* Header */}
      <header className="gradient-forest text-cream-50 shadow-soft-lg sticky top-0 z-50 grain-texture">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group">
              <div className="text-4xl transform transition-transform group-hover:scale-110">
                🎄
              </div>
              <div>
                <h1 className="text-2xl font-display font-bold text-cream-50">
                  DFW Christmas Lights
                </h1>
                <p className="text-xs text-cream-200 font-body hidden sm:block">
                  Discover the magic of the season
                </p>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              {/* Primary nav - ordered by priority */}
              <Link
                to="/"
                className="text-cream-100 hover:text-gold-300 transition-colors font-medium"
              >
                Explore Map
              </Link>
              <Link
                to="/submit"
                className="text-cream-100 hover:text-gold-300 transition-colors font-medium"
              >
                Submit Location
              </Link>
              <Link
                to="/routes"
                className="text-cream-100 hover:text-gold-300 transition-colors font-medium"
              >
                Routes
              </Link>
              <Link
                to="/leaderboard"
                className="text-cream-100 hover:text-gold-300 transition-colors font-medium"
              >
                Leaderboard
              </Link>

              {/* User section */}
              {isAuthenticated ? (
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 pl-4 border-l border-cream-300/30 hover:text-gold-300 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-gold-500 flex items-center justify-center text-forest-900 font-bold text-sm">
                      {(user?.username || user?.email)?.[0].toUpperCase() || 'U'}
                    </div>
                    <span className="text-sm text-cream-100 max-w-[120px] truncate">
                      {user?.username || user?.email}
                    </span>
                    <svg
                      className={`w-4 h-4 text-cream-200 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Dropdown menu */}
                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 z-50 animate-fade-in">
                      <Link
                        to="/profile"
                        className="flex items-center gap-2 px-4 py-2 text-forest-700 hover:bg-cream-50 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Profile
                      </Link>
                      {user?.isAdmin && (
                        <Link
                          to="/admin"
                          className="flex items-center gap-2 px-4 py-2 text-forest-700 hover:bg-cream-50 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                          </svg>
                          Admin
                        </Link>
                      )}
                      <div className="border-t border-cream-200 my-2"></div>
                      <button
                        onClick={() => logout()}
                        className="flex items-center gap-2 w-full px-4 py-2 text-burgundy-600 hover:bg-cream-50 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-3 pl-4 border-l border-cream-300/30">
                  <Link
                    to="/login"
                    state={{ from: location.pathname }}
                    className="text-cream-100 hover:text-gold-300 transition-colors font-medium"
                  >
                    Sign In
                  </Link>
                  <Link to="/signup">
                    <Button variant="gold" size="sm">
                      Sign Up
                    </Button>
                  </Link>
                </div>
              )}
            </nav>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-cream-50 p-2"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {mobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <nav className="md:hidden mt-4 pt-4 border-t border-cream-300/30 animate-fade-in">
              {/* Primary links */}
              <div className="space-y-1">
                <Link
                  to="/"
                  className="block text-cream-100 hover:text-gold-300 hover:bg-cream-50/10 transition-colors font-medium py-3 px-2 rounded-lg"
                >
                  🗺️ Explore Map
                </Link>
                <Link
                  to="/submit"
                  className="block text-cream-100 hover:text-gold-300 hover:bg-cream-50/10 transition-colors font-medium py-3 px-2 rounded-lg"
                >
                  📍 Submit Location
                </Link>
                <Link
                  to="/routes"
                  className="block text-cream-100 hover:text-gold-300 hover:bg-cream-50/10 transition-colors font-medium py-3 px-2 rounded-lg"
                >
                  🛤️ Routes
                </Link>
                <Link
                  to="/leaderboard"
                  className="block text-cream-100 hover:text-gold-300 hover:bg-cream-50/10 transition-colors font-medium py-3 px-2 rounded-lg"
                >
                  🏆 Leaderboard
                </Link>
              </div>

              {/* User section */}
              <div className="mt-4 pt-4 border-t border-cream-300/30">
                {isAuthenticated ? (
                  <>
                    {/* User info */}
                    <div className="flex items-center gap-3 px-2 py-2 mb-3">
                      <div className="w-10 h-10 rounded-full bg-gold-500 flex items-center justify-center text-forest-900 font-bold">
                        {(user?.username || user?.email)?.[0].toUpperCase() || 'U'}
                      </div>
                      <div>
                        <div className="text-cream-50 font-medium">{user?.username || 'User'}</div>
                        <div className="text-cream-300 text-sm truncate max-w-[200px]">{user?.email}</div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Link
                        to="/profile"
                        className="block text-cream-100 hover:text-gold-300 hover:bg-cream-50/10 transition-colors font-medium py-3 px-2 rounded-lg"
                      >
                        👤 Profile
                      </Link>
                      {user?.isAdmin && (
                        <Link
                          to="/admin"
                          className="block text-cream-100 hover:text-gold-300 hover:bg-cream-50/10 transition-colors font-medium py-3 px-2 rounded-lg"
                        >
                          ⚙️ Admin
                        </Link>
                      )}
                      <button
                        onClick={() => logout()}
                        className="block w-full text-left text-burgundy-300 hover:text-burgundy-200 hover:bg-cream-50/10 transition-colors font-medium py-3 px-2 rounded-lg"
                      >
                        🚪 Sign Out
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="space-y-3 px-2">
                    <Link
                      to="/login"
                      state={{ from: location.pathname }}
                      className="block text-center text-cream-100 hover:text-gold-300 transition-colors font-medium py-3 border border-cream-300/30 rounded-lg"
                    >
                      Sign In
                    </Link>
                    <Link to="/signup" className="block">
                      <Button variant="gold" size="md" fullWidth>
                        Sign Up
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </nav>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-forest-900 text-cream-100 py-12 mt-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {/* Brand Column */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-3xl">🎄</span>
                <h3 className="text-xl font-display font-bold text-cream-50">
                  DFW Christmas Lights
                </h3>
              </div>
              <p className="text-cream-200 text-sm leading-relaxed">
                Helping families discover and share the magic of Christmas lights
                across the Dallas-Fort Worth area.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-display font-semibold text-cream-50 mb-4">
                Quick Links
              </h4>
              <div className="space-y-2">
                <Link
                  to="/"
                  className="block text-cream-200 hover:text-gold-300 transition-colors text-sm"
                >
                  Explore Map
                </Link>
                <Link
                  to="/submit"
                  className="block text-cream-200 hover:text-gold-300 transition-colors text-sm"
                >
                  Submit Location
                </Link>
                <Link
                  to="/routes"
                  className="block text-cream-200 hover:text-gold-300 transition-colors text-sm"
                >
                  Routes
                </Link>
                <Link
                  to="/leaderboard"
                  className="block text-cream-200 hover:text-gold-300 transition-colors text-sm"
                >
                  Leaderboard
                </Link>
              </div>
            </div>

            {/* Community */}
            <div>
              <h4 className="font-display font-semibold text-cream-50 mb-4">
                Join Our Community
              </h4>
              <p className="text-cream-200 text-sm mb-4">
                Share your favorite displays and help make this holiday season magical
                for everyone.
              </p>
              <div className="flex gap-3">
                <span className="text-2xl cursor-pointer hover:scale-110 transition-transform">
                  ⭐
                </span>
                <span className="text-2xl cursor-pointer hover:scale-110 transition-transform">
                  ✨
                </span>
                <span className="text-2xl cursor-pointer hover:scale-110 transition-transform">
                  🎅
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-forest-700 pt-8 text-center">
            <p className="text-sm text-cream-300">
              Made with ❤️ for the DFW community | © {new Date().getFullYear()}
            </p>
            <p className="text-xs text-cream-400 mt-2">
              Bringing joy, one light display at a time ✨
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
