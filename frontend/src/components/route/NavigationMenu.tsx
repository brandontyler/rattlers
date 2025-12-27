import { useState, useRef, useEffect } from 'react';
import type { Location } from '@/types';
import {
  NavigationApp,
  NAVIGATION_APPS,
  getPreferredNavigationApp,
  setPreferredNavigationApp,
  openNavigation,
} from '@/utils/navigation';

interface NavigationMenuProps {
  stops: Location[];
  disabled?: boolean;
}

export default function NavigationMenu({ stops, disabled }: NavigationMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [preferredApp, setPreferredApp] = useState<NavigationApp>('google');
  const [showStopSelector, setShowStopSelector] = useState(false);
  const [selectedApp, setSelectedApp] = useState<NavigationApp | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Load preferred app on mount
  useEffect(() => {
    setPreferredApp(getPreferredNavigationApp());
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowStopSelector(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAppSelect = (app: NavigationApp) => {
    setPreferredApp(app);
    setPreferredNavigationApp(app);

    if (NAVIGATION_APPS[app].supportsMultiStop) {
      // Google Maps - open full route
      openNavigation(app, stops);
      setIsOpen(false);
    } else {
      // Apple Maps or Waze - show stop selector
      setSelectedApp(app);
      setShowStopSelector(true);
    }
  };

  const handleStopSelect = (stopIndex: number) => {
    if (selectedApp) {
      openNavigation(selectedApp, stops, stopIndex);
      setIsOpen(false);
      setShowStopSelector(false);
    }
  };

  const handleQuickNavigate = () => {
    if (NAVIGATION_APPS[preferredApp].supportsMultiStop) {
      openNavigation(preferredApp, stops);
    } else {
      // For single-destination apps, open to first stop
      openNavigation(preferredApp, stops, 0);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <div className="flex">
        {/* Main navigate button */}
        <button
          onClick={handleQuickNavigate}
          disabled={disabled || stops.length === 0}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-forest-600 text-white rounded-l-lg hover:bg-forest-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          Navigate
        </button>

        {/* Dropdown toggle */}
        <button
          onClick={() => {
            setIsOpen(!isOpen);
            setShowStopSelector(false);
          }}
          disabled={disabled || stops.length === 0}
          className="flex items-center justify-center px-2 bg-forest-600 text-white rounded-r-lg hover:bg-forest-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors border-l border-forest-500"
        >
          <svg
            className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-lg shadow-xl border border-forest-200 overflow-hidden z-50">
          {!showStopSelector ? (
            <>
              <div className="px-3 py-2 bg-forest-50 border-b border-forest-100">
                <span className="text-xs font-medium text-forest-600 uppercase tracking-wide">
                  Choose Navigation App
                </span>
              </div>
              <div className="py-1">
                {Object.values(NAVIGATION_APPS).map((app) => (
                  <button
                    key={app.id}
                    onClick={() => handleAppSelect(app.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-forest-50 transition-colors ${
                      preferredApp === app.id ? 'bg-forest-50' : ''
                    }`}
                  >
                    <span className="text-xl">{app.icon}</span>
                    <div className="flex-1">
                      <div className="font-medium text-forest-800">{app.name}</div>
                      <div className="text-xs text-forest-500">
                        {app.supportsMultiStop
                          ? `Full route with ${stops.length} stops`
                          : 'Navigate stop-by-stop'}
                      </div>
                    </div>
                    {preferredApp === app.id && (
                      <svg
                        className="w-5 h-5 text-forest-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
              <div className="px-3 py-2 bg-amber-50 border-t border-amber-100">
                <p className="text-xs text-amber-700">
                  <strong>Note:</strong> Apple Maps and Waze don't support multi-stop routes via
                  links. You'll navigate one stop at a time.
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="px-3 py-2 bg-forest-50 border-b border-forest-100 flex items-center gap-2">
                <button
                  onClick={() => setShowStopSelector(false)}
                  className="text-forest-600 hover:text-forest-800"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>
                <span className="text-xs font-medium text-forest-600 uppercase tracking-wide">
                  {selectedApp && NAVIGATION_APPS[selectedApp].icon} Navigate to Stop
                </span>
              </div>
              <div className="py-1 max-h-48 overflow-y-auto">
                {stops.map((stop, index) => (
                  <button
                    key={stop.id}
                    onClick={() => handleStopSelect(index)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-forest-50 transition-colors"
                  >
                    <span className="flex items-center justify-center w-6 h-6 bg-forest-600 text-white rounded-full text-xs font-bold">
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-forest-800 truncate">
                        {stop.address.split(',')[0]}
                      </div>
                    </div>
                    <svg
                      className="w-4 h-4 text-forest-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
