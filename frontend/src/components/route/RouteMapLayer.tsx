import { Marker, Polyline, Tooltip } from 'react-leaflet';
import { DivIcon, LatLngTuple } from 'leaflet';
import { useRoute } from '@/contexts/RouteContext';

// Create a numbered marker icon
function createNumberedIcon(number: number): DivIcon {
  return new DivIcon({
    className: 'custom-div-icon',
    html: `
      <div style="
        background: linear-gradient(135deg, #059669 0%, #047857 100%);
        color: white;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 14px;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      ">
        ${number}
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

export default function RouteMapLayer() {
  const { stops } = useRoute();

  if (stops.length === 0) {
    return null;
  }

  // Create polyline coordinates from stops
  const polylinePositions: LatLngTuple[] = stops.map((stop) => [
    stop.lat,
    stop.lng,
  ]);

  return (
    <>
      {/* Route polyline */}
      {stops.length > 1 && (
        <Polyline
          positions={polylinePositions}
          pathOptions={{
            color: '#059669',
            weight: 4,
            opacity: 0.8,
            dashArray: '10, 10',
          }}
        />
      )}

      {/* Numbered markers for each stop */}
      {stops.map((stop, index) => (
        <Marker
          key={`route-${stop.id}`}
          position={[stop.lat, stop.lng]}
          icon={createNumberedIcon(index + 1)}
          zIndexOffset={1000 + index} // Ensure route markers are on top
        >
          <Tooltip direction="top" offset={[0, -16]} permanent={false}>
            <div className="text-sm">
              <span className="font-semibold">Stop {index + 1}:</span>{' '}
              {stop.address.split(',')[0]}
            </div>
          </Tooltip>
        </Marker>
      ))}
    </>
  );
}
