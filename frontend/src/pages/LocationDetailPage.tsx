import { useParams } from 'react-router-dom';

export default function LocationDetailPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="card">
        <h2 className="text-2xl font-bold mb-4">Location Details</h2>
        <p className="text-gray-600">Location ID: {id}</p>
        <p className="text-sm text-gray-500 mt-4">
          This page will display detailed information about the Christmas light display.
        </p>
      </div>
    </div>
  );
}
