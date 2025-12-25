import { useState, useEffect } from 'react';
import { Button, Card } from '@/components/ui';
import { ReportCategory, REPORT_CATEGORIES } from '@/types';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (category: ReportCategory, reason: string) => Promise<void>;
  locationAddress: string;
}

export default function ReportModal({
  isOpen,
  onClose,
  onSubmit,
  locationAddress,
}: ReportModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<ReportCategory | null>(null);
  const [additionalDetails, setAdditionalDetails] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedCategory(null);
      setAdditionalDetails('');
      setError('');
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!selectedCategory) {
      setError('Please select an issue type');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const categoryInfo = REPORT_CATEGORIES[selectedCategory];
      const reason = additionalDetails
        ? `${categoryInfo.label}: ${additionalDetails}`
        : categoryInfo.label;

      await onSubmit(selectedCategory, reason);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit report. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const categories = Object.entries(REPORT_CATEGORIES) as [ReportCategory, { label: string; description: string }][];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-display text-2xl font-bold text-forest-900">
                Report an Issue
              </h2>
              <p className="text-sm text-forest-600 mt-1">
                {locationAddress}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-forest-400 hover:text-forest-600 transition-colors"
              disabled={isLoading}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-burgundy-50 border-2 border-burgundy-200 text-burgundy-800 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          {/* Issue Type Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-forest-700 mb-2">
              What's wrong with this listing?
            </label>
            <div className="space-y-2">
              {categories.map(([key, value]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedCategory(key)}
                  disabled={isLoading}
                  className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                    selectedCategory === key
                      ? 'border-burgundy-500 bg-burgundy-50'
                      : 'border-forest-200 hover:border-forest-300 bg-white'
                  } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedCategory === key
                        ? 'border-burgundy-500 bg-burgundy-500'
                        : 'border-forest-300'
                    }`}>
                      {selectedCategory === key && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-forest-900">{value.label}</div>
                      <div className="text-xs text-forest-500">{value.description}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Additional Details (optional) */}
          {selectedCategory && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-forest-700 mb-2">
                Additional details (optional)
              </label>
              <textarea
                value={additionalDetails}
                onChange={(e) => setAdditionalDetails(e.target.value)}
                disabled={isLoading}
                placeholder="Provide any additional context that might help..."
                className="w-full px-3 py-2 border-2 border-forest-200 rounded-lg focus:outline-none focus:border-burgundy-500 resize-none"
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-forest-400 mt-1 text-right">
                {additionalDetails.length}/500
              </p>
            </div>
          )}

          {/* Info Box */}
          <div className="bg-cream-100 border border-forest-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-forest-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-sm text-forest-700">
                  Your report helps keep our listings accurate. Locations with multiple reports will be flagged for review.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              loading={isLoading}
              disabled={!selectedCategory}
              className="flex-1"
            >
              {isLoading ? 'Submitting...' : 'Submit Report'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
