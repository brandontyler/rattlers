export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Find the Best Christmas Lights in DFW
        </h2>
        <p className="text-gray-600">
          Discover amazing Christmas light displays near you and plan your perfect tour
        </p>
      </div>

      {/* Search and filters section - to be implemented */}
      <div className="card mb-6">
        <h3 className="text-lg font-semibold mb-4">Search & Filter</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Search by address..."
            className="input-field"
          />
          <select className="input-field">
            <option value="">All Ratings</option>
            <option value="4">4+ Stars</option>
            <option value="4.5">4.5+ Stars</option>
          </select>
          <select className="input-field">
            <option value="10">Within 10 miles</option>
            <option value="15">Within 15 miles</option>
            <option value="20">Within 20 miles</option>
          </select>
        </div>
      </div>

      {/* Map container - to be implemented with Leaflet */}
      <div className="card">
        <div className="bg-gray-100 rounded-lg h-[600px] flex items-center justify-center">
          <div className="text-center">
            <p className="text-2xl mb-2">🗺️</p>
            <p className="text-gray-600">Map will be displayed here</p>
            <p className="text-sm text-gray-500 mt-2">
              Interactive map with Christmas light locations
            </p>
          </div>
        </div>
      </div>

      {/* Stats section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <div className="card text-center">
          <p className="text-4xl font-bold text-primary-600">148</p>
          <p className="text-gray-600 mt-2">Light Displays</p>
        </div>
        <div className="card text-center">
          <p className="text-4xl font-bold text-secondary-600">0</p>
          <p className="text-gray-600 mt-2">Reviews</p>
        </div>
        <div className="card text-center">
          <p className="text-4xl font-bold text-primary-600">0</p>
          <p className="text-gray-600 mt-2">Routes Planned</p>
        </div>
      </div>
    </div>
  );
}
