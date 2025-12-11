import { useState } from 'react';
import { useRoute } from '@/contexts/RouteContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatDuration, formatDistance } from '@/utils/routeUtils';
import RouteStopCard from './RouteStopCard';
import SaveRouteModal from './SaveRouteModal';
import { Button } from '@/components/ui';
import { useNavigate } from 'react-router-dom';
import type { SavedRoute } from '@/types';

export default function RoutePanel() {
  const {
    stops,
    removeStop,
    reorderStops,
    optimizeRoute,
    clearRoute,
    stats,
    isGeneratingPdf,
    generatePdf,
    isPanelExpanded,
    setIsPanelExpanded,
  } = useRoute();

  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleGeneratePdf = async () => {
    setDownloadError(null);
    try {
      const url = await generatePdf();
      // Open the PDF in a new tab
      window.open(url, '_blank');
    } catch (err: any) {
      setDownloadError(err.message || 'Failed to generate PDF');
    }
  };

  const handleMoveUp = (index: number) => {
    if (index > 0) {
      reorderStops(index, index - 1);
    }
  };

  const handleMoveDown = (index: number) => {
    if (index < stops.length - 1) {
      reorderStops(index, index + 1);
    }
  };

  const handleSaveRoute = () => {
    if (!isAuthenticated) {
      // Redirect to login with return URL
      navigate('/login?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }
    setIsSaveModalOpen(true);
  };

  const handleRouteSaved = (route: SavedRoute) => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Don't render if no stops
  if (stops.length === 0) {
    return null;
  }

  // Collapsed state - just a floating pill
  if (!isPanelExpanded) {
    return (
      <button
        onClick={() => setIsPanelExpanded(true)}
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[1000] bg-burgundy-600 text-white px-6 py-3 rounded-full shadow-lg hover:bg-burgundy-700 transition-all hover:scale-105 flex items-center gap-3 animate-fade-in"
      >
        <span className="flex items-center justify-center w-6 h-6 bg-white text-burgundy-600 rounded-full text-sm font-bold">
          {stops.length}
        </span>
        <span className="font-medium">
          {stops.length === 1 ? '1 stop' : `${stops.length} stops`} in route
        </span>
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      </button>
    );
  }

  // Expanded state - full panel
  return (
    <div className="fixed bottom-0 left-0 right-0 z-[1000] md:left-auto md:right-4 md:bottom-4 md:w-96 animate-slide-up">
      <div className="bg-white rounded-t-2xl md:rounded-2xl shadow-2xl border border-forest-200 max-h-[70vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-forest-100 bg-gradient-to-r from-burgundy-600 to-burgundy-700 rounded-t-2xl md:rounded-t-2xl">
          <div className="flex items-center gap-2 text-white">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <span className="font-display font-semibold">Your Route</span>
          </div>
          <button
            onClick={() => setIsPanelExpanded(false)}
            className="text-white/80 hover:text-white p-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* Stats bar */}
        <div className="px-4 py-2 bg-forest-50 border-b border-forest-100 flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-forest-700">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              ~{formatDuration(stats.totalTime)}
            </span>
            <span className="flex items-center gap-1 text-forest-700">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              {formatDistance(stats.totalDistance)}
            </span>
          </div>
          <span className="text-forest-500">{stops.length} stops</span>
        </div>

        {/* Stops list */}
        <div className="flex-1 overflow-y-auto p-3 min-h-0">
          {stops.map((stop, index) => (
            <RouteStopCard
              key={stop.id}
              stop={stop}
              index={index}
              onRemove={() => removeStop(stop.id)}
              onMoveUp={() => handleMoveUp(index)}
              onMoveDown={() => handleMoveDown(index)}
              isFirst={index === 0}
              isLast={index === stops.length - 1}
            />
          ))}
        </div>

        {/* Error message */}
        {downloadError && (
          <div className="px-4 py-2 bg-burgundy-50 text-burgundy-700 text-sm">
            {downloadError}
          </div>
        )}

        {/* Actions */}
        <div className="p-3 border-t border-forest-100 bg-white rounded-b-2xl">
          {/* Success message */}
          {saveSuccess && (
            <div className="mb-2 px-3 py-2 bg-forest-50 text-forest-700 text-sm rounded-lg flex items-center gap-2">
              <svg className="w-4 h-4 text-forest-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Route saved! View it in your profile.
            </div>
          )}

          <div className="flex gap-2 mb-2">
            <button
              onClick={optimizeRoute}
              disabled={stops.length < 3}
              className="flex-1 px-3 py-2 text-sm font-medium text-forest-700 bg-forest-50 rounded-lg hover:bg-forest-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Optimize Route
            </button>
            <button
              onClick={clearRoute}
              className="px-3 py-2 text-sm font-medium text-burgundy-600 hover:text-burgundy-700 hover:bg-burgundy-50 rounded-lg transition-colors"
            >
              Clear All
            </button>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleSaveRoute}
              disabled={stops.length < 2}
              className="flex-1"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              Save Route
            </Button>
            <Button
              variant="gold"
              onClick={handleGeneratePdf}
              loading={isGeneratingPdf}
              disabled={stops.length === 0}
              className="flex-1"
            >
              {isGeneratingPdf ? 'Creating...' : 'PDF Guide'}
            </Button>
          </div>
        </div>
      </div>

      {/* Save Route Modal */}
      <SaveRouteModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        stops={stops}
        onSaved={handleRouteSaved}
      />
    </div>
  );
}
