'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  Loader2,
  MapPin,
  RotateCcw,
  Crosshair,
  Maximize2,
  Minimize2,
  Layers,
  X,
  ExternalLink,
  Satellite,
} from 'lucide-react';
import type { Incident, Region, Severity } from '@/app/types';
import type { Map as LeafletMap, LatLngExpression, Layer } from 'leaflet';

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
const Circle = dynamic(() => import('react-leaflet').then((m) => m.Circle), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then((m) => m.Popup), { ssr: false });

const REGION_CENTROIDS: Record<Region, { lat: number; lng: number }> = {
  Hhohho: { lat: -26.05, lng: 31.15 },
  Manzini: { lat: -26.45, lng: 31.2 },
  Shiselweni: { lat: -26.95, lng: 31.2 },
  Lubombo: { lat: -26.35, lng: 31.8 },
};

const SEVERITY_COLOR: Record<Severity, string> = {
  CRITICAL: '#ef4444',
  HIGH: '#f97316',
  MEDIUM: '#eab308',
  LOW: '#38bdf8',
};

const RESOLVED_COLOR = '#10b981';
const ESWATINI_CENTER: [number, number] = [-26.5225, 31.4659];
const DEFAULT_ZOOM = 8;

const BASEMAPS = {
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    label: 'Dark',
  },
  light: {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    label: 'Light',
  },
} as const;

type BasemapKey = keyof typeof BASEMAPS;

interface MapPanelProps {
  incidents: Incident[];
  isLoading: boolean;
  selectedIncidentId: string | null;
  onSelectIncident: (id: string) => void;
  onRegionFilter?: (region: Region | null) => void;
  activeRegion?: string | null;
}

interface Pin {
  incident: Incident;
  lat: number;
  lng: number;
  isApprox: boolean;
}

function isOpen(status: Incident['status']) {
  return !['resolved', 'closed', 'rejected'].includes(status);
}

function jitterApprox(region: Region, index: number): { lat: number; lng: number } {
  const base = REGION_CENTROIDS[region];
  const ring = Math.floor(index / 8);
  const slot = index % 8;
  const angle = (slot / 8) * Math.PI * 2 + ring * 0.35;
  const radius = 0.035 + ring * 0.028;
  return {
    lat: base.lat + Math.sin(angle) * radius,
    lng: base.lng + Math.cos(angle) * radius * 1.15,
  };
}

