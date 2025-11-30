export default function AdminPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h2 className="text-3xl font-bold mb-6">Admin Dashboard</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card">
          <h3 className="text-lg font-semibold mb-2">Pending Suggestions</h3>
          <p className="text-4xl font-bold text-primary-600">0</p>
        </div>
        <div className="card">
          <h3 className="text-lg font-semibold mb-2">Flagged Locations</h3>
          <p className="text-4xl font-bold text-yellow-600">0</p>
        </div>
        <div className="card">
          <h3 className="text-lg font-semibold mb-2">Total Locations</h3>
          <p className="text-4xl font-bold text-secondary-600">148</p>
        </div>
      </div>

      <div className="card">
        <h3 className="text-xl font-bold mb-4">Recent Suggestions</h3>
        <p className="text-gray-500">No pending suggestions</p>
      </div>
    </div>
  );
}
