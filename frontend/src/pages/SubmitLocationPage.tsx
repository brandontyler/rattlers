import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button, Input, Card } from '@/components/ui';
import AddressAutocomplete, { AddressAutocompleteRef } from '@/components/ui/AddressAutocomplete';
import type { AddressSuggestion } from '@/types';

export default function SubmitLocationPage() {
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<AddressSuggestion | null>(null);

  const addressRef = useRef<AddressAutocompleteRef>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    // Limit to 3 photos
    if (files.length + photos.length > 3) {
      setError('You can upload a maximum of 3 photos');
      return;
    }

    // Create preview URLs
    const newPreviewUrls = files.map(file => URL.createObjectURL(file));

    setPhotos([...photos, ...files]);
    setPhotoPreviewUrls([...photoPreviewUrls, ...newPreviewUrls]);
    setError('');
  };

  const removePhoto = (index: number) => {
    // Revoke the URL to avoid memory leaks
    URL.revokeObjectURL(photoPreviewUrls[index]);

    setPhotos(photos.filter((_, i) => i !== index));
    setPhotoPreviewUrls(photoPreviewUrls.filter((_, i) => i !== index));
  };

  const handleAddressSelect = (suggestion: AddressSuggestion) => {
    setSelectedAddress(suggestion);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Get address from ref
    const address = addressRef.current?.getAddress() || '';
    const suggestion = addressRef.current?.getSelectedSuggestion();

    // Validation
    if (!address.trim()) {
      setError('Please enter an address');
      setIsLoading(false);
      return;
    }

    if (!suggestion) {
      setError('Please select an address from the suggestions');
      setIsLoading(false);
      return;
    }

    if (!description.trim() || description.trim().length < 20) {
      setError('Please provide a description of at least 20 characters');
      setIsLoading(false);
      return;
    }

    try {
      // TODO: Replace with actual API call
      // The suggestion object contains: { address, lat, lng, displayName }
      console.log('Submitting location:', {
        address: suggestion.address,
        lat: suggestion.lat,
        lng: suggestion.lng,
        description,
        photos,
      });

      await new Promise(resolve => setTimeout(resolve, 1500));

      // Simulate success
      setIsSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Failed to submit location. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Success State
  if (isSubmitted) {
    return (
      <div className="min-h-[calc(100vh-300px)] flex items-center justify-center px-4 py-12 animate-fade-in">
        <Card className="max-w-2xl w-full text-center p-12">
          <div className="w-20 h-20 bg-gold-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-gold-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="font-display text-3xl font-bold text-forest-900 mb-4">
            Thank You for Your Submission!
          </h2>
          <p className="text-forest-600 mb-2">
            Your Christmas light display has been submitted for review.
          </p>
          <p className="text-forest-600 mb-8">
            Our community moderators will review your submission and add it to the map soon. We'll notify you once it's approved!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/">
              <Button variant="primary" size="lg">
                Back to Map
              </Button>
            </Link>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => {
                setIsSubmitted(false);
                setDescription('');
                setPhotos([]);
                setPhotoPreviewUrls([]);
                setSelectedAddress(null);
                addressRef.current?.clearSelection();
              }}
            >
              Submit Another
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Submission Form
  return (
    <div className="min-h-[calc(100vh-300px)] gradient-winter py-12 px-4 animate-fade-in">
      <div className="container mx-auto max-w-5xl">
        {/* Header Section */}
        <div className="text-center mb-12">
          <div className="inline-block mb-4">
            <div className="w-20 h-20 bg-gold-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-10 h-10 text-gold-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-forest-900 mb-4">
            Share a Christmas Light Display
          </h1>
          <p className="text-lg text-forest-600 max-w-2xl mx-auto">
            Know of an amazing display that's not on our map? Help the community discover it! Share details and photos to spread the holiday joy.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <Card className="p-8 md:p-10">
              {error && (
                <div className="bg-burgundy-50 border-2 border-burgundy-200 text-burgundy-800 px-4 py-3 rounded-lg mb-6 flex items-start gap-3">
                  <svg className="w-5 h-5 text-burgundy-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Address Section */}
                <div>
                  <h3 className="font-display text-xl font-semibold text-forest-900 mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-burgundy-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Location Details
                  </h3>

                  <AddressAutocomplete
                    ref={addressRef}
                    label="Street Address"
                    placeholder="Start typing an address in the DFW area..."
                    helperText="Type at least 3 characters to see suggestions. Select an address from the dropdown."
                    onSelect={handleAddressSelect}
                    required
                  />
                </div>

                {/* Description Section */}
                <div>
                  <h3 className="font-display text-xl font-semibold text-forest-900 mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-burgundy-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                    Tell Us About the Display
                  </h3>

                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-forest-700 mb-2">
                      Description *
                    </label>
                    <textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={6}
                      className="w-full px-4 py-3 border-2 border-forest-200 rounded-lg focus:ring-2 focus:ring-forest-500 focus:border-transparent transition-all duration-200 font-body text-forest-900 placeholder-forest-400"
                      placeholder="What makes this display special? Include details like synchronized music, animated elements, themes, best viewing times, etc."
                      required
                    />
                    <div className="flex justify-between items-center mt-2">
                      <p className="text-sm text-forest-500">
                        {description.length < 20 ? 'At least 20 characters required' : 'Great description!'}
                      </p>
                      <p className="text-sm text-forest-500">
                        {description.length} characters
                      </p>
                    </div>
                  </div>
                </div>

                {/* Photos Section */}
                <div>
                  <h3 className="font-display text-xl font-semibold text-forest-900 mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-burgundy-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Photos (Optional)
                  </h3>

                  <div className="space-y-4">
                    {/* Photo Previews */}
                    {photoPreviewUrls.length > 0 && (
                      <div className="grid grid-cols-3 gap-4">
                        {photoPreviewUrls.map((url, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={url}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-32 object-cover rounded-lg border-2 border-forest-200"
                            />
                            <button
                              type="button"
                              onClick={() => removePhoto(index)}
                              className="absolute -top-2 -right-2 w-7 h-7 bg-burgundy-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-burgundy-700"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Upload Button */}
                    {photos.length < 3 && (
                      <div>
                        <label
                          htmlFor="photo-upload"
                          className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-forest-300 rounded-lg cursor-pointer bg-forest-50 hover:bg-forest-100 transition-colors duration-200"
                        >
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <svg className="w-10 h-10 mb-3 text-forest-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            <p className="mb-2 text-sm text-forest-600">
                              <span className="font-semibold">Click to upload</span> or drag and drop
                            </p>
                            <p className="text-xs text-forest-500">
                              PNG, JPG or WEBP (up to {3 - photos.length} {photos.length === 2 ? 'photo' : 'photos'} remaining)
                            </p>
                          </div>
                          <input
                            id="photo-upload"
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handlePhotoChange}
                            className="hidden"
                          />
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-4">
                  <Button type="submit" variant="primary" size="lg" fullWidth loading={isLoading}>
                    {isLoading ? 'Submitting...' : 'Submit for Review'}
                  </Button>
                </div>
              </form>
            </Card>
          </div>

          {/* Sidebar - Guidelines */}
          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-24">
              <h3 className="font-display text-lg font-semibold text-forest-900 mb-4">
                Submission Guidelines
              </h3>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-gold-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3.5 h-3.5 text-gold-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-forest-900">Accurate Address</p>
                    <p className="text-xs text-forest-600 mt-0.5">
                      Provide the exact street address so others can find it easily
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-gold-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3.5 h-3.5 text-gold-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-forest-900">Detailed Description</p>
                    <p className="text-xs text-forest-600 mt-0.5">
                      Share what makes this display special and worth visiting
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-gold-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3.5 h-3.5 text-gold-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-forest-900">Quality Photos</p>
                    <p className="text-xs text-forest-600 mt-0.5">
                      Clear, well-lit photos help others see the display's beauty
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-gold-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3.5 h-3.5 text-gold-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-forest-900">Be Respectful</p>
                    <p className="text-xs text-forest-600 mt-0.5">
                      These are private homes - please respect the homeowners
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-forest-100">
                <div className="bg-gold-50 border border-gold-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-gold-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="text-sm font-semibold text-gold-900 mb-1">Review Process</p>
                      <p className="text-xs text-gold-700">
                        All submissions are reviewed by our moderators to ensure quality and accuracy before being added to the map.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