export function MapPanel({
  incidents,
  isLoading,
  selectedIncidentId,
  onSelectIncident,
  onRegionFilter,
  activeRegion,
}: MapPanelProps) {
  const mapRef = useRef<LeafletMap | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const [geoData, setGeoData] = useState<GeoJSON.FeatureCollection | null>(null);
  const [hovered, setHovered] = useState<Incident | null>(null);
  const [leafletReady, setLeafletReady] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [basemap, setBasemap] = useState<BasemapKey>('dark');
  const [showOpenOnly, setShowOpenOnly] = useState(true);
  const [showCriticalOnly, setShowCriticalOnly] = useState(false);
  const [showGpsOnly, setShowGpsOnly] = useState(false);
  const [showRegions, setShowRegions] = useState(true);
  const [showLayers, setShowLayers] = useState(false);
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    void import('leaflet/dist/leaflet.css').then(() => setLeafletReady(true));
  }, []);

  // Subtle pulse tick for critical rings
  useEffect(() => {
    const id = window.setInterval(() => setPulse((p) => p + 1), 1200);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/geo/eswatini-regions.json', { cache: 'force-cache' });
        if (res.ok) {
          const data = (await res.json()) as GeoJSON.FeatureCollection;
          if (!cancelled) setGeoData(data);
          return;
        }
      } catch {
        /* optional */
      }
      if (!cancelled) setGeoData(null);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (fullscreen) {
          setFullscreen(false);
          return;
        }
        onSelectIncident('');
        // parent should treat '' as clear — fix via null
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullscreen, onSelectIncident]);

  // Clear selection with Escape properly
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedIncidentId) {
        onSelectIncident(null as unknown as string);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedIncidentId, onSelectIncident]);

  useEffect(() => {
    if (!fullscreen) return;
    const t = setTimeout(() => mapRef.current?.invalidateSize(), 120);
    return () => clearTimeout(t);
  }, [fullscreen]);

  const regionOpenCounts = useMemo(() => {
    const counts: Record<string, number> = {
      Hhohho: 0,
      Manzini: 0,
      Shiselweni: 0,
      Lubombo: 0,
    };
    for (const i of incidents) {
      if (isOpen(i.status) && i.region in counts) counts[i.region] += 1;
    }
    return counts;
  }, [incidents]);

  const maxRegionOpen = useMemo(
    () => Math.max(1, ...Object.values(regionOpenCounts)),
    [regionOpenCounts]
  );

  const allPins: Pin[] = useMemo(() => {
    const approxIndex: Record<string, number> = {};
    return incidents.map((incident) => {
      const hasGps =
        incident.coordinates &&
        typeof incident.coordinates.lat === 'number' &&
        typeof incident.coordinates.lng === 'number';

      if (hasGps) {
        return {
          incident,
          lat: incident.coordinates!.lat,
          lng: incident.coordinates!.lng,
          isApprox: false,
        };
      }

      const region = (incident.region in REGION_CENTROIDS
        ? incident.region
        : 'Manzini') as Region;
      const idx = approxIndex[region] ?? 0;
      approxIndex[region] = idx + 1;
      const j = jitterApprox(region, idx);
      return { incident, lat: j.lat, lng: j.lng, isApprox: true };
    });
  }, [incidents]);

  const pins = useMemo(() => {
    return allPins.filter(({ incident, isApprox }) => {
      if (showOpenOnly && !isOpen(incident.status)) return false;
      if (showCriticalOnly && !(incident.severity === 'CRITICAL' && isOpen(incident.status)))
        return false;
      if (showGpsOnly && isApprox) return false;
      return true;
    });
  }, [allPins, showOpenOnly, showCriticalOnly, showGpsOnly]);

  const selected = useMemo(
    () => allPins.find((p) => p.incident.id === selectedIncidentId)?.incident ?? null,
    [allPins, selectedIncidentId]
  );

  const fitToPins = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    void import('leaflet').then((L) => {
      if (pins.length === 0) {
        map.setView(ESWATINI_CENTER, DEFAULT_ZOOM);
        return;
      }
      const bounds = L.latLngBounds(pins.map((p) => [p.lat, p.lng] as LatLngExpression));
      map.fitBounds(bounds.pad(0.22), { maxZoom: 11, animate: true });
    });
  }, [pins]);

  const pinSignature = pins.map((p) => p.incident.id).join('|');
  useEffect(() => {
    if (!leafletReady || !mapRef.current) return;
    const t = setTimeout(() => fitToPins(), 80);
    return () => clearTimeout(t);
  }, [pinSignature, leafletReady, fitToPins]);

  useEffect(() => {
    if (!selectedIncidentId || !mapRef.current) return;
    const pin = allPins.find((p) => p.incident.id === selectedIncidentId);
    if (!pin) return;
    mapRef.current.flyTo([pin.lat, pin.lng], Math.max(mapRef.current.getZoom(), 10), {
      duration: 0.55,
    });
  }, [selectedIncidentId, allPins]);

  const geoStyle = useCallback(
    (feature?: GeoJSON.Feature) => {
      const name = String(feature?.properties?.shapeName ?? '');
      const open = regionOpenCounts[name] ?? 0;
      const t = open / maxRegionOpen;
      const isActive = activeRegion && name === activeRegion;
      return {
        color: isActive ? '#fbbf24' : '#eab308',
        weight: isActive ? 2.5 : 1.25,
        opacity: isActive ? 0.95 : 0.55,
        fillColor: open > 0 ? '#eab308' : '#1e293b',
        fillOpacity: isActive ? 0.35 : 0.08 + t * 0.32,
      };
    },
    [regionOpenCounts, maxRegionOpen, activeRegion]
  );

  const onEachRegion = useCallback(
    (feature: GeoJSON.Feature, layer: Layer) => {
      const name = String(feature.properties?.shapeName ?? 'Region');
      const open = regionOpenCounts[name] ?? 0;
      const leafletLayer = layer as Layer & {
        bindTooltip: (html: string, opts: object) => void;
        on: (event: string, fn: () => void) => void;
      };
      leafletLayer.bindTooltip(
        `<div style="font:12px/1.35 system-ui,sans-serif">
          <strong>${name}</strong><br/>
          <span style="color:#94a3b8">${open} open · click to filter</span>
        </div>`,
        { sticky: true, opacity: 0.95 }
      );
      leafletLayer.on('click', () => {
        if (!onRegionFilter) return;
        if (name in REGION_CENTROIDS) {
          onRegionFilter(name as Region);
        }
      });
    },
    [regionOpenCounts, onRegionFilter]
  );

  const openCount = incidents.filter((i) => isOpen(i.status)).length;
  const criticalCount = incidents.filter(
    (i) => i.severity === 'CRITICAL' && isOpen(i.status)
  ).length;
  const gpsCount = allPins.filter((p) => !p.isApprox).length;

  const clearSelection = () => onSelectIncident(null as unknown as string);

  // Fix: parent uses string | null — update page to accept null. For now pass empty and handle in page.
  const select = (id: string | null) => {
    if (id === null) {
      onSelectIncident('' as string);
      return;
    }
    onSelectIncident(id);
  };

  return (
    <div
      ref={shellRef}
      className={`relative w-full h-full bg-[#05080f] ${
        fullscreen ? 'fixed inset-0 z-[80]' : ''
      }`}
    >
      {isLoading && (
        <div className="absolute inset-0 z-20 bg-[#05080f]/70 backdrop-blur-sm flex items-center justify-center">
          <div className="flex items-center gap-2 text-slate-400 text-xs">
            <Loader2 className="w-4 h-4 animate-spin" />
            Syncing map…
          </div>
        </div>
      )}

      {/* Status */}
      <div className="absolute top-3 left-3 z-10 rounded-2xl border border-white/10 bg-black/75 backdrop-blur-md px-3.5 py-2.5 shadow-2xl">
        <div className="flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5 text-yellow-400" />
          <span className="text-[11px] font-black uppercase tracking-[0.14em] text-white">
            Kingdom map
          </span>
          {activeRegion && (
            <button
              type="button"
              onClick={() => onRegionFilter?.(null)}
              className="text-[10px] font-bold text-yellow-300 bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-1.5 py-0.5 inline-flex items-center gap-1"
            >
              {activeRegion}
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] font-mono text-slate-400">
          <span>
            <span className="text-white font-bold">{pins.length}</span> shown
          </span>
          <span>
            <span className="text-sky-300 font-bold">{openCount}</span> open
          </span>
          {criticalCount > 0 && (
            <span>
              <span className="text-red-400 font-bold">{criticalCount}</span> critical
            </span>
          )}
          <span>
            <span className="text-slate-300 font-bold">{gpsCount}</span> GPS
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute top-3 right-3 z-10 rounded-2xl border border-white/10 bg-black/75 backdrop-blur-md p-3 shadow-2xl min-w-[140px]">
        <div className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500 mb-2">
          Severity
        </div>
        <div className="space-y-1 mb-3">
          {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as Severity[]).map((s) => (
            <div key={s} className="flex items-center gap-1.5 text-[10px] text-slate-300">
              <span
                className="w-2 h-2 rounded-full"
                style={{
                  backgroundColor: SEVERITY_COLOR[s],
                  boxShadow: s === 'CRITICAL' ? `0 0 8px ${SEVERITY_COLOR[s]}` : undefined,
                }}
              />
              <span>{s}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5 text-[10px] text-slate-300 pt-1 border-t border-white/10">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: RESOLVED_COLOR }} />
            <span>Resolved</span>
          </div>
        </div>
        <div className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500 mb-1.5">
          Open by region
        </div>
        <div className="space-y-1">
          {(Object.keys(REGION_CENTROIDS) as Region[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => onRegionFilter?.(activeRegion === r ? null : r)}
              className={`w-full flex items-center justify-between gap-2 text-[10px] rounded-lg px-1.5 py-0.5 transition ${
                activeRegion === r
                  ? 'bg-yellow-500/15 text-yellow-300'
                  : 'text-slate-400 hover:bg-white/5'
              }`}
            >
              <span>{r}</span>
              <span className="font-mono font-bold text-yellow-400/90">
                {regionOpenCounts[r] ?? 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Layer panel */}
      {showLayers && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 rounded-2xl border border-white/10 bg-black/85 backdrop-blur-md p-3 shadow-2xl w-[min(100%,280px)]">
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500 mb-2">
            Map layers
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <LayerToggle label="Open only" on={showOpenOnly} set={setShowOpenOnly} />
            <LayerToggle label="Critical only" on={showCriticalOnly} set={setShowCriticalOnly} />
            <LayerToggle label="GPS only" on={showGpsOnly} set={setShowGpsOnly} />
            <LayerToggle label="Region heat" on={showRegions} set={setShowRegions} />
          </div>
          <div className="mt-2.5 flex gap-1.5">
            {(Object.keys(BASEMAPS) as BasemapKey[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setBasemap(key)}
                className={`flex-1 text-[10px] font-bold py-1.5 rounded-lg border transition ${
                  basemap === key
                    ? 'bg-yellow-500 text-slate-950 border-yellow-400'
                    : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                }`}
              >
                {BASEMAPS[key].label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="absolute bottom-3 right-3 z-10 flex flex-col gap-1.5">
        <button
          type="button"
          onClick={() => setShowLayers((v) => !v)}
          title="Layers"
          className={`w-9 h-9 rounded-xl border backdrop-blur-md flex items-center justify-center shadow-xl ${
            showLayers
              ? 'border-yellow-500/40 bg-yellow-500/15 text-yellow-400'
              : 'border-white/10 bg-black/70 text-slate-300 hover:text-yellow-400'
          }`}
        >
          <Layers className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => setBasemap((b) => (b === 'dark' ? 'light' : 'dark'))}
          title="Toggle basemap"
          className="w-9 h-9 rounded-xl border border-white/10 bg-black/70 backdrop-blur-md text-slate-300 hover:text-yellow-400 flex items-center justify-center shadow-xl"
        >
          <Satellite className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={fitToPins}
          title="Fit to incidents"
          className="w-9 h-9 rounded-xl border border-white/10 bg-black/70 backdrop-blur-md text-slate-300 hover:text-yellow-400 flex items-center justify-center shadow-xl"
        >
          <Crosshair className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => mapRef.current?.setView(ESWATINI_CENTER, DEFAULT_ZOOM)}
          title="Reset view"
          className="w-9 h-9 rounded-xl border border-white/10 bg-black/70 backdrop-blur-md text-slate-300 hover:text-yellow-400 flex items-center justify-center shadow-xl"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setFullscreen((f) => !f)}
          title={fullscreen ? 'Exit fullscreen' : 'Fullscreen map'}
          className="w-9 h-9 rounded-xl border border-white/10 bg-black/70 backdrop-blur-md text-slate-300 hover:text-yellow-400 flex items-center justify-center shadow-xl"
        >
          {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {leafletReady && (
        <MapContainer
          center={ESWATINI_CENTER}
          zoom={DEFAULT_ZOOM}
          scrollWheelZoom
          style={{ width: '100%', height: '100%', background: '#05080f' }}
          className="z-0 map-ops"
          ref={(instance) => {
            mapRef.current = instance;
          }}
        >
          <TileLayer
            key={basemap}
            attribution='&copy; OSM &copy; CARTO'
            url={BASEMAPS[basemap].url}
          />

          {showRegions && geoData && (
            <GeoJSON
              key={`regions-${Object.values(regionOpenCounts).join('-')}-${activeRegion ?? ''}`}
              data={geoData as never}
              style={geoStyle as never}
              onEachFeature={onEachRegion as never}
            />
          )}

          {pins.map(({ incident, lat, lng, isApprox }) => {
            const color =
              incident.status === 'resolved' || incident.status === 'closed'
                ? RESOLVED_COLOR
                : SEVERITY_COLOR[incident.severity];
            const isSelected = incident.id === selectedIncidentId;
            const isCritical =
              incident.severity === 'CRITICAL' && isOpen(incident.status);
            // pulse drives opacity/radius via remount key fragment
            const pulsePhase = pulse % 2;

            return (
              <React.Fragment key={incident.id}>
                {isCritical && (
                  <Circle
                    center={[lat, lng]}
                    radius={isSelected ? 900 + pulsePhase * 200 : 700 + pulsePhase * 180}
                    pathOptions={{
                      color: '#ef4444',
                      weight: 1,
                      opacity: pulsePhase ? 0.15 : 0.35,
                      fillColor: '#ef4444',
                      fillOpacity: pulsePhase ? 0.04 : 0.1,
                    }}
                    eventHandlers={{
                      click: () => select(incident.id),
                    }}
                  />
                )}
                <CircleMarker
                  center={[lat, lng]}
                  radius={isSelected ? 13 : isCritical ? 10 : isApprox ? 7 : 8}
                  pathOptions={{
                    fillColor: color,
                    color: isSelected ? '#fbbf24' : isApprox ? color : '#ffffff',
                    weight: isSelected ? 3 : isApprox ? 1.5 : 2,
                    fillOpacity: isApprox ? 0.55 : 0.92,
                    opacity: 0.95,
                    dashArray: isApprox ? '2 3' : undefined,
                  }}
                  eventHandlers={{
                    click: () => select(incident.id),
                    mouseover: () => setHovered(incident),
                    mouseout: () => setHovered((h) => (h?.id === incident.id ? null : h)),
                  }}
                >
                  <Popup>
                    <div className="text-xs min-w-[190px]">
                      <div className="font-mono font-bold text-amber-600">{incident.id}</div>
                      <div className="font-semibold text-slate-900">{incident.category}</div>
                      <div className="text-slate-600">{incident.location}</div>
                      <div className="mt-1 text-[10px] uppercase tracking-wide text-slate-500">
                        {incident.severity} · {incident.status}
                        {isApprox ? ' · approx region' : ' · GPS'}
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              </React.Fragment>
            );
          })}
        </MapContainer>
      )}

      {!leafletReady && (
        <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-xs">
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
          Loading map engine…
        </div>
      )}

      {/* Selected dock */}
      {selected && (
        <div className="absolute bottom-3 left-3 right-14 max-w-lg z-10 rounded-2xl border border-yellow-500/30 bg-black/85 backdrop-blur-md p-3.5 shadow-2xl">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[10px]">
                <span className="font-mono text-yellow-400 font-bold">{selected.id}</span>
                <span
                  className="font-black uppercase"
                  style={{ color: SEVERITY_COLOR[selected.severity] }}
                >
                  {selected.severity}
                </span>
                <span className="text-slate-500">{selected.status.replace('_', ' ')}</span>
              </div>
              <div className="text-sm font-bold text-white mt-1 truncate">
                {selected.category}
                <span className="text-slate-500 font-normal"> — </span>
                {selected.location}
              </div>
              <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">{selected.description}</p>
            </div>
            <button
              type="button"
              onClick={() => select(null)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              aria-label="Clear selection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href={`/officer/case/${selected.id}`}
              className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-xl bg-yellow-500 text-slate-950 hover:bg-yellow-400"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open case
            </Link>
            <button
              type="button"
              onClick={() => onRegionFilter?.(selected.region as Region)}
              className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
            >
              Filter {selected.region}
            </button>
          </div>
        </div>
      )}

      {!selected && hovered && (
        <div className="absolute bottom-3 left-3 right-14 max-w-md rounded-2xl border border-white/10 bg-black/80 backdrop-blur-md p-3.5 shadow-2xl z-10 pointer-events-none">
          <div className="flex items-center justify-between gap-2 text-[10px] mb-1">
            <span className="font-mono text-yellow-400 font-bold">{hovered.id}</span>
            <span className="text-slate-400 font-semibold">
              {hovered.region} · {hovered.mode}
            </span>
          </div>
          <div className="text-xs font-bold text-white truncate">
            {hovered.category} — {hovered.location}
          </div>
          <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">{hovered.description}</p>
        </div>
      )}

      <style jsx global>{`
        .map-ops .leaflet-control-zoom a {
          background: rgba(0, 0, 0, 0.75) !important;
          color: #e2e8f0 !important;
          border-color: rgba(255, 255, 255, 0.1) !important;
        }
        .map-ops .leaflet-control-zoom a:hover {
          background: rgba(234, 179, 8, 0.2) !important;
          color: #fbbf24 !important;
        }
        .map-ops .leaflet-control-attribution {
          background: rgba(0, 0, 0, 0.55) !important;
          color: #64748b !important;
          font-size: 9px !important;
        }
        .map-ops .leaflet-control-attribution a {
          color: #94a3b8 !important;
        }
      `}</style>
    </div>
  );
}

function LayerToggle({
  label,
  on,
  set,
}: {
  label: string;
  on: boolean;
  set: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => set(!on)}
      className={`text-[10px] font-bold py-1.5 rounded-lg border transition ${
        on
          ? 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30'
          : 'bg-white/5 text-slate-400 border-white/10'
      }`}
    >
      {label}
    </button>
  );
}
