import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { SatelliteReport } from '../../../backend/src/services/satellite.service'; // Using the interface type

// Fix for default marker icons in React Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Component to dynamically update map center when props change
function ChangeView({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

interface SatelliteVerificationMapProps {
  report: SatelliteReport;
  className?: string;
}

export default function SatelliteVerificationMap({ report, className = 'h-[400px] w-full rounded-xl z-0' }: SatelliteVerificationMapProps) {
  const [center, setCenter] = useState<[number, number]>([report.coordinates.lat, report.coordinates.lng]);

  useEffect(() => {
    setCenter([report.coordinates.lat, report.coordinates.lng]);
  }, [report.coordinates]);

  return (
    <div className={`overflow-hidden border border-gray-200 shadow-sm relative ${className}`}>
      <MapContainer center={center} zoom={13} className="h-full w-full z-0" scrollWheelZoom={false}>
        <ChangeView center={center} zoom={13} />
        <TileLayer
          attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EBP, and the GIS User Community'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        />

        {/* Project Location Pin */}
        <Marker position={center}>
          <Popup>
            <div className="text-sm font-semibold">Project Location</div>
            <div className="text-xs text-gray-500">{center[0].toFixed(4)}, {center[1].toFixed(4)}</div>
          </Popup>
        </Marker>

        {/* Search Radius */}
        <Circle 
          center={center} 
          pathOptions={{ color: 'gray', fillColor: 'transparent', weight: 1, dashArray: '5, 5' }} 
          radius={report.radiusMeters} 
        />

        {/* Detected Forest Areas */}
        {report.forestAreas?.map((forest, index) => (
          <Circle
            key={`forest-${index}`}
            center={[forest.lat, forest.lng]}
            radius={200} // Approximate visualization size
            pathOptions={{ color: '#22c55e', fillColor: '#22c55e', fillOpacity: 0.4, weight: 0 }}
          >
            <Popup>
              <div className="text-sm font-semibold text-green-700">Detected Forest Area</div>
              <div className="text-xs text-gray-500">Type: {forest.type}</div>
            </Popup>
          </Circle>
        ))}

        {/* Detected Water Bodies */}
        {report.waterAreas?.map((water, index) => (
          <Circle
            key={`water-${index}`}
            center={[water.lat, water.lng]}
            radius={150} // Approximate visualization size
            pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.4, weight: 0 }}
          >
            <Popup>
              <div className="text-sm font-semibold text-blue-700">Detected Water Body</div>
              <div className="text-xs text-gray-500">Type: {water.type}</div>
            </Popup>
          </Circle>
        ))}

      </MapContainer>
      
      {/* Map Overlay Badges */}
      <div className="absolute bottom-4 left-4 z-[400] flex gap-2">
        <div className="bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-sm text-xs font-medium border border-gray-200 flex items-center gap-2">
           <div className="w-3 h-3 rounded-full bg-green-500" /> Forests
        </div>
        <div className="bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-sm text-xs font-medium border border-gray-200 flex items-center gap-2">
           <div className="w-3 h-3 rounded-full bg-blue-500" /> Water Bodies
        </div>
      </div>
    </div>
  );
}
