import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Button from './ui/Button';

export default function Layout() {
  const { isAuthenticated, user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-cream-50">
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
                <p className="text-xs text-cream-200 font-body">
                  Discover the magic of the season
                </p>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              <Link
                to="/"
                className="text-cream-100 hover:text-gold-300 transition-colors font-medium"
              >
                Explore Map
              </Link>

              {isAuthenticated ? (
                <>
                  <Link
                    to="/submit"
                    className="text-cream-100 hover:text-gold-300 transition-colors font-medium"
                  >
                    Submit Location
                  </Link>
                  <Link
                    to="/profile"
                    className="text-cream-100 hover:text-gold-300 transition-colors font-medium"
                  >
                    Profile
                  </Link>
                  {user?.isAdmin && (
                    <Link
                      to="/admin"
                      className="text-cream-100 hover:text-gold-300 transition-colors font-medium flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                      </svg>
                      Admin
                    </Link>
                  )}
                  <button
                    onClick={() => logout()}
                    className="text-cream-100 hover:text-burgundy-300 transition-colors font-medium"
                  >
                    Logout
                  </button>
                  <div className="flex items-center gap-2 pl-4 border-l border-cream-300/30">
                    <div className="w-8 h-8 rounded-full bg-gold-500 flex items-center justify-center text-forest-900 font-bold text-sm">
                      {user?.email?.[0].toUpperCase() || 'U'}
                    </div>
                    <span className="text-sm text-cream-200 max-w-[120px] truncate">
                      {user?.email}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    state={{ from: location.pathname }}
                    className="text-cream-100 hover:text-gold-300 transition-colors font-medium"
                  >
                    Login
                  </Link>
                  <Link to="/signup">
                    <Button variant="gold" size="sm">
                      Sign Up
                    </Button>
                  </Link>
                </>
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
            <nav className="md:hidden mt-4 pt-4 border-t border-cream-300/30 space-y-3 animate-fade-in">
              <Link
                to="/"
                className="block text-cream-100 hover:text-gold-300 transition-colors font-medium py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Explore Map
              </Link>
              {isAuthenticated ? (
                <>
                  <Link
                    to="/submit"
                    className="block text-cream-100 hover:text-gold-300 transition-colors font-medium py-2"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Submit Location
                  </Link>
                  <Link
                    to="/profile"
                    className="block text-cream-100 hover:text-gold-300 transition-colors font-medium py-2"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Profile
                  </Link>
                  {user?.isAdmin && (
                    <Link
                      to="/admin"
                      className="block text-cream-100 hover:text-gold-300 transition-colors font-medium py-2"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Admin
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      logout();
                      setMobileMenuOpen(false);
                    }}
                    className="block w-full text-left text-cream-100 hover:text-burgundy-300 transition-colors font-medium py-2"
                  >
                    Logout
                  </button>
                  <div className="pt-2 text-sm text-cream-200">{user?.email}</div>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    state={{ from: location.pathname }}
                    className="block text-cream-100 hover:text-gold-300 transition-colors font-medium py-2"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Login
                  </Link>
                  <Link
                    to="/signup"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Button variant="gold" size="sm" fullWidth>
                      Sign Up
                    </Button>
                  </Link>
                </>
              )}
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
                {isAuthenticated && user?.isAdmin && (
                  <Link
                    to="/admin"
                    className="block text-cream-200 hover:text-gold-300 transition-colors text-sm"
                  >
                    Admin Dashboard
                  </Link>
                )}
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
