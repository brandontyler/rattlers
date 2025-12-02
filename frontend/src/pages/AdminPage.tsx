import { useState } from 'react';
import { Button, Card, Badge } from '@/components/ui';

// Mock data for pending suggestions
const mockPendingSuggestions = [
  {
    id: '1',
    address: '456 Holly Drive, Frisco, TX 75034',
    description: 'Beautiful synchronized display with Trans-Siberian Orchestra music. Features over 50,000 lights with animated snowflakes and reindeer.',
    submittedBy: 'sarah.johnson@email.com',
    submittedAt: '2024-12-15T14:30:00Z',
    photos: 2,
  },
  {
    id: '2',
    address: '789 Mistletoe Lane, McKinney, TX 75071',
    description: 'Traditional nativity scene with life-size figures. Also includes a candy cane pathway and Santa\'s workshop.',
    submittedBy: 'mike.wilson@email.com',
    submittedAt: '2024-12-14T09:15:00Z',
    photos: 3,
  },
  {
    id: '3',
    address: '321 Winter Street, Allen, TX 75002',
    description: 'Massive inflatable display visible from blocks away. Kids absolutely love it!',
    submittedBy: 'emily.davis@email.com',
    submittedAt: '2024-12-13T18:45:00Z',
    photos: 1,
  },
];

// Mock data for flagged locations
const mockFlaggedLocations = [
  {
    id: '42',
    address: '555 Oakwood Ave, Dallas, TX 75201',
    reason: 'Lights are no longer up this year',
    reportedBy: 'user123@email.com',
    reportedAt: '2024-12-16T10:20:00Z',
    feedbackCount: 12,
  },
  {
    id: '87',
    address: '888 Pine Street, Plano, TX 75023',
    reason: 'Address appears to be incorrect',
    reportedBy: 'john.smith@email.com',
    reportedAt: '2024-12-15T16:30:00Z',
    feedbackCount: 8,
  },
];

