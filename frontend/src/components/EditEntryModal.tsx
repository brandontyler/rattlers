import React, { useState, useEffect } from 'react';
import { Button, Input, Select } from '@/components/ui';

interface EditableEntry {
  id: string;
  description?: string;
  aiDescription?: string;
  // For suggestions, tags are in detectedTags; for locations, they're in decorations
  detectedTags?: string[];
  decorations?: string[];
  displayQuality?: 'minimal' | 'moderate' | 'impressive' | 'spectacular';
}

interface EditEntryModalProps {
  entry: EditableEntry;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updates: Partial<EditableEntry>) => Promise<void>;
  title?: string;
  type: 'suggestion' | 'location';
}

const DISPLAY_QUALITY_OPTIONS = [
  { value: 'minimal', label: 'Minimal' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'impressive', label: 'Impressive' },
  { value: 'spectacular', label: 'Spectacular' },
];

export default function EditEntryModal({
  entry,
  isOpen,
  onClose,
  onSave,
  title = 'Edit Entry',
  type,
}: EditEntryModalProps) {
  const [description, setDescription] = useState('');
  const [aiDescription, setAiDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [displayQuality, setDisplayQuality] = useState<string>('');
  const [newTag, setNewTag] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  // Initialize form with entry data
  useEffect(() => {
    if (entry && isOpen) {
      setDescription(entry.description || '');
      setAiDescription(entry.aiDescription || '');
      // Use detectedTags for suggestions, decorations for locations
      setTags(entry.detectedTags || entry.decorations || []);
      setDisplayQuality(entry.displayQuality || '');
      setNewTag('');
      setError('');
    }
  }, [entry, isOpen]);

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleAddTag = () => {
    const trimmedTag = newTag.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setNewTag('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError('');

    try {
      const updates: Partial<EditableEntry> = {
        description,
        aiDescription,
        displayQuality: displayQuality as EditableEntry['displayQuality'] || undefined,
      };

      // Use the appropriate field name based on entry type
      if (type === 'suggestion') {
        updates.detectedTags = tags;
      } else {
        updates.decorations = tags;
      }

      await onSave(updates);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-forest-100">
          <h2 className="font-display text-xl sm:text-2xl font-bold text-forest-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-forest-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5 text-forest-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-6">
          {error && (
            <div className="bg-burgundy-50 border-2 border-burgundy-200 text-burgundy-800 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* User Description */}
          <div>
            <label className="block text-sm font-medium text-forest-700 mb-2">
              User Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-field min-h-[80px] resize-y"
              placeholder="Enter description..."
            />
          </div>

          {/* AI Description */}
          <div>
            <label className="block text-sm font-medium text-forest-700 mb-2">
              AI Description
            </label>
            <textarea
              value={aiDescription}
              onChange={(e) => setAiDescription(e.target.value)}
              className="input-field min-h-[80px] resize-y"
              placeholder="Enter AI-generated description..."
            />
          </div>

          {/* Featured Items Section */}
          <div>
            <label className="block text-sm font-medium text-forest-700 mb-2">
              Featured Items
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 text-sm bg-forest-100 text-forest-700 px-3 py-1.5 rounded-full group"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="w-4 h-4 flex items-center justify-center rounded-full bg-forest-200 hover:bg-burgundy-500 hover:text-white transition-colors"
                    aria-label={`Remove ${tag}`}
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
              {tags.length === 0 && (
                <span className="text-sm text-forest-400 italic">No items added</span>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Add a featured item..."
                className="flex-1"
              />
              <Button type="button" variant="secondary" onClick={handleAddTag} disabled={!newTag.trim()}>
                Add
              </Button>
            </div>
          </div>

          {/* Display Quality */}
          <div>
            <Select
              label="Display Quality"
              value={displayQuality}
              onChange={(e) => setDisplayQuality(e.target.value)}
            >
              <option value="">Select quality level...</option>
              {DISPLAY_QUALITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 sm:p-6 border-t border-forest-100 bg-forest-50">
          <Button variant="secondary" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} loading={isSaving}>
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
