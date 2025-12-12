import { Link } from 'react-router-dom';
import { Button, Card } from '@/components/ui';

interface DuplicateLocation {
  id: string;
  address: string;
  description?: string;
  aiDescription?: string;
  photos: string[];
  hasPhotos: boolean;
  likeCount: number;
  displayQuality?: string;
  decorations?: string[];
}

interface DuplicateLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  location: DuplicateLocation | null;
  hasPendingSuggestion: boolean;
}

export default function DuplicateLocationModal({
  isOpen,
  onClose,
  location,
  hasPendingSuggestion,
}: DuplicateLocationModalProps) {
  if (!isOpen) return null;

  // Case: Another user already submitted this location (pending)
  if (hasPendingSuggestion && !location) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <Card className="max-w-lg w-full">
          <div className="p-6">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gold-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gold-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="font-display text-2xl font-bold text-forest-900">
                Someone Beat You To It!
              </h2>
            </div>

            <p className="text-forest-600 text-center mb-6">
              Great minds think alike! This location has already been submitted by another holiday light hunter and is waiting for review.
            </p>

            <p className="text-forest-500 text-sm text-center mb-6">
              Check back soon - it should appear on the map once approved!
            </p>

            {/* Actions */}
            <div className="flex justify-center">
              <Button variant="primary" onClick={onClose}>
                Got it, I'll find another!
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Case: Location already exists
  if (!location) return null;

  const displayQualityColors: Record<string, string> = {
    spectacular: 'bg-gold-100 text-gold-800',
    impressive: 'bg-forest-100 text-forest-800',
    moderate: 'bg-blue-100 text-blue-800',
    minimal: 'bg-gray-100 text-gray-800',
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gold-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gold-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="font-display text-2xl font-bold text-forest-900">
              Great News!
            </h2>
            <p className="text-forest-600 mt-2">
              This location is already on our map!
            </p>
          </div>

          {/* Location Preview */}
          <div className="bg-forest-50 rounded-lg p-4 mb-6">
            {/* Photo */}
            {location.hasPhotos && location.photos[0] && (
              <div className="mb-4 rounded-lg overflow-hidden">
                <img
                  src={location.photos[0]}
                  alt={location.address}
                  className="w-full h-40 object-cover"
                />
              </div>
            )}

            {/* Address */}
            <h3 className="font-display font-semibold text-forest-900 mb-2">
              {location.address}
            </h3>

            {/* Stats Row */}
            <div className="flex items-center gap-4 text-sm text-forest-600 mb-2">
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4 text-burgundy-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
                {location.likeCount} likes
              </span>
              {location.displayQuality && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${displayQualityColors[location.displayQuality] || displayQualityColors.moderate}`}>
                  {location.displayQuality}
                </span>
              )}
            </div>

            {/* Description */}
            {(location.aiDescription || location.description) && (
              <p className="text-sm text-forest-600 line-clamp-2">
                {location.aiDescription || location.description}
              </p>
            )}
          </div>

          {/* Thank You Message */}
          <div className="bg-gold-50 border border-gold-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-gold-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-sm font-medium text-gold-900 mb-1">
                  Thank you for helping us find great displays!
                </p>
                <p className="text-xs text-gold-700">
                  {location.hasPhotos
                    ? "Have a better photo? Help make this listing shine!"
                    : "This location needs photos - be the first to add one!"}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Link to={`/locations/${location.id}`} className="flex-1">
              <Button variant="secondary" fullWidth onClick={onClose}>
                View Location
              </Button>
            </Link>
            <Link
              to={`/locations/${location.id}`}
              state={{ openAddPhoto: true }}
              className="flex-1"
            >
              <Button variant="primary" fullWidth onClick={onClose}>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Add Photos
              </Button>
            </Link>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-forest-400 hover:text-forest-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </Card>
    </div>
  );
}