export default function AdminPage() {
  const [pendingSuggestions, setPendingSuggestions] = useState(mockPendingSuggestions);
  const [flaggedLocations, setFlaggedLocations] = useState(mockFlaggedLocations);

  const handleApprove = (id: string) => {
    setPendingSuggestions(pendingSuggestions.filter(s => s.id !== id));
    // TODO: Call API to approve suggestion
  };

  const handleReject = (id: string) => {
    setPendingSuggestions(pendingSuggestions.filter(s => s.id !== id));
    // TODO: Call API to reject suggestion
  };

  const handleResolveFlag = (id: string) => {
    setFlaggedLocations(flaggedLocations.filter(f => f.id !== id));
    // TODO: Call API to resolve flagged location
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="min-h-[calc(100vh-300px)] gradient-winter py-12 px-4 animate-fade-in">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-burgundy-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-burgundy-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h1 className="font-display text-3xl md:text-4xl font-bold text-forest-900">
                Admin Dashboard
              </h1>
              <p className="text-forest-600">Manage locations, suggestions, and community reports</p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="p-6 card-glow">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 bg-gold-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-gold-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <Badge variant="gold">New</Badge>
            </div>
            <p className="text-4xl font-display font-bold text-forest-900 mb-1">
              {pendingSuggestions.length}
            </p>
            <p className="text-sm font-medium text-forest-600">Pending Suggestions</p>
          </Card>

          <Card className="p-6 card-glow">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 bg-burgundy-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-burgundy-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                </svg>
              </div>
              {flaggedLocations.length > 0 && (
                <Badge variant="burgundy">Action Needed</Badge>
              )}
            </div>
            <p className="text-4xl font-display font-bold text-forest-900 mb-1">
              {flaggedLocations.length}
            </p>
            <p className="text-sm font-medium text-forest-600">Flagged Locations</p>
          </Card>

          <Card className="p-6 card-glow">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 bg-forest-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-forest-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </div>
            <p className="text-4xl font-display font-bold text-forest-900 mb-1">148</p>
            <p className="text-sm font-medium text-forest-600">Total Locations</p>
          </Card>

          <Card className="p-6 card-glow">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 bg-gold-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-gold-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>
            </div>
            <p className="text-4xl font-display font-bold text-forest-900 mb-1">2.5K</p>
            <p className="text-sm font-medium text-forest-600">Community Reviews</p>
          </Card>
        </div>

        {/* Pending Suggestions Section */}
        <div className="mb-8">
          <Card className="p-6 md:p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-display text-2xl font-bold text-forest-900 flex items-center gap-2">
                  <svg className="w-6 h-6 text-burgundy-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Pending Suggestions
                </h2>
                <p className="text-sm text-forest-600 mt-1">
                  Review and approve new location submissions from the community
                </p>
              </div>
              <Badge variant="gold" className="text-lg px-4 py-2">
                {pendingSuggestions.length}
              </Badge>
            </div>

            {pendingSuggestions.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-forest-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-forest-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-forest-600 font-medium">All caught up!</p>
                <p className="text-sm text-forest-500 mt-1">No pending suggestions at the moment</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingSuggestions.map((suggestion) => (
                  <div
                    key={suggestion.id}
                    className="border-2 border-forest-100 rounded-lg p-6 hover:border-forest-200 transition-colors duration-200"
                  >
                    <div className="flex flex-col lg:flex-row gap-6">
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-display text-lg font-semibold text-forest-900 mb-1">
                              {suggestion.address}
                            </h3>
                            <div className="flex items-center gap-4 text-sm text-forest-600">
                              <span className="flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                {suggestion.submittedBy}
                              </span>
                              <span className="flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {formatDate(suggestion.submittedAt)}
                              </span>
                              <span className="flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                {suggestion.photos} {suggestion.photos === 1 ? 'photo' : 'photos'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <p className="text-forest-700 leading-relaxed">{suggestion.description}</p>
                      </div>

                      <div className="flex lg:flex-col gap-3 lg:min-w-[140px]">
                        <Button
                          variant="primary"
                          size="md"
                          fullWidth
                          onClick={() => handleApprove(suggestion.id)}
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Approve
                        </Button>
                        <Button
                          variant="secondary"
                          size="md"
                          fullWidth
                          onClick={() => handleReject(suggestion.id)}
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Reject
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Flagged Locations Section */}
        <div>
          <Card className="p-6 md:p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-display text-2xl font-bold text-forest-900 flex items-center gap-2">
                  <svg className="w-6 h-6 text-burgundy-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                  </svg>
                  Flagged Locations
                </h2>
                <p className="text-sm text-forest-600 mt-1">
                  Review locations that have been reported by the community
                </p>
              </div>
              {flaggedLocations.length > 0 && (
                <Badge variant="burgundy" className="text-lg px-4 py-2">
                  {flaggedLocations.length}
                </Badge>
              )}
            </div>

            {flaggedLocations.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-forest-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-forest-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-forest-600 font-medium">No flagged locations</p>
                <p className="text-sm text-forest-500 mt-1">All locations are in good standing</p>
              </div>
            ) : (
              <div className="space-y-4">
                {flaggedLocations.map((location) => (
                  <div
                    key={location.id}
                    className="border-2 border-burgundy-100 bg-burgundy-50/30 rounded-lg p-6 hover:border-burgundy-200 transition-colors duration-200"
                  >
                    <div className="flex flex-col lg:flex-row gap-6">
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-display text-lg font-semibold text-forest-900">
                                {location.address}
                              </h3>
                              <Badge variant="burgundy">ID: {location.id}</Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-forest-600 mb-3">
                              <span className="flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                Reported by {location.reportedBy}
                              </span>
                              <span className="flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {formatDate(location.reportedAt)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="bg-white border border-burgundy-200 rounded-lg p-4">
                          <p className="text-sm font-medium text-burgundy-900 mb-1">Report Reason:</p>
                          <p className="text-forest-700">{location.reason}</p>
                        </div>
                        <p className="text-sm text-forest-600 mt-3">
                          This location has {location.feedbackCount} community reviews
                        </p>
                      </div>

                      <div className="flex lg:flex-col gap-3 lg:min-w-[160px]">
                        <Button
                          variant="primary"
                          size="md"
                          fullWidth
                          onClick={() => handleResolveFlag(location.id)}
                        >
                          Keep Location
                        </Button>
                        <Button
                          variant="secondary"
                          size="md"
                          fullWidth
                          onClick={() => handleResolveFlag(location.id)}
                        >
                          Remove Location
                        </Button>
                        <button className="text-sm text-burgundy-600 hover:text-burgundy-700 font-medium">
                          View Details →
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
