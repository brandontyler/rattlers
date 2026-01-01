import { useState, useEffect } from 'react';
import { Button, Card } from '@/components/ui';
import { CheckInStatus, CHECK_IN_STATUS_LABELS } from '@/types';

interface CheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (status: CheckInStatus, note?: string) => Promise<void>;
  locationAddress: string;
}

export default function CheckInModal({
  isOpen,
  onClose,
  onSubmit,
  locationAddress,
}: CheckInModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<CheckInStatus | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedStatus(null);
      setNote('');
      setError('');
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!selectedStatus) {
      setError('Please select a status');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      await onSubmit(selectedStatus, note.trim() || undefined);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit check-in. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const statuses = Object.entries(CHECK_IN_STATUS_LABELS) as [CheckInStatus, { label: string; icon: string; description: string }][];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-display text-2xl font-bold text-forest-900">
                Check In
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

          {/* Status Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-forest-700 mb-2">
              How does this display look right now?
            </label>
            <div className="grid grid-cols-2 gap-3">
              {statuses.map(([key, value]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedStatus(key)}
                  disabled={isLoading}
                  className={`text-left p-4 rounded-lg border-2 transition-all ${
                    selectedStatus === key
                      ? 'border-burgundy-500 bg-burgundy-50'
                      : 'border-forest-200 hover:border-forest-300 bg-white'
                  } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className="flex flex-col items-center text-center gap-2">
                    <span className="text-3xl">{value.icon}</span>
                    <div>
                      <div className="font-medium text-forest-900">{value.label}</div>
                      <div className="text-xs text-forest-500 mt-1">{value.description}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Note (optional) */}
          {selectedStatus && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-forest-700 mb-2">
                Add a note (optional)
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                disabled={isLoading}
                placeholder="e.g., Snow machine running tonight!"
                className="w-full px-3 py-2 border-2 border-forest-200 rounded-lg focus:outline-none focus:border-burgundy-500 resize-none"
                rows={2}
                maxLength={280}
              />
              <p className="text-xs text-forest-400 mt-1 text-right">
                {note.length}/280
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
                  Your check-in helps other visitors know if this display is on tonight. Thanks for contributing!
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
              disabled={!selectedStatus}
              className="flex-1"
            >
              {isLoading ? 'Submitting...' : 'Check In'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
