import { useState } from 'react';
import { Button, Input } from '@/components/ui';
import { apiService } from '@/services/api';
import { useAchievements } from '@/contexts/AchievementContext';
import type { Location, SavedRoute } from '@/types';

interface SaveRouteModalProps {
  isOpen: boolean;
  onClose: () => void;
  stops: Location[];
  onSaved: (route: SavedRoute) => void;
}

const ROUTE_TAGS = [
  'family-friendly',
  'spectacular-only',
  'quick-tour',
  'walkable',
  'themed',
  'inflatables',
  'traditional',
  'music-sync',
  'neighborhood',
  'drive-through',
];

export default function SaveRouteModal({ isOpen, onClose, stops, onSaved }: SaveRouteModalProps) {
  const { unlockAchievement, isUnlocked } = useAchievements();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isPublic, setIsPublic] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const handleToggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else if (selectedTags.length < 5) {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Please enter a title for your route');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const response = await apiService.createRoute({
        title: title.trim(),
        description: description.trim(),
        locationIds: stops.map(s => s.id),
        tags: selectedTags,
        isPublic,
      });

      if (response.success && response.data) {
        // Trigger "Trail Blazer" achievement for first route
        if (!isUnlocked('trail-blazer')) {
          unlockAchievement('trail-blazer');
        }

        onSaved(response.data);
        onClose();
        // Reset form
        setTitle('');
        setDescription('');
        setSelectedTags([]);
        setIsPublic(true);
      } else {
        setError(response.message || 'Failed to save route');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save route');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[1100] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-forest-100 bg-gradient-to-r from-burgundy-600 to-burgundy-700 rounded-t-xl">
          <div className="flex items-center gap-3 text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            <h2 className="font-display text-xl font-bold">Save Your Route</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-5">
          {error && (
            <div className="bg-burgundy-50 border-2 border-burgundy-200 text-burgundy-800 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Route summary */}
          <div className="bg-forest-50 rounded-lg p-3 flex items-center justify-between text-sm">
            <span className="text-forest-700">
              <span className="font-semibold">{stops.length}</span> stops in this route
            </span>
            <span className="text-forest-500">
              {stops.slice(0, 3).map(s => s.address.split(',')[0]).join(' → ')}
              {stops.length > 3 && '...'}
            </span>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-forest-700 mb-2">
              Route Title <span className="text-burgundy-500">*</span>
            </label>
            <Input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Ultimate Grinch Tour, Family-Friendly Loop"
              maxLength={100}
            />
            <p className="mt-1 text-xs text-forest-500">{title.length}/100 characters</p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-forest-700 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-field min-h-[80px] resize-y"
              placeholder="What makes this route special? Any tips for visitors?"
              maxLength={500}
            />
            <p className="mt-1 text-xs text-forest-500">{description.length}/500 characters</p>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-forest-700 mb-2">
              Tags <span className="text-forest-500 font-normal">(select up to 5)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {ROUTE_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleToggleTag(tag)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    selectedTags.includes(tag)
                      ? 'bg-burgundy-600 text-white'
                      : 'bg-forest-100 text-forest-700 hover:bg-forest-200'
                  } ${selectedTags.length >= 5 && !selectedTags.includes(tag) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={selectedTags.length >= 5 && !selectedTags.includes(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Visibility */}
          <div className="flex items-center justify-between py-2">
            <div>
              <label className="block text-sm font-medium text-forest-700">
                Share with Community
              </label>
              <p className="text-xs text-forest-500">Make this route visible to others</p>
            </div>
            <button
              type="button"
              onClick={() => setIsPublic(!isPublic)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isPublic ? 'bg-burgundy-600' : 'bg-forest-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isPublic ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-4 sm:p-6 border-t border-forest-100 bg-forest-50 rounded-b-xl">
          <Button
            variant="secondary"
            onClick={onClose}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            loading={isSaving}
            disabled={!title.trim()}
            className="flex-1"
          >
            {isSaving ? 'Saving...' : 'Save Route'}
          </Button>
        </div>
      </div>
    </div>
  );
}
