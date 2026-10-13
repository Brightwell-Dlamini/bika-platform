'use client';

import React, { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { Loader2, MapPin, RotateCcw } from 'lucide-react';
import type { Incident, Region, Severity } from '@/app/types';

// Leaflet must be dynamic — it touches window on import
const MapContainer = dynamic(
  () => import('react-leaflet').then((m) => m.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((m) => m.TileLayer),
  { ssr: false }
);
const GeoJSON = dynamic(
  () => import('react-leaflet').then((m) => m.GeoJSON),
  { ssr: false }
);
const CircleMarker = dynamic(
  () => import('react-leaflet').then((m) => m.CircleMarker),
  { ssr: false }
);
const Popup = dynamic(() => import('react-leaflet').then((m) => m.Popup), { ssr: false });
const Tooltip = dynamic(() => import('react-leaflet').then((m) => m.Tooltip), { ssr: false });

const REGION_CENTROIDS: Record<Region, { lat: number; lng: number }> = {
  Hhohho: { lat: -26.05, lng: 31.15 },
  Manzini: { lat: -26.45, lng: 31.2 },
  Shiselweni: { lat: -26.95, lng: 31.2 },
  Lubombo: { lat: -26.35, lng: 31.8 },
};

const SEVERITY_COLOR: Record<Severity, string> = {
  CRITICAL: '#dc2626',
  HIGH: '#f97316',
  MEDIUM: '#fbbf24',
  LOW: '#0ea5e9',
};

const RESOLVED_COLOR = '#10b981';

interface MapPanelProps {
  incidents: Incident[];
  isLoading: boolean;
  selectedIncidentId: string | null;
  onSelectIncident: (id: string) => void;
}

export function MapPanel({
  incidents,
  isLoading,
  selectedIncidentId,
  onSelectIncident,
}: MapPanelProps) {
  const [geoData, setGeoData] = useState<unknown>(null);
  const [hovered, setHovered] = useState<Incident | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/geo/eswatini-regions.json', { cache: 'force-cache' });
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) setGeoData(data);
          return;
        }
      } catch {
        /* fall through */
      }
      if (!cancelled) setGeoData(null);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const visible = useMemo(() => {
    return incidents.map((i) => ({
      incident: i,
      coords: i.coordinates ?? REGION_CENTROIDS[i.region],
      isApprox: !i.coordinates?.lat,
    }));
  }, [incidents]);

  const center: [number, number] = [-26.5225, 31.4659];

  return (
    <div className="relative w-full h-full bg-slate-950">
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-20 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center">
          <div className="flex items-center gap-2 text-slate-400 text-xs">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading incidents…
          </div>
        </div>
      )}

      {/* Header badge */}
      <div className="absolute top-3 left-3 z-10 bg-slate-900/90 backdrop-blur border border-slate-700 rounded-xl px-3 py-2 shadow-xl">
        <div className="flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5 text-yellow-400" />
          <span className="text-[11px] font-black uppercase tracking-wider text-white">
            Eswatini Nationwide
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            {visible.length} pin{visible.length === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute top-3 right-3 z-10 bg-slate-900/90 backdrop-blur border border-slate-700 rounded-xl p-2.5 shadow-xl">
        <div className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
          Severity
        </div>
        <div className="space-y-1">
          {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as Severity[]).map((s) => (
            <div key={s} className="flex items-center gap-1.5 text-[10px] text-slate-300">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: SEVERITY_COLOR[s] }}
              />
              <span>{s}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5 text-[10px] text-slate-300 pt-1 border-t border-slate-700/60">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: RESOLVED_COLOR }} />
            <span>Resolved</span>
          </div>
        </div>
      </div>

      <MapContainer
        center={center}
        zoom={8}
        scrollWheelZoom
        style={{ width: '100%', height: '100%', background: '#0f172a' }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; CARTO'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {geoData ? <GeoJSON data={geoData as never} /> : null}

        {visible.map(({ incident, coords, isApprox }) => {
          const color =
            incident.status === 'resolved' || incident.status === 'closed'
              ? RESOLVED_COLOR
              : SEVERITY_COLOR[incident.severity];
          const isSelected = incident.id === selectedIncidentId;
          const isCritical =
            incident.severity === 'CRITICAL' &&
            incident.status !== 'resolved' &&
            incident.status !== 'closed';

          return (
            <CircleMarker
              key={incident.id}
              center={[coords.lat, coords.lng]}
              radius={isSelected ? 12 : isCritical ? 9 : 7}
              pathOptions={{
                fillColor: color,
                color: isSelected ? '#fbbf24' : isApprox ? '#94a3b8' : '#ffffff',
                weight: isSelected ? 3 : 2,
                fillOpacity: isApprox ? 0.75 : 0.95,
              }}
              eventHandlers={{
                click: () => onSelectIncident(incident.id),
                mouseover: () => setHovered(incident),
                mouseout: () => setHovered(null),
              }}
            >
              <Popup>
                <div className="text-xs min-w-[180px]">
                  <div className="font-mono font-bold text-yellow-600">{incident.id}</div>
                  <div className="font-semibold">{incident.category}</div>
                  <div className="text-slate-600">{incident.location}</div>
                  <div className="mt-1 text-[10px] uppercase tracking-wide">
                    {incident.severity} · {incident.status}
                    {isApprox ? ' · region centre' : ''}
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      {/* Hover preview */}
      {hovered && !selectedIncidentId && (
        <div className="absolute bottom-3 left-3 right-3 max-w-md bg-slate-900/95 backdrop-blur border border-slate-700 rounded-2xl p-3 shadow-2xl z-10 pointer-events-none">
          <div className="flex items-center justify-between text-[10px] mb-1">
            <span className="font-mono text-yellow-400 font-bold">{hovered.id}</span>
            <span className="text-slate-400 font-semibold">
              {hovered.region} · {hovered.mode}
            </span>
          </div>
          <div className="text-xs font-bold text-white truncate">
            {hovered.category} — {hovered.location}
          </div>
          <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">
            {hovered.description}
          </p>
        </div>
      )}
    </div>
  );
}
