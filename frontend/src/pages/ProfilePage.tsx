import { useState, useEffect } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { apiService } from '@/services/api';
import type { UserProfile, UserSubmission, Location } from '@/types';
import Badge from '@/components/ui/Badge';
import BadgeDisplay from '@/components/badges/BadgeDisplay';

export default function ProfilePage() {
  const { isAuthenticated } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [submissions, setSubmissions] = useState<UserSubmission[]>([]);
  const [favorites, setFavorites] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSubmissionId, setExpandedSubmissionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'submissions' | 'favorites'>('favorites');
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const fetchProfileData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch profile, submissions, and favorites in parallel
        const [profileResponse, submissionsResponse, favoritesResponse] = await Promise.all([
          apiService.getUserProfile(),
          apiService.getUserSubmissions(),
          apiService.getFavorites(),
        ]);

        if (profileResponse.success && profileResponse.data) {
          setProfile(profileResponse.data);
        }

        if (submissionsResponse.success && submissionsResponse.data) {
          setSubmissions(submissionsResponse.data);
        }

        if (favoritesResponse.success && favoritesResponse.data) {
          setFavorites(favoritesResponse.data);
        }
      } catch (err) {
        console.error('Failed to fetch profile data:', err);
        setError('Failed to load profile. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-burgundy-600 mb-4"></div>
          <p className="text-forest-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          {error || 'Failed to load profile'}
        </div>
      </div>
    );
  }

  const memberSince = new Date(profile.joinDate).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const toggleSubmissionDetails = (id: string) => {
    setExpandedSubmissionId(expandedSubmissionId === id ? null : id);
  };

  const handleEditUsername = () => {
    setNewUsername(profile?.username || '');
    setIsEditingUsername(true);
    setUsernameError(null);
  };

  const handleCancelEdit = () => {
    setIsEditingUsername(false);
    setNewUsername('');
    setUsernameError(null);
  };

  const handleSaveUsername = async () => {
    if (!newUsername || newUsername.trim().length < 3) {
      setUsernameError('Username must be at least 3 characters');
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(newUsername)) {
      setUsernameError('Username can only contain letters, numbers, and underscores');
      return;
    }

    try {
      setIsSaving(true);
      setUsernameError(null);

      const response = await apiService.updateProfile({ username: newUsername });

      if (response.success && response.data) {
        setProfile({ ...profile!, username: newUsername });
        setIsEditingUsername(false);
      } else {
        setUsernameError(response.error?.message || 'Failed to update username');
      }
    } catch (err: any) {
      setUsernameError(err.response?.data?.error?.message || 'Failed to update username');
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusVariant = (status: string): 'forest' | 'burgundy' | 'gold' => {
    switch (status) {
      case 'approved':
        return 'forest';
      case 'rejected':
        return 'burgundy';
      case 'pending':
      default:
        return 'gold';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="font-display text-4xl font-bold text-forest-900 mb-2">
          My Profile
        </h1>
        <p className="text-forest-600">
          View your account information and submission history
        </p>
      </div>

      {/* Profile Info Card */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            {/* Username */}
            <div className="mb-3">
              {!isEditingUsername ? (
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-2xl font-semibold text-forest-900">
                    {profile.username || profile.email}
                  </h2>
                  <button
                    onClick={handleEditUsername}
                    className="text-burgundy-600 hover:text-burgundy-700 p-1"
                    title="Edit username"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="px-3 py-2 border border-forest-300 rounded-md focus:outline-none focus:ring-2 focus:ring-burgundy-500"
                    placeholder="Enter username"
                    maxLength={30}
                  />
                  <button
                    onClick={handleSaveUsername}
                    disabled={isSaving}
                    className="px-3 py-2 bg-burgundy-600 text-white rounded-md hover:bg-burgundy-700 disabled:opacity-50"
                  >
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="px-3 py-2 bg-forest-100 text-forest-700 rounded-md hover:bg-forest-200"
                  >
                    Cancel
                  </button>
                </div>
              )}
              {usernameError && (
                <p className="text-red-600 text-sm mt-1">{usernameError}</p>
              )}
            </div>
            {/* Email */}
            <p className="text-forest-600 text-sm">{profile.email}</p>
          </div>
          {profile.isAdmin && (
            <Badge variant="burgundy" className="text-sm">
              Admin
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2 text-forest-600 mb-6">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>Member since {memberSince}</span>
        </div>

        {/* Activity Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-cream-100 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-forest-900 mb-1">
              {profile.stats.totalSubmissions}
            </div>
            <div className="text-sm text-forest-600">Total Submissions</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-green-700 mb-1">
              {profile.stats.approvedSubmissions}
            </div>
            <div className="text-sm text-green-700">Approved</div>
          </div>
          <div className="bg-gold-50 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-gold-700 mb-1">
              {profile.stats.pendingSubmissions}
            </div>
            <div className="text-sm text-gold-700">Pending</div>
          </div>
          <div className="bg-red-50 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-red-700 mb-1">
              {profile.stats.rejectedSubmissions}
            </div>
            <div className="text-sm text-red-700">Rejected</div>
          </div>
        </div>
      </div>

      {/* Badges Section */}
      <BadgeDisplay approvedSubmissions={profile.stats.approvedSubmissions} />

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden mt-8">
        <div className="flex border-b border-forest-200">
          <button
            onClick={() => setActiveTab('favorites')}
            className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
              activeTab === 'favorites'
                ? 'text-burgundy-600 border-b-2 border-burgundy-600 bg-burgundy-50'
                : 'text-forest-600 hover:bg-cream-50'
            }`}
          >
            <svg className="w-5 h-5 inline mr-2" fill={activeTab === 'favorites' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            Favorites ({favorites.length})
          </button>
          <button
            onClick={() => setActiveTab('submissions')}
            className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
              activeTab === 'submissions'
                ? 'text-burgundy-600 border-b-2 border-burgundy-600 bg-burgundy-50'
                : 'text-forest-600 hover:bg-cream-50'
            }`}
          >
            <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Submissions ({submissions.length})
          </button>
        </div>

        <div className="p-6">
          {/* Favorites Tab */}
          {activeTab === 'favorites' && (
            <>
              {favorites.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 mx-auto text-forest-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                  <p className="text-forest-600 mb-2">No favorites yet</p>
                  <p className="text-sm text-forest-500">
                    Save your favorite displays to easily find them later!
                  </p>
                  <Link
                    to="/"
                    className="inline-block mt-4 px-6 py-2 bg-burgundy-600 text-cream-50 rounded-lg font-medium hover:bg-burgundy-700 transition-colors"
                  >
                    Explore Map
                  </Link>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {favorites.map((location) => (
                    <Link
                      key={location.id}
                      to={`/location/${location.id}`}
                      className="flex gap-4 p-4 border border-forest-200 rounded-lg hover:shadow-md hover:border-burgundy-300 transition-all"
                    >
                      {location.photos && location.photos.length > 0 ? (
                        <img
                          src={location.photos[0]}
                          alt={location.address}
                          className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-20 h-20 bg-cream-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <svg className="w-8 h-8 text-forest-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          </svg>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-forest-900 truncate">{location.address}</h3>
                        {location.description && (
                          <p className="text-sm text-forest-600 line-clamp-2 mt-1">{location.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-sm text-forest-500">
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4 text-burgundy-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                            </svg>
                            {location.likeCount || 0}
                          </span>
                          {location.photos && location.photos.length > 0 && (
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                              </svg>
                              {location.photos.length}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Submissions Tab */}
          {activeTab === 'submissions' && (
            <>
              {submissions.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 mx-auto text-forest-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-forest-600 mb-2">No submissions yet</p>
                  <p className="text-sm text-forest-500">
                    Share your favorite Christmas light displays with the community!
                  </p>
                  <Link
                    to="/submit"
                    className="inline-block mt-4 px-6 py-2 bg-burgundy-600 text-cream-50 rounded-lg font-medium hover:bg-burgundy-700 transition-colors"
                  >
                    Submit a Location
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {submissions.map((submission) => (
                    <div
                      key={submission.id}
                      className="border border-forest-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                    >
                      {/* Submission Header */}
                      <div
                        className="p-4 cursor-pointer hover:bg-cream-50 transition-colors"
                        onClick={() => toggleSubmissionDetails(submission.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <Badge variant={getStatusVariant(submission.status)}>
                                {submission.status}
                              </Badge>
                              <span className="text-sm text-forest-500">
                                {new Date(submission.submittedAt).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })}
                              </span>
                            </div>
                            <h3 className="font-semibold text-forest-900 mb-1">
                              {submission.address}
                            </h3>
                            {submission.photos && submission.photos.length > 0 && (
                              <div className="flex items-center gap-1 text-sm text-forest-600">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                                </svg>
                                <span>{submission.photos.length} photo{submission.photos.length !== 1 ? 's' : ''}</span>
                              </div>
                            )}
                          </div>
                          <svg
                            className={`w-5 h-5 text-forest-400 transition-transform ${
                              expandedSubmissionId === submission.id ? 'rotate-180' : ''
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {expandedSubmissionId === submission.id && (
                        <div className="border-t border-forest-200 p-4 bg-cream-50">
                          {/* Description */}
                          {submission.description && (
                            <div className="mb-4">
                              <h4 className="font-medium text-forest-900 mb-2">Description</h4>
                              <p className="text-forest-600">{submission.description}</p>
                            </div>
                          )}

                          {/* Photos */}
                          {submission.photos && submission.photos.length > 0 && (
                            <div className="mb-4">
                              <h4 className="font-medium text-forest-900 mb-2">Photos</h4>
                              <div className="grid grid-cols-3 gap-2">
                                {submission.photos.map((photo, index) => (
                                  <img
                                    key={index}
                                    src={photo}
                                    alt={`Submission photo ${index + 1}`}
                                    className="w-full h-24 object-cover rounded-lg"
                                    loading="lazy"
                                  />
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Rejection Reason */}
                          {submission.status === 'rejected' && submission.rejectionReason && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                              <h4 className="font-medium text-red-800 mb-1">Rejection Reason</h4>
                              <p className="text-red-700 text-sm">{submission.rejectionReason}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
