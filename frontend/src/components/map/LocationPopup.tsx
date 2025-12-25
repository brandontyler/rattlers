import { useState, useEffect, useRef } from 'react';
import type { Location, ReportCategory } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useAchievements } from '@/contexts/AchievementContext';
import { apiService } from '@/services/api';
import { getShortAddress } from '@/utils/address';
import ReportModal from '@/components/ReportModal';

interface LocationPopupProps {
  location: Location;
  onFeedbackSubmit?: () => void;
}

export default function LocationPopup({ location, onFeedbackSubmit }: LocationPopupProps) {
  const { isAuthenticated } = useAuth();
  const { unlockAchievement, isUnlocked } = useAchievements();

  const [optimisticLiked, setOptimisticLiked] = useState(false);
  const [optimisticLikeCount, setOptimisticLikeCount] = useState(location.likeCount || 0);
  const [favorited, setFavorited] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [isFavoriting, setIsFavoriting] = useState(false);
  const [reported, setReported] = useState(false);
  const [, setHasError] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  const isLikingRef = useRef(false);
  const isReportingRef = useRef(false);
  const isFavoritingRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) return;

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
    if (!isAuthenticated || isLikingRef.current) return;
    isLikingRef.current = true;

    const previousLiked = optimisticLiked;
    const previousCount = optimisticLikeCount;
    const newLikedState = !previousLiked;

    setOptimisticLiked(newLikedState);
    setOptimisticLikeCount(prev => newLikedState ? prev + 1 : Math.max(prev - 1, 0));
    setIsLiking(true);
    setHasError(false);

    try {
      const response = await apiService.submitFeedback(location.id, { type: 'like' });
      if (response.success && response.data) {
        const serverLikedResult = response.data.liked ?? false;
        setOptimisticLiked(serverLikedResult);
        if (serverLikedResult && !isUnlocked('heart-of-gold')) {
          unlockAchievement('heart-of-gold');
        }
        onFeedbackSubmit?.();
      } else {
        throw new Error('Server returned unsuccessful response');
      }
    } catch (error) {
      console.error('Failed to toggle like:', error);
      setOptimisticLiked(previousLiked);
      setOptimisticLikeCount(previousCount);
      setHasError(true);
      setTimeout(() => setHasError(false), 3000);
    } finally {
      isLikingRef.current = false;
      setIsLiking(false);
    }
  };

  const handleReportClick = () => {
    if (!isAuthenticated || reported) return;
    setShowReportModal(true);
  };

  const handleReportSubmit = async (category: ReportCategory, reason: string) => {
    if (isReportingRef.current) return;
    isReportingRef.current = true;
    setIsReporting(true);

    try {
      await apiService.reportInactive(location.id, { reason, category });
      setReported(true);
      onFeedbackSubmit?.();
    } catch (error) {
      console.error('Failed to submit report:', error);
      throw error;
    } finally {
      isReportingRef.current = false;
      setIsReporting(false);
    }
  };

  const handlePopupInteraction = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
  };

  const hasPhotos = location.photos && location.photos.length > 0;

  // Use inline styles to ensure rendering inside Leaflet popup
  const containerStyle: React.CSSProperties = {
    width: '260px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: '14px',
    color: '#1a1a1a',
  };

  const imageContainerStyle: React.CSSProperties = {
    width: '100%',
    height: '100px',
    overflow: 'hidden',
    position: 'relative',
  };

  const imageStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  };

  const contentStyle: React.CSSProperties = {
    padding: '12px',
  };

  const badgeStyle: React.CSSProperties = {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '9999px',
    fontSize: '11px',
    fontWeight: '500',
    marginBottom: '6px',
    backgroundColor: location.status === 'active' ? '#d1fae5' : '#fecaca',
    color: location.status === 'active' ? '#065f46' : '#991b1b',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '16px',
    fontWeight: '600',
    color: '#064e3b',
    marginBottom: '4px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  const tagContainerStyle: React.CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px',
    marginBottom: '8px',
  };

  const tagStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 6px',
    borderRadius: '9999px',
    backgroundColor: '#fefce8',
    color: '#365314',
    fontSize: '11px',
    border: '1px solid #d9f99d',
  };

  const statsStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    marginBottom: '8px',
    fontSize: '12px',
    color: '#6b7280',
  };

  const buttonRowStyle: React.CSSProperties = {
    display: 'flex',
    gap: '6px',
    marginBottom: '8px',
  };

  const iconButtonStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px',
    borderRadius: '8px',
    border: 'none',
    cursor: isAuthenticated ? 'pointer' : 'not-allowed',
    backgroundColor: '#f3f4f6',
    color: '#6b7280',
  };

  const likeButtonStyle: React.CSSProperties = {
    ...iconButtonStyle,
    flex: 1,
    gap: '4px',
    fontSize: '12px',
    fontWeight: '500',
    backgroundColor: optimisticLiked ? '#fce7f3' : '#fdf2f8',
    color: optimisticLiked ? '#be185d' : '#db2777',
  };

  const viewDetailsStyle: React.CSSProperties = {
    display: 'block',
    width: '100%',
    textAlign: 'center',
    padding: '10px',
    backgroundColor: '#be123c',
    color: 'white',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    textDecoration: 'none',
  };

  const photoBadgeStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: '4px',
    right: '4px',
    padding: '2px 6px',
    backgroundColor: 'rgba(0,0,0,0.7)',
    color: 'white',
    fontSize: '11px',
    borderRadius: '9999px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  };

  return (
    <div
      style={containerStyle}
      onClick={handlePopupInteraction}
      onTouchStart={handlePopupInteraction}
      onTouchEnd={handlePopupInteraction}
    >
      {/* Image */}
      {hasPhotos && (
        <div style={imageContainerStyle}>
          <img
            src={location.photos[0]}
            alt={location.address}
            style={imageStyle}
            loading="eager"
          />
          {location.photos.length > 1 && (
            <div style={photoBadgeStyle}>
              <svg width="12" height="12" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
              </svg>
              {location.photos.length}
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div style={contentStyle}>
        {/* Status badge */}
        {location.status && (
          <div style={badgeStyle}>{location.status}</div>
        )}

        {/* Title */}
        <div style={titleStyle}>{getShortAddress(location.address)}</div>

        {/* Tags */}
        {location.decorations && location.decorations.length > 0 && (
          <div style={tagContainerStyle}>
            {location.decorations.slice(0, 2).map((tag, index) => (
              <span key={index} style={tagStyle}>{tag}</span>
            ))}
            {location.decorations.length > 2 && (
              <span style={{ fontSize: '11px', color: '#6b7280' }}>
                +{location.decorations.length - 2}
              </span>
            )}
          </div>
        )}

        {/* Stats */}
        <div style={statsStyle}>
          <svg width="14" height="14" fill="#be185d" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
          </svg>
          <span>{optimisticLikeCount}</span>
        </div>

        {/* Action buttons */}
        <div style={buttonRowStyle}>
          <button
            onClick={handleFavorite}
            disabled={!isAuthenticated || isFavoriting}
            style={{
              ...iconButtonStyle,
              backgroundColor: favorited ? '#fef3c7' : '#fffbeb',
              color: favorited ? '#b45309' : '#d97706',
            }}
            title={favorited ? 'Saved' : 'Save'}
          >
            <svg width="16" height="16" fill={favorited ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </button>

          <button
            onClick={handleLike}
            disabled={!isAuthenticated || isLiking}
            style={likeButtonStyle}
            title={optimisticLiked ? 'Unlike' : 'Like'}
          >
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
            </svg>
            {optimisticLiked ? 'Liked' : 'Like'}
          </button>

          <button
            onClick={handleReportClick}
            disabled={!isAuthenticated || isReporting || reported}
            style={iconButtonStyle}
            title={reported ? 'Reported' : 'Report'}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </button>
        </div>

        {/* Report Modal */}
        <ReportModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          onSubmit={handleReportSubmit}
          locationAddress={getShortAddress(location.address)}
        />

        {/* Sign in prompt */}
        {!isAuthenticated && (
          <p style={{ fontSize: '11px', color: '#6b7280', marginBottom: '8px', textAlign: 'center' }}>
            <a href="/login" style={{ color: '#be123c', textDecoration: 'underline' }}>Sign in</a> to like or report
          </p>
        )}

        {/* View Details */}
        <a href={`/location/${location.id}`} style={viewDetailsStyle}>
          View Details
        </a>
      </div>
    </div>
  );
}
