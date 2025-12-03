import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Location } from '@/types';
import Badge from '../ui/Badge';
import { useAuth } from '@/contexts/AuthContext';
import { apiService } from '@/services/api';

interface LocationPopupProps {
  location: Location;
  onFeedbackSubmit?: () => void;
}

export default function LocationPopup({ location, onFeedbackSubmit }: LocationPopupProps) {
  const { isAuthenticated } = useAuth();
  const [likeCount, setLikeCount] = useState(location.likeCount || 0);
  const [isLiking, setIsLiking] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [liked, setLiked] = useState(false);
  const [reported, setReported] = useState(false);

  const displayRating = location.averageRating
    ? location.averageRating.toFixed(1)
    : 'N/A';

  const handleLike = async () => {
    if (!isAuthenticated || isLiking || liked) return;

    setIsLiking(true);
    try {
      await apiService.submitFeedback(location.id, { type: 'like' });
      setLikeCount((prev) => prev + 1);
      setLiked(true);
      onFeedbackSubmit?.();
    } catch (error) {
      console.error('Failed to submit like:', error);
    } finally {
      setIsLiking(false);
    }
  };

  const handleReport = async () => {
    if (!isAuthenticated || isReporting || reported) return;

    setIsReporting(true);
    try {
      await apiService.reportInactive(location.id, { reason: 'No lights visible' });
      setReported(true);
      onFeedbackSubmit?.();
    } catch (error) {
      console.error('Failed to submit report:', error);
    } finally {
      setIsReporting(false);
    }
  };

  return (
    <div className="min-w-[280px] max-w-[320px]">
      {/* Image if available */}
      {location.photos && location.photos.length > 0 && (
        <div className="w-full h-40 overflow-hidden -mx-0 -mt-0 mb-3">
          <img
            src={location.photos[0]}
            alt={location.address}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Content */}
      <div className="p-3">
        {/* Status badge */}
        {location.status && (
          <Badge
            variant={location.status === 'active' ? 'forest' : 'burgundy'}
            className="mb-2"
          >
            {location.status}
          </Badge>
        )}

        {/* Address */}
        <h3 className="font-display font-semibold text-lg text-forest-900 mb-2">
          {location.address}
        </h3>

        {/* Description preview */}
        {location.description && (
          <p className="text-sm text-forest-600 mb-3 line-clamp-2">
            {location.description}
          </p>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 mb-3 text-sm">
          {/* Rating */}
          <div className="flex items-center gap-1">
            <svg
              className="w-4 h-4 text-gold-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="font-medium text-forest-700">{displayRating}</span>
          </div>

          {/* Like count */}
          <div className="flex items-center gap-1">
            <svg
              className="w-4 h-4 text-burgundy-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
            </svg>
            <span className="text-forest-600">{likeCount}</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 mb-3">
          {/* Like button */}
          <button
            onClick={handleLike}
            disabled={!isAuthenticated || isLiking || liked}
            className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              liked
                ? 'bg-burgundy-100 text-burgundy-700 cursor-default'
                : isAuthenticated
                ? 'bg-burgundy-50 text-burgundy-600 hover:bg-burgundy-100'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
            title={!isAuthenticated ? 'Sign in to like' : liked ? 'Already liked' : 'Like this display'}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
            </svg>
            {liked ? 'Liked!' : isLiking ? '...' : 'Like'}
          </button>

          {/* Report button */}
          <button
            onClick={handleReport}
            disabled={!isAuthenticated || isReporting || reported}
            className={`flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              reported
                ? 'bg-gray-100 text-gray-500 cursor-default'
                : isAuthenticated
                ? 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
            title={!isAuthenticated ? 'Sign in to report' : reported ? 'Reported' : 'Report as inactive'}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            {reported ? 'Reported' : isReporting ? '...' : 'Report'}
          </button>
        </div>

        {/* Sign in prompt */}
        {!isAuthenticated && (
          <p className="text-xs text-gray-500 mb-3 text-center">
            <Link to="/login" className="text-burgundy-600 hover:underline">Sign in</Link> to like or report
          </p>
        )}

        {/* View Details Link */}
        <Link
          to={`/location/${location.id}`}
          className="inline-block w-full text-center px-4 py-2 bg-burgundy-600 text-cream-50 rounded-lg font-medium hover:bg-burgundy-700 transition-colors"
        >
          View Details
        </Link>
      </div>
    </div>
  );
}
