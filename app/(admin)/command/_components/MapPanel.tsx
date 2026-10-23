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
  Clock,
  Flame,
} from 'lucide-react';
import type { Incident, Region, Severity } from '@/app/types';
import type { Map as LeafletMap, LatLngExpression, Layer } from 'leaflet';
import type { MapDisplayMode, OverlayPin } from './MapOverlayLayers';

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
const MapOverlayLayers = dynamic(() => import('./MapOverlayLayers'), { ssr: false });

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

export type TimeWindow = '1h' | '6h' | '24h' | '7d' | 'all';

const TIME_WINDOWS: { key: TimeWindow; label: string; ms: number | null }[] = [
  { key: '1h', label: '1h', ms: 60 * 60 * 1000 },
  { key: '6h', label: '6h', ms: 6 * 60 * 60 * 1000 },
  { key: '24h', label: '24h', ms: 24 * 60 * 60 * 1000 },
  { key: '7d', label: '7d', ms: 7 * 24 * 60 * 60 * 1000 },
  { key: 'all', label: 'All', ms: null },
];

interface MapPanelProps {
  incidents: Incident[];
  isLoading: boolean;
  selectedIncidentId: string | null;
  onSelectIncident: (id: string | null) => void;
  onRegionFilter?: (region: Region | null) => void;
  activeRegion?: string | null;
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

function withinWindow(iso: string, window: TimeWindow): boolean {
  const def = TIME_WINDOWS.find((t) => t.key === window);
  if (!def || def.ms == null) return true;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return true;
  return Date.now() - t <= def.ms;
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
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('24h');
  const [displayMode, setDisplayMode] = useState<MapDisplayMode>('both');

  useEffect(() => {
    void Promise.all([
      import('leaflet/dist/leaflet.css'),
      import('leaflet.markercluster/dist/MarkerCluster.css'),
      import('leaflet.markercluster/dist/MarkerCluster.Default.css'),
    ]).then(() => setLeafletReady(true));
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
        if (selectedIncidentId) onSelectIncident(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullscreen, selectedIncidentId, onSelectIncident]);

  useEffect(() => {
    if (!fullscreen) return;
    const t = setTimeout(() => mapRef.current?.invalidateSize(), 120);
    return () => clearTimeout(t);
  }, [fullscreen]);

  const timedIncidents = useMemo(
    () => incidents.filter((i) => withinWindow(i.createdAt, timeWindow)),
    [incidents, timeWindow]
  );

  const regionOpenCounts = useMemo(() => {
    const counts: Record<string, number> = {
      Hhohho: 0,
      Manzini: 0,
      Shiselweni: 0,
      Lubombo: 0,
    };
    for (const i of timedIncidents) {
      if (isOpen(i.status) && i.region in counts) counts[i.region] += 1;
    }
    return counts;
  }, [timedIncidents]);

  const maxRegionOpen = useMemo(
    () => Math.max(1, ...Object.values(regionOpenCounts)),
    [regionOpenCounts]
  );

  const allPins: OverlayPin[] = useMemo(() => {
    const approxIndex: Record<string, number> = {};
    return timedIncidents.map((incident) => {
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
  }, [timedIncidents]);

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
        if (name in REGION_CENTROIDS) onRegionFilter(name as Region);
      });
    },
    [regionOpenCounts, onRegionFilter]
  );

  const openCount = timedIncidents.filter((i) => isOpen(i.status)).length;
  const criticalCount = timedIncidents.filter(
    (i) => i.severity === 'CRITICAL' && isOpen(i.status)
  ).length;
  const gpsCount = allPins.filter((p) => !p.isApprox).length;

