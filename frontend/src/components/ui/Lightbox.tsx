import { useEffect } from 'react';

interface LightboxProps {
  images: string[];
  currentIndex: number;
  onClose: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  altText?: string;
}

export default function Lightbox({
  images,
  currentIndex,
  onClose,
  onNext,
  onPrev,
  altText = 'Photo'
}: LightboxProps) {
  const hasMultiple = images.length > 1;
  const canGoPrev = hasMultiple && currentIndex > 0;
  const canGoNext = hasMultiple && currentIndex < images.length - 1;

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && canGoPrev && onPrev) {
        onPrev();
      } else if (e.key === 'ArrowRight' && canGoNext && onNext) {
        onNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onPrev, onNext, canGoPrev, canGoNext]);

  // Prevent body scroll when lightbox is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 animate-fade-in"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-50 w-10 h-10 flex items-center justify-center bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full transition-colors"
        aria-label="Close"
      >
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Photo counter */}
      {hasMultiple && (
        <div className="absolute top-4 left-4 z-50 px-3 py-1 bg-black bg-opacity-50 text-white text-sm rounded-full">
          {currentIndex + 1} / {images.length}
        </div>
      )}

      {/* Previous button */}
      {canGoPrev && onPrev && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPrev();
          }}
          className="absolute left-4 z-50 w-12 h-12 flex items-center justify-center bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full transition-colors"
          aria-label="Previous photo"
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {/* Image */}
      <div
        className="relative max-w-7xl max-h-full p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={images[currentIndex]}
          alt={`${altText} ${currentIndex + 1}`}
          className="max-w-full max-h-[90vh] object-contain rounded-lg"
        />
      </div>

      {/* Next button */}
      {canGoNext && onNext && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
          className="absolute right-4 z-50 w-12 h-12 flex items-center justify-center bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full transition-colors"
          aria-label="Next photo"
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* Keyboard hints */}
      {hasMultiple && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2 bg-black bg-opacity-50 text-white text-xs rounded-full">
          Use arrow keys to navigate • ESC to close
        </div>
      )}
    </div>
  );
}
