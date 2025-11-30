import { Outlet, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function Layout() {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-primary-600 text-white shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center space-x-2">
              <span className="text-2xl">🎄</span>
              <h1 className="text-xl font-bold">DFW Christmas Lights</h1>
            </Link>

            <nav className="flex items-center space-x-4">
              <Link to="/" className="hover:text-primary-100 transition-colors">
                Map
              </Link>

              {isAuthenticated ? (
                <>
                  <Link to="/submit" className="hover:text-primary-100 transition-colors">
                    Submit Location
                  </Link>
                  {user?.isAdmin && (
                    <Link to="/admin" className="hover:text-primary-100 transition-colors">
                      Admin
                    </Link>
                  )}
                  <button
                    onClick={() => logout()}
                    className="hover:text-primary-100 transition-colors"
                  >
                    Logout
                  </button>
                  <span className="text-sm text-primary-100">
                    {user?.email}
                  </span>
                </>
              ) : (
                <>
                  <Link to="/login" className="hover:text-primary-100 transition-colors">
                    Login
                  </Link>
                  <Link
                    to="/signup"
                    className="bg-white text-primary-600 px-4 py-2 rounded-lg hover:bg-primary-50 transition-colors"
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-6">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm">
            Made with ❤️ for the DFW community | © {new Date().getFullYear()}
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Helping families find the magic of Christmas lights
          </p>
        </div>
      </footer>
    </div>
  );
}
