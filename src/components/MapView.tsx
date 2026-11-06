import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { CivicReport } from '../types';

interface MapViewProps {
  reports: CivicReport[];
  selectedReport: CivicReport | null;
  onSelectReport: (report: CivicReport) => void;
  pickLocationMode?: boolean;
  onLocationPicked?: (lat: number, lon: number) => void;
  pickedLocation?: { lat: number; lon: number } | null;
}

// Category color mappings
const CATEGORY_COLORS: Record<string, string> = {
  'Roads & Potholes': '#d97706', // amber-600
  'Sanitation & Waste': '#059669', // emerald-600
  'Streetlighting & Electrical': '#2563eb', // blue-600
  'Water Supply & Drainage': '#0284c7', // sky-600
  'Parks & Public Amenities': '#16a34a', // green-600
  'Traffic & Signage': '#dc2626', // red-600
  'Other': '#64748b', // slate-500
};

export const MapView: React.FC<MapViewProps> = ({
  reports,
  selectedReport,
  onSelectReport,
  pickLocationMode = false,
  onLocationPicked,
  pickedLocation,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const pickerMarkerRef = useRef<L.Marker | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Default center (Bangalore municipal core or central city)
    const defaultCenter: [number, number] = [12.9716, 77.6412];

    const map = L.map(mapContainerRef.current, {
      center: defaultCenter,
      zoom: 13,
      zoomControl: true,
      scrollWheelZoom: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    const markersGroup = L.layerGroup().addTo(map);
    markersLayerRef.current = markersGroup;
    mapInstanceRef.current = map;

    // Resize listener
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Handle map click when in location picker mode
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const handleMapClick = (e: L.LeafletMouseEvent) => {
      if (pickLocationMode && onLocationPicked) {
        onLocationPicked(e.latlng.lat, e.latlng.lng);
      }
    };

    if (pickLocationMode) {
      map.on('click', handleMapClick);
    } else {
      map.off('click', handleMapClick);
    }

    return () => {
      map.off('click', handleMapClick);
    };
  }, [pickLocationMode, onLocationPicked]);

  // Update picker marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (pickedLocation) {
      if (pickerMarkerRef.current) {
        pickerMarkerRef.current.setLatLng([pickedLocation.lat, pickedLocation.lon]);
      } else {
        const pickerIcon = L.divIcon({
          className: 'custom-picker-pin',
          html: `
            <div style="background-color: #0f172a; width: 28px; height: 28px; border-radius: 50%; border: 3px solid #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; color: white;">
              <div style="width: 8px; height: 8px; background-color: #22c55e; border-radius: 50%;"></div>
            </div>
          `,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        pickerMarkerRef.current = L.marker([pickedLocation.lat, pickedLocation.lon], { icon: pickerIcon }).addTo(map);
      }
    } else if (pickerMarkerRef.current) {
      pickerMarkerRef.current.remove();
      pickerMarkerRef.current = null;
    }
  }, [pickedLocation]);

  // Render report markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersLayerRef.current;
    if (!map || !markersGroup) return;

    markersGroup.clearLayers();

    const bounds: [number, number][] = [];

    reports.forEach((report) => {
      if (report.latitude === null || report.longitude === null) return;

      const color = CATEGORY_COLORS[report.category] || '#64748b';
      const isSelected = selectedReport?.id === report.id;
      const isDuplicate = report.is_duplicate_flagged;

      const markerHtml = `
        <div style="
          background-color: ${color};
          width: ${isSelected ? '32px' : '24px'};
          height: ${isSelected ? '32px' : '24px'};
          border-radius: 50%;
          border: ${isSelected ? '3px solid #ffffff' : '2px solid #ffffff'};
          box-shadow: 0 4px 10px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 700;
          font-size: 10px;
          cursor: pointer;
          position: relative;
        ">
          ${isDuplicate ? '<div style="position: absolute; top: -3px; right: -3px; width: 8px; height: 8px; background: #a855f7; border-radius: 50%; border: 1px solid white;"></div>' : ''}
          <div style="width: 6px; height: 6px; background-color: white; border-radius: 50%;"></div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-civic-pin',
        html: markerHtml,
        iconSize: [isSelected ? 32 : 24, isSelected ? 32 : 24],
        iconAnchor: [isSelected ? 16 : 12, isSelected ? 16 : 12],
      });

      const marker = L.marker([report.latitude, report.longitude], { icon: customIcon });

      const popupContent = document.createElement('div');
      popupContent.className = 'civic-popup-card';
      popupContent.innerHTML = `
        <div style="font-family: inherit; font-size: 12px; color: #1e293b; max-width: 240px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <span style="font-family: monospace; font-size: 11px; font-weight: 600; color: #475569;">${report.id}</span>
            <span style="font-size: 11px; color: ${color}; font-weight: 600;">${report.category}</span>
          </div>
          <div style="font-weight: 700; font-size: 13px; line-height: 1.3; margin-bottom: 6px; color: #0f172a;">${report.title}</div>
          <div style="font-size: 11px; color: #64748b; margin-bottom: 8px;">${report.address}</div>
          <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #e2e8f0; padding-top: 6px;">
            <span style="font-size: 10px; color: #475569;">Status: <strong>${report.status.replace(/_/g, ' ')}</strong></span>
            <button id="btn-${report.id}" style="background-color: #047857; color: white; border: none; border-radius: 4px; padding: 3px 8px; font-size: 10px; font-weight: 600; cursor: pointer;">View Details</button>
          </div>
        </div>
      `;

      // Attach click handler to popup button
      marker.bindPopup(popupContent);
      marker.on('popupopen', () => {
        const btn = document.getElementById(`btn-${report.id}`);
        if (btn) {
          btn.onclick = () => {
            onSelectReport(report);
            marker.closePopup();
          };
        }
      });

      marker.addTo(markersGroup);
      bounds.push([report.latitude, report.longitude]);
    });

    // If report selected, fly to it
    if (selectedReport && selectedReport.latitude !== null && selectedReport.longitude !== null) {
      map.flyTo([selectedReport.latitude, selectedReport.longitude], 15, { duration: 1 });
    }
  }, [reports, selectedReport, onSelectReport]);

  return (
    <div className="relative w-full h-full min-h-[420px] bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Map Legend Overlay */}
      <div className="absolute bottom-3 left-3 z-[400] bg-white/95 backdrop-blur-xs p-2.5 rounded-lg border border-slate-200 shadow-sm text-xs hidden sm:block">
        <div className="text-[11px] font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
          Map Legend
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-slate-600">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-600" />
            <span>Roads &amp; Potholes</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
            <span>Sanitation &amp; Waste</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
            <span>Electrical &amp; Lighting</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-600" />
            <span>Water &amp; Drainage</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
            <span>Traffic &amp; Safety</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
            <span>Duplicate Flagged</span>
          </div>
        </div>
      </div>

      {pickLocationMode && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[400] bg-slate-900 text-white text-xs px-3.5 py-1.5 rounded-full shadow-md flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Click anywhere on the map to place issue coordinates</span>
        </div>
      )}
    </div>
  );
};
