import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { AlertTriangle, Trees, Waves, MapPin, Bird, Droplets } from 'lucide-react';

// Fix Leaflet's broken default icon path (Vite asset handling issue)
// @ts-ignore
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
// @ts-ignore
import markerIcon from 'leaflet/dist/images/marker-icon.png';
// @ts-ignore
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

interface GisRiskFlag {
  flagType: 'FOREST' | 'RIVER' | 'SANCTUARY' | 'WETLAND';
  distanceM: number;
  layerName: string;
  severity: string;
}

interface GISMapProps {
  /** If true, allows the user to drop a pin and emits onLocationChange */
  interactive?: boolean;
  /** Initial latitude */
  lat?: number;
  /** Initial longitude */
  lng?: number;
  /** Called when pin is dropped in interactive mode */
  onLocationChange?: (lat: number, lng: number) => void;
  /** Risk flags received from the GIS API */
  riskFlags?: GisRiskFlag[];
  /** Height of the map container */
  height?: string;
}

const BUFFER_COLORS: Record<string, { color: string; label: string; radiusM: number }> = {
  FOREST:    { color: '#16a34a', label: 'Forest Boundary (1km)',    radiusM: 1000 },
  RIVER:     { color: '#2563eb', label: 'River/Waterbody (500m)',   radiusM: 500  },
  SANCTUARY: { color: '#9333ea', label: 'Wildlife Sanctuary (10km)', radiusM: 10000 },
  WETLAND:   { color: '#0891b2', label: 'Wetland (2km)',             radiusM: 2000 },
};

const FLAG_ICON: Record<string, React.ReactNode> = {
  FOREST:    <Trees className="w-3.5 h-3.5 text-green-600" />,
  RIVER:     <Waves className="w-3.5 h-3.5 text-blue-600" />,
  SANCTUARY: <Bird className="w-3.5 h-3.5 text-purple-600" />,
  WETLAND:   <Droplets className="w-3.5 h-3.5 text-cyan-600" />,
};

// Default center: Raipur, CG
const DEFAULT_CENTER: [number, number] = [21.2514, 81.6296];

export default function GISMap({
  interactive = false,
  lat,
  lng,
  onLocationChange,
  riskFlags = [],
  height = '380px',
}: GISMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circlesRef = useRef<L.Circle[]>([]);
  const [pinDropped, setPinDropped] = useState(!!(lat && lng));

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const center: [number, number] = lat && lng ? [lat, lng] : DEFAULT_CENTER;
    const zoom = lat && lng ? 12 : 7;

    const map = L.map(containerRef.current, {
      center,
      zoom,
      zoomControl: true,
    });

    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EBP, and the GIS User Community',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    // Place initial marker if coords provided
    if (lat && lng) {
      placeMarker(map, lat, lng);
    }

    // Interactive pin-drop
    if (interactive) {
      map.on('click', (e: L.LeafletMouseEvent) => {
        const { lat: clickLat, lng: clickLng } = e.latlng;
        placeMarker(map, clickLat, clickLng);
        onLocationChange?.(clickLat, clickLng);
        setPinDropped(true);
      });
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Draw buffer circles when riskFlags change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove old circles
    circlesRef.current.forEach(c => c.remove());
    circlesRef.current = [];

    if (riskFlags.length > 0 && markerRef.current) {
      const pos = markerRef.current.getLatLng();
      riskFlags.forEach(flag => {
        const cfg = BUFFER_COLORS[flag.flagType];
        if (!cfg) return;
        const circle = L.circle(pos, {
          radius: cfg.radiusM,
          color: cfg.color,
          fillColor: cfg.color,
          fillOpacity: 0.12,
          weight: 2,
          dashArray: '6 4',
        }).addTo(map).bindTooltip(cfg.label, { sticky: true });
        circlesRef.current.push(circle);
      });
    }
  }, [riskFlags]);

  function placeMarker(map: L.Map, mlat: number, mlng: number) {
    if (markerRef.current) markerRef.current.remove();
    const marker = L.marker([mlat, mlng], { draggable: interactive })
      .addTo(map)
      .bindPopup(`📍 Project Location<br/><small>${mlat.toFixed(5)}, ${mlng.toFixed(5)}</small>`)
      .openPopup();

    if (interactive) {
      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        onLocationChange?.(pos.lat, pos.lng);
      });
    }
    markerRef.current = marker;
  }

  return (
    <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm">
      {/* Map container */}
      <div ref={containerRef} style={{ height, width: '100%' }} />

      {/* Interactive hint */}
      {interactive && !pinDropped && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 border-t border-blue-200 text-sm text-blue-700">
          <MapPin className="w-4 h-4 flex-shrink-0" />
          Click anywhere on the map to drop your project location pin
        </div>
      )}

      {/* GIS Risk Flags panel */}
      {riskFlags.length > 0 && (
        <div className="px-4 py-3 bg-orange-50 border-t border-orange-200">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            <span className="text-sm font-semibold text-orange-700">
              GIS Risk Flags ({riskFlags.length})
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {riskFlags.map((flag, i) => (
              <div key={i} className="flex items-center gap-2 text-xs bg-white rounded-lg px-2.5 py-1.5 border border-orange-100">
                {FLAG_ICON[flag.flagType]}
                <span className="font-medium text-gray-700">{flag.layerName}</span>
                <span className="ml-auto text-orange-600 font-semibold">
                  {flag.distanceM < 1000
                    ? `${Math.round(flag.distanceM)}m`
                    : `${(flag.distanceM / 1000).toFixed(1)}km`}
                </span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  flag.severity === 'HIGH' ? 'bg-red-100 text-red-700' :
                  flag.severity === 'MEDIUM' ? 'bg-orange-100 text-orange-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>{flag.severity}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
