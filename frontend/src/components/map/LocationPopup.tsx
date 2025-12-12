import { useState, useEffect, useRef } from 'react';
import type { Location } from '@/types';
import Badge from '../ui/Badge';
import { useAuth } from '@/contexts/AuthContext';
import { apiService } from '@/services/api';
import { AddToRouteButton } from '@/components/route';
import { getShortAddress } from '@/utils/address';

interface LocationPopupProps {
  location: Location;
  onFeedbackSubmit?: () => void;
}

export default function LocationPopup({ location, onFeedbackSubmit }: LocationPopupProps) {
  const { isAuthenticated } = useAuth();

  // Optimistic state for instant UI updates
  const [optimisticLiked, setOptimisticLiked] = useState(false);
  const [optimisticLikeCount, setOptimisticLikeCount] = useState(location.likeCount || 0);
  const [favorited, setFavorited] = useState(false);

  const [isLiking, setIsLiking] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [isFavoriting, setIsFavoriting] = useState(false);
  const [reported, setReported] = useState(false);
  const [hasError, setHasError] = useState(false);
  
  // Refs for bulletproof click protection (state updates are async, refs are sync)
  const isLikingRef = useRef(false);
  const isReportingRef = useRef(false);
  const isFavoritingRef = useRef(false);

  // Fetch initial like and report state on mount
  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const fetchFeedbackStatus = async () => {
      try {
        const response = await apiService.getFeedbackStatus(location.id);
        if (response.success && response.data) {
          setOptimisticLiked(response.data.liked ?? false);
          setReported(response.data.reported ?? false);
          setFavorited(response.data.favorited ?? false);
        }
      } catch (error) {
        console.error('Failed to fetch feedback status:', error);
        setOptimisticLiked(false);
      }
    };

    fetchFeedbackStatus();
  }, [location.id, isAuthenticated]);

  const handleFavorite = async () => {
    if (!isAuthenticated || isFavoritingRef.current) return;
    isFavoritingRef.current = true;
    setIsFavoriting(true);
    const previousFavorited = favorited;
    setFavorited(!favorited);

    try {
      const response = await apiService.toggleFavorite(location.id);
      if (response.success && response.data) {
        setFavorited(response.data.favorited);
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      setFavorited(previousFavorited);
    } finally {
      isFavoritingRef.current = false;
      setIsFavoriting(false);
    }
  };

  const handleLike = async () => {
    // Use ref for synchronous check - state updates are async and unreliable for guards
    if (!isAuthenticated || isLikingRef.current) return;

    isLikingRef.current = true;
    
    // Store previous state for rollback
    const previousLiked = optimisticLiked;
    const previousCount = optimisticLikeCount;

    // Optimistic update - flip the state
    const newLikedState = !previousLiked;
    setOptimisticLiked(newLikedState);
    setOptimisticLikeCount(prev => newLikedState ? prev + 1 : Math.max(prev - 1, 0));
    setIsLiking(true);
    setHasError(false);

    try {
      const response = await apiService.submitFeedback(location.id, { type: 'like' });

      if (response.success && response.data) {
        // Server responded - use server truth
        const serverLikedResult = response.data.liked ?? false;
        setOptimisticLiked(serverLikedResult);

        onFeedbackSubmit?.();
      } else {
        throw new Error('Server returned unsuccessful response');
      }
    } catch (error) {
      console.error('Failed to toggle like:', error);

      // ROLLBACK optimistic update
      setOptimisticLiked(previousLiked);
      setOptimisticLikeCount(previousCount);
      setHasError(true);

      setTimeout(() => setHasError(false), 3000);
    } finally {
      isLikingRef.current = false;
      setIsLiking(false);
    }
  };

  const handleReport = async () => {
    if (!isAuthenticated || isReportingRef.current || reported) return;

    isReportingRef.current = true;
    setIsReporting(true);
    
    try {
      await apiService.reportInactive(location.id, { reason: 'No lights visible' });
      setReported(true);
      onFeedbackSubmit?.();
    } catch (error) {
      console.error('Failed to submit report:', error);
    } finally {
      isReportingRef.current = false;
      setIsReporting(false);
    }
  };

  // Prevent touch/click events from bubbling to map layer and closing popup
  const handlePopupInteraction = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      className="w-[280px] max-w-[280px] overflow-hidden"
      onClick={handlePopupInteraction}
      onTouchStart={handlePopupInteraction}
      onTouchEnd={handlePopupInteraction}
    >
      {/* Image if available */}
      {location.photos && location.photos.length > 0 && (
        <div className="w-full h-32 overflow-hidden mb-3 relative">
          <img
            src={location.photos[0]}
            alt={location.address}
            className="w-full h-full object-cover"
            loading="eager"
          />
          {/* Photo count badge */}
          {location.photos.length > 1 && (
            <div className="absolute bottom-2 right-2 px-2 py-1 bg-black bg-opacity-70 text-white text-xs rounded-full flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
              </svg>
              {location.photos.length}
            </div>
          )}
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

        {/* Address - show short version in title */}
        <h3 className="font-display font-semibold text-lg text-forest-900 mb-2">
          {getShortAddress(location.address)}
        </h3>

        {/* AI Description or user description preview */}
        {(location.aiDescription || location.description) && (
          <p className="text-sm text-forest-600 mb-2 line-clamp-2">
            {location.aiDescription || location.description}
          </p>
        )}

        {/* Tags preview (show first 3 decorations) */}
        {location.decorations && location.decorations.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {location.decorations.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-0.5 rounded-full bg-cream-100 text-forest-700 text-xs border border-forest-200"
              >
                {tag}
              </span>
            ))}
            {location.decorations.length > 3 && (
              <span className="text-xs text-forest-500">
                +{location.decorations.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Submitted by */}
        {location.createdByUsername && (
          <div className="flex items-center gap-2 mb-3 text-sm text-forest-500">
            <div className="w-6 h-6 rounded-full bg-forest-100 flex items-center justify-center text-forest-600 font-semibold text-xs">
              {location.createdByUsername.charAt(0).toUpperCase()}
            </div>
            <span>Submitted by {location.createdByUsername}</span>
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 mb-3 text-sm">
          {/* Like count */}
          <div className="flex items-center gap-1">
            <svg
              className="w-4 h-4 text-burgundy-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
            </svg>
            <span className="text-forest-600">{optimisticLikeCount}</span>
          </div>
        </div>

        {/* Add to Route button */}
        <div className="mb-3">
          <AddToRouteButton location={location} variant="compact" className="w-full justify-center" />
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 mb-3">
          {/* Favorite button */}
          <button
            onClick={handleFavorite}
            disabled={!isAuthenticated || isFavoriting}
            className={`flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              favorited
                ? 'bg-gold-100 text-gold-700 hover:bg-gold-200'
                : isAuthenticated
                ? 'bg-gold-50 text-gold-600 hover:bg-gold-100'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
            title={!isAuthenticated ? 'Sign in to save' : favorited ? 'Remove from favorites' : 'Save to favorites'}
          >
            <svg className="w-4 h-4" fill={favorited ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </button>

          {/* Like button */}
          <button
            onClick={handleLike}
            disabled={!isAuthenticated || isLiking}
            className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              optimisticLiked
                ? 'bg-burgundy-100 text-burgundy-700 hover:bg-burgundy-200'
                : isAuthenticated
                ? 'bg-burgundy-50 text-burgundy-600 hover:bg-burgundy-100'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            } ${hasError ? 'ring-2 ring-red-500' : ''}`}
            title={!isAuthenticated ? 'Sign in to like' : optimisticLiked ? 'Unlike this display' : 'Like this display'}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
            </svg>
            {isLiking ? '...' : optimisticLiked ? 'Unlike' : 'Like'}
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
            <a href="/login" className="text-burgundy-600 hover:underline">Sign in</a> to like or report
          </p>
        )}

        {/* View Details Link - use anchor tag for navigation from popup */}
        <a
          href={`/location/${location.id}`}
          className="inline-block w-full text-center px-4 py-2 bg-burgundy-600 text-white rounded-lg font-medium hover:bg-burgundy-700 transition-colors"
        >
          View Details
        </a>
      </div>
    </div>
  );
}
