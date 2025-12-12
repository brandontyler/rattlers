import { useState, useRef, useEffect } from 'react';
import { Button, Card } from '@/components/ui';
import { apiService } from '@/services/api';

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_PHOTOS = 3;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'];

const isImageFile = (file: File): boolean => {
  if (file.type) {
    const mimeType = file.type.toLowerCase().trim();
    if (ALLOWED_TYPES.includes(mimeType)) return true;
    if (mimeType.startsWith('image/')) {
      // Fall through to extension check
    }
  }

  const fileName = file.name.toLowerCase();
  const lastDotIndex = fileName.lastIndexOf('.');
  if (lastDotIndex === -1) {
    if (file.type && file.type.toLowerCase().startsWith('image/')) return true;
    return false;
  }

  const ext = fileName.substring(lastDotIndex + 1);
  return ALLOWED_EXTENSIONS.includes(ext);
};

interface AddPhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  locationId: string;
  locationAddress: string;
  onSuccess: () => void;
}

export default function AddPhotoModal({
  isOpen,
  onClose,
  locationId,
  locationAddress,
  onSuccess,
}: AddPhotoModalProps) {
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      photoPreviewUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setPhotos([]);
      setPhotoPreviewUrls([]);
      setError('');
      setUploadProgress('');
    }
  }, [isOpen]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (files.length + photos.length > MAX_PHOTOS) {
      setError(`You can upload a maximum of ${MAX_PHOTOS} photos`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    for (const file of files) {
      if (!isImageFile(file)) {
        setError(`Invalid file type. Only JPEG, PNG, WebP, and HEIC images are allowed.`);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        setError(`Photo "${file.name}" is too large. Maximum size is 20MB.`);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
    }

    const newPreviewUrls = files.map(file => URL.createObjectURL(file));
    setPhotos([...photos, ...files]);
    setPhotoPreviewUrls([...photoPreviewUrls, ...newPreviewUrls]);
    setError('');

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removePhoto = (index: number) => {
    URL.revokeObjectURL(photoPreviewUrls[index]);
    setPhotos(photos.filter((_, i) => i !== index));
    setPhotoPreviewUrls(photoPreviewUrls.filter((_, i) => i !== index));
  };

  const uploadPhotos = async (): Promise<string[]> => {
    const photoKeys: string[] = [];

    for (let i = 0; i < photos.length; i++) {
      const file = photos[i];
      setUploadProgress(`Uploading photo ${i + 1} of ${photos.length}...`);

      try {
        const response = await apiService.getUploadUrl({
          contentType: file.type,
          fileSize: file.size,
        });

        if (!response.success || !response.data) {
          throw new Error(response.message || 'Failed to get upload URL');
        }

        const { uploadUrl, fields, photoKey } = response.data;
        await apiService.uploadPhoto(uploadUrl, fields, file);
        photoKeys.push(photoKey);
      } catch (err: any) {
        throw new Error(`Failed to upload photo ${i + 1}: ${err.message}`);
      }
    }

    setUploadProgress('');
    return photoKeys;
  };

  const handleSubmit = async () => {
    if (photos.length === 0) {
      setError('Please select at least one photo');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      // Upload photos first
      const photoKeys = await uploadPhotos();

      setUploadProgress('Submitting for review...');

      // Submit photo suggestion
      await apiService.submitSuggestion({
        type: 'photo_update',
        targetLocationId: locationId,
        photos: photoKeys,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit photos. Please try again.');
    } finally {
      setIsLoading(false);
      setUploadProgress('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-display text-2xl font-bold text-forest-900">
                Add Photos
              </h2>
              <p className="text-sm text-forest-600 mt-1">
                for {locationAddress}
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

          {/* Photo Previews */}
          {photoPreviewUrls.length > 0 && (
            <div className="grid grid-cols-3 gap-3 mb-4">
              {photoPreviewUrls.map((url, index) => (
                <div key={index} className="relative group">
                  <img
                    src={url}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-24 object-cover rounded-lg border-2 border-forest-200"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    disabled={isLoading}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-burgundy-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-burgundy-700"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Upload Area */}
          {photos.length < MAX_PHOTOS && (
            <label
              htmlFor="add-photo-upload"
              className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-forest-300 rounded-lg cursor-pointer bg-forest-50 hover:bg-forest-100 transition-colors ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="flex flex-col items-center justify-center py-4">
                <svg className="w-8 h-8 mb-2 text-forest-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm text-forest-600">
                  <span className="font-semibold">Click to upload</span> photos
                </p>
                <p className="text-xs text-forest-500 mt-1">
                  Up to {MAX_PHOTOS - photos.length} more {photos.length === MAX_PHOTOS - 1 ? 'photo' : 'photos'}
                </p>
              </div>
              <input
                ref={fileInputRef}
                id="add-photo-upload"
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif"
                multiple
                onChange={handlePhotoChange}
                disabled={isLoading}
                className="hidden"
              />
            </label>
          )}

          {/* Info Box */}
          <div className="bg-gold-50 border border-gold-200 rounded-lg p-4 mt-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-gold-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-sm font-medium text-gold-900 mb-1">Review Process</p>
                <p className="text-xs text-gold-700">
                  Your photos will be reviewed by our moderators before being added to this location. This usually takes less than 24 hours.
                </p>
              </div>
            </div>
          </div>

          {/* Upload Progress */}
          {uploadProgress && (
            <div className="mt-4 text-center">
              <div className="inline-flex items-center gap-2 text-forest-600">
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-sm">{uploadProgress}</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 mt-6">
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
              disabled={photos.length === 0}
              className="flex-1"
            >
              {isLoading ? (uploadProgress || 'Submitting...') : 'Submit for Review'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