  return (
    <div
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
          <span className="text-slate-500">
            window <span className="text-yellow-400/90 font-bold">{timeWindow}</span>
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
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 rounded-2xl border border-white/10 bg-black/85 backdrop-blur-md p-3 shadow-2xl w-[min(100%,300px)]">
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500 mb-2">
            Display mode
          </div>
          <div className="grid grid-cols-3 gap-1.5 mb-3">
            {(
              [
                { key: 'clusters', label: 'Clusters' },
                { key: 'heat', label: 'Heat' },
                { key: 'both', label: 'Both' },
              ] as const
            ).map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => setDisplayMode(m.key)}
                className={`text-[10px] font-bold py-1.5 rounded-lg border transition ${
                  displayMode === m.key
                    ? 'bg-yellow-500 text-slate-950 border-yellow-400'
                    : 'bg-white/5 text-slate-300 border-white/10'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500 mb-2">
            Filters
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
                    : 'bg-white/5 text-slate-300 border-white/10'
                }`}
              >
                {BASEMAPS[key].label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Time scrubber */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 rounded-2xl border border-white/10 bg-black/80 backdrop-blur-md px-2 py-1.5 shadow-2xl flex items-center gap-1">
        <Clock className="w-3.5 h-3.5 text-slate-500 ml-1" />
        {TIME_WINDOWS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTimeWindow(t.key)}
            className={`min-w-[2.25rem] px-2.5 py-1.5 rounded-xl text-[10px] font-black transition ${
              timeWindow === t.key
                ? 'bg-yellow-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {t.label}
          </button>
        ))}
        <div className="w-px h-5 bg-white/10 mx-0.5" />
        <button
          type="button"
          onClick={() => setDisplayMode((m) => (m === 'heat' ? 'clusters' : m === 'clusters' ? 'both' : 'heat'))}
          title="Cycle display mode"
          className="px-2 py-1.5 rounded-xl text-[10px] font-bold text-orange-300 hover:bg-white/5 inline-flex items-center gap-1"
        >
          <Flame className="w-3 h-3" />
          {displayMode}
        </button>
      </div>

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
          <TileLayer key={basemap} attribution="&copy; OSM &copy; CARTO" url={BASEMAPS[basemap].url} />

          {showRegions && geoData && (
            <GeoJSON
              key={`regions-${Object.values(regionOpenCounts).join('-')}-${activeRegion ?? ''}`}
              data={geoData as never}
              style={geoStyle as never}
              onEachFeature={onEachRegion as never}
            />
          )}

          <MapOverlayLayers
            pins={pins}
            mode={displayMode}
            selectedIncidentId={selectedIncidentId}
            onSelectIncident={onSelectIncident}
            onHover={setHovered}
          />
        </MapContainer>
      )}

      {!leafletReady && (
        <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-xs">
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
          Loading map engine…
        </div>
      )}

      {selected && (
        <div className="absolute bottom-16 left-3 right-14 max-w-lg z-10 rounded-2xl border border-yellow-500/30 bg-black/85 backdrop-blur-md p-3.5 shadow-2xl">
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
              onClick={() => onSelectIncident(null)}
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
        <div className="absolute bottom-16 left-3 right-14 max-w-md rounded-2xl border border-white/10 bg-black/80 backdrop-blur-md p-3.5 shadow-2xl z-10 pointer-events-none">
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
        .bika-cluster-wrap {
          background: transparent !important;
          border: none !important;
        }
        .bika-cluster {
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 9999px;
          font-weight: 800;
          font-size: 11px;
          color: #0f172a;
          background: linear-gradient(135deg, #fbbf24, #f59e0b);
          border: 2px solid rgba(255, 255, 255, 0.35);
          box-shadow: 0 0 0 4px rgba(234, 179, 8, 0.2), 0 8px 24px rgba(0, 0, 0, 0.45);
        }
        .bika-cluster--sm {
          width: 34px;
          height: 34px;
        }
        .bika-cluster--md {
          width: 42px;
          height: 42px;
          font-size: 12px;
        }
        .bika-cluster--lg {
          width: 52px;
          height: 52px;
          font-size: 13px;
          background: linear-gradient(135deg, #f97316, #ef4444);
          color: #fff;
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
