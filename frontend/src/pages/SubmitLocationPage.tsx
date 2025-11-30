export default function SubmitLocationPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="card">
        <h2 className="text-2xl font-bold mb-4">Submit a Location</h2>
        <p className="text-gray-600 mb-6">
          Know of an amazing Christmas light display? Share it with the community!
        </p>

        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address
            </label>
            <input type="text" className="input-field" placeholder="123 Main St, Dallas, TX 75001" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              className="input-field"
              rows={4}
              placeholder="Describe the display..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Photos (optional)
            </label>
            <input type="file" accept="image/*" multiple className="input-field" />
          </div>

          <button type="submit" className="btn-primary">
            Submit for Review
          </button>
        </form>
      </div>
    </div>
  );
}
