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
  Play,
  Pause,
  UserPlus,
  CheckCircle2,
  Navigation,
} from 'lucide-react';
import { toast } from 'sonner';
import type { AgencyCode, Incident, Mode, Region, Severity } from '@/app/types';
import type { Map as LeafletMap, LatLngExpression, Layer } from 'leaflet';
import type { MapDisplayMode, OverlayPin } from './MapOverlayLayers';
import {
  useAcknowledgeIncident,
  useAssignIncident,
} from '@/app/lib/api/mutations/useIncidentActions';
import { useOfficerMe } from '@/app/lib/api/hooks/useOfficerMe';
import { statusLabel } from '@/app/lib/statusLabels';

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
const Tooltip = dynamic(
  () => import('react-leaflet').then((m) => m.Tooltip),
  { ssr: false }
);
const MapOverlayLayers = dynamic(() => import('./MapOverlayLayers'), { ssr: false });

const REGION_CENTROIDS: Record<Region, { lat: number; lng: number }> = {
  Hhohho: { lat: -26.05, lng: 31.15 },
  Manzini: { lat: -26.45, lng: 31.2 },
  Shiselweni: { lat: -26.95, lng: 31.2 },
  Lubombo: { lat: -26.35, lng: 31.8 },
};

/** Major towns for Kingdom identity labels */
const TOWNS: { name: string; lat: number; lng: number }[] = [
  { name: 'Mbabane', lat: -26.3054, lng: 31.1367 },
  { name: 'Manzini', lat: -26.498, lng: 31.38 },
  { name: 'Siteki', lat: -26.45, lng: 31.95 },
  { name: 'Nhlangano', lat: -27.1167, lng: 31.2 },
  { name: 'Piggs Peak', lat: -25.9667, lng: 31.25 },
  { name: 'Big Bend', lat: -26.8167, lng: 31.9333 },
  { name: 'Simunye', lat: -26.2, lng: 31.9167 },
];

/** Transport corridor emphasis (approx road belt points) */
const TRANSPORT_CORRIDOR = [
  [-26.3054, 31.1367],
  [-26.35, 31.25],
  [-26.42, 31.32],
  [-26.498, 31.38],
] as [number, number][];

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
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    label: 'Satellite',
  },
} as const;

type BasemapKey = keyof typeof BASEMAPS;
type MapLens = 'all' | 'transport' | 'trade';

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
  wallMode?: boolean;
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

function matchesLens(incident: Incident, lens: MapLens): boolean {
  if (lens === 'all') return true;
  const mode = (incident.mode || '').toLowerCase();
  const cat = `${incident.category} ${incident.description}`.toLowerCase();
  if (lens === 'transport') {
    return (
      mode.includes('transport') ||
      cat.includes('kombi') ||
      cat.includes('rank') ||
      cat.includes('vehicle') ||
      cat.includes('fare') ||
      cat.includes('road')
    );
  }
  // trade
  return (
    mode.includes('trade') ||
    cat.includes('food') ||
    cat.includes('market') ||
    cat.includes('shop') ||
    cat.includes('hygiene') ||
    cat.includes('restaurant')
  );
}

export function MapPanel({
  incidents,
  isLoading,
  selectedIncidentId,
  onSelectIncident,
  onRegionFilter,
  activeRegion,
  wallMode = false,
}: MapPanelProps) {
  const mapRef = useRef<LeafletMap | null>(null);
  const me = useOfficerMe();
  const [geoData, setGeoData] = useState<GeoJSON.FeatureCollection | null>(null);
  const [hovered, setHovered] = useState<Incident | null>(null);
  const [leafletReady, setLeafletReady] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [basemap, setBasemap] = useState<BasemapKey>('dark');
  const [showOpenOnly, setShowOpenOnly] = useState(true);
  const [showCriticalOnly, setShowCriticalOnly] = useState(false);
  const [showGpsOnly, setShowGpsOnly] = useState(false);
  const [showRegions, setShowRegions] = useState(true);
  const [showTowns, setShowTowns] = useState(true);
  const [showLayers, setShowLayers] = useState(false);
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('24h');
  const [displayMode, setDisplayMode] = useState<MapDisplayMode>('both');
  const [lens, setLens] = useState<MapLens>('all');
  const [wallChrome, setWallChrome] = useState(!wallMode);
  const [scrub, setScrub] = useState(1); // 0..1 within window
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    void Promise.all([
      import('leaflet/dist/leaflet.css'),
      import('leaflet.markercluster/dist/MarkerCluster.css'),
      import('leaflet.markercluster/dist/MarkerCluster.Default.css'),
    ]).then(() => setLeafletReady(true));
  }, []);

  useEffect(() => {
    if (!wallMode) return;
    setTimeWindow('24h');
    setDisplayMode('both');
    setShowOpenOnly(true);
    let timer: number | undefined;
    const bump = () => {
      setWallChrome(true);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setWallChrome(false), 4500);
    };
    bump();
    window.addEventListener('mousemove', bump);
    window.addEventListener('mousedown', bump);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('mousemove', bump);
      window.removeEventListener('mousedown', bump);
    };
  }, [wallMode]);

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

  // Time scrubber playback
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      setScrub((s) => {
        const next = s + 0.008;
        return next >= 1 ? 0 : next;
      });
    }, 120);
    return () => window.clearInterval(id);
  }, [playing]);

  const windowMs = TIME_WINDOWS.find((t) => t.key === timeWindow)?.ms ?? null;
  const windowStart = windowMs == null ? 0 : Date.now() - windowMs;
  const windowEnd = Date.now();
  const scrubEnd =
    windowMs == null ? windowEnd : windowStart + scrub * (windowEnd - windowStart);

  const timedIncidents = useMemo(() => {
    return incidents.filter((i) => {
      if (!withinWindow(i.createdAt, timeWindow)) return false;
      if (!matchesLens(i, lens)) return false;
      const t = new Date(i.createdAt).getTime();
      if (windowMs != null && t > scrubEnd) return false;
      return true;
    });
  }, [incidents, timeWindow, lens, scrubEnd, windowMs]);

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

  const recent5m = useMemo(() => {
    const cut = Date.now() - 5 * 60 * 1000;
    return incidents.filter((i) => new Date(i.createdAt).getTime() >= cut).length;
  }, [incidents]);

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
  const selectedPin = useMemo(
    () => allPins.find((p) => p.incident.id === selectedIncidentId) ?? null,
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
        weight: isActive ? 2.75 : 1.5,
        opacity: isActive ? 1 : 0.65,
        fillColor: open > 0 ? '#eab308' : '#0f172a',
        fillOpacity: isActive ? 0.38 : 0.1 + t * 0.34,
      };
    },
    [regionOpenCounts, maxRegionOpen, activeRegion]
  );

  const onEachRegion = useCallback(
    (feature: GeoJSON.Feature, layer: Layer) => {
      const name = String(feature.properties?.shapeName ?? 'Region');
      const open = regionOpenCounts[name] ?? 0;
      const critical = timedIncidents.filter(
        (i) => i.region === name && i.severity === 'CRITICAL' && isOpen(i.status)
      ).length;
      const leafletLayer = layer as Layer & {
        bindTooltip: (html: string, opts: object) => void;
        on: (event: string, fn: () => void) => void;
      };
      leafletLayer.bindTooltip(
        `<div style="font:12px/1.4 system-ui,sans-serif;min-width:140px">
          <strong style="color:#fbbf24">${name}</strong><br/>
          <span style="color:#e2e8f0">${open} open</span>
          ${critical ? `<span style="color:#f87171"> · ${critical} critical</span>` : ''}<br/>
          <span style="color:#64748b;font-size:10px">Click to filter · double-click map to clear</span>
        </div>`,
        { sticky: true, opacity: 0.96 }
      );
      leafletLayer.on('click', () => {
        if (!onRegionFilter) return;
        if (name in REGION_CENTROIDS) {
          const region = name as Region;
          onRegionFilter(activeRegion === region ? null : region);
          const c = REGION_CENTROIDS[region];
          mapRef.current?.flyTo([c.lat, c.lng], 9.2, { duration: 0.5 });
        }
      });
    },
    [regionOpenCounts, onRegionFilter, timedIncidents, activeRegion]
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
            Syncing Kingdom map…
          </div>
        </div>
      )}

      {/* Top-left identity */}
      <div className="absolute top-3 left-3 z-10 rounded-2xl border border-white/10 bg-black/80 backdrop-blur-md px-3.5 py-2.5 shadow-2xl max-w-[min(100%,280px)]">
        <div className="flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5 text-yellow-400" />
          <span className="text-[11px] font-black uppercase tracking-[0.14em] text-white">
            Kingdom map
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          {recent5m > 0 && (
            <span className="text-[10px] font-black text-rose-300 bg-rose-500/15 border border-rose-500/30 rounded-md px-1.5 py-0.5">
              +{recent5m} / 5m
            </span>
          )}
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
            <span className="text-emerald-300/90 font-bold">{gpsCount}</span> GPS
          </span>
          <span className="text-slate-500">
            {timeWindow}
            {scrub < 0.999 ? ` · ${Math.round(scrub * 100)}%` : ''}
          </span>
        </div>
      </div>

      {/* Region rail */}
      <div
        className={`absolute top-3 right-3 z-10 rounded-2xl border border-white/10 bg-black/80 backdrop-blur-md p-3 shadow-2xl min-w-[148px] transition-opacity duration-300 ${
          wallMode && !wallChrome ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
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
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 pt-0.5">
            <span className="w-2 h-2 rounded-full border border-dashed border-slate-500" />
            <span>Region only</span>
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

      {/* Layers panel */}
      {showLayers && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 rounded-2xl border border-white/10 bg-black/90 backdrop-blur-md p-3 shadow-2xl w-[min(100%,320px)]">
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500 mb-2">
            Lens
          </div>
          <div className="grid grid-cols-3 gap-1.5 mb-3">
            {(
              [
                { key: 'all' as MapLens, label: 'All' },
                { key: 'transport' as MapLens, label: 'Transport' },
                { key: 'trade' as MapLens, label: 'Trade' },
              ] as const
            ).map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => setLens(m.key)}
                className={`text-[10px] font-bold py-1.5 rounded-lg border transition ${
                  lens === m.key
                    ? 'bg-yellow-500 text-slate-950 border-yellow-400'
                    : 'bg-white/5 text-slate-300 border-white/10'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500 mb-2">
            Display
          </div>
          <div className="grid grid-cols-3 gap-1.5 mb-3">
            {(
              [
                { key: 'clusters' as MapDisplayMode, label: 'Clusters' },
                { key: 'heat' as MapDisplayMode, label: 'Heat' },
                { key: 'both' as MapDisplayMode, label: 'Both' },
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
          <div className="grid grid-cols-2 gap-1.5">
            <LayerToggle label="Open only" on={showOpenOnly} set={setShowOpenOnly} />
            <LayerToggle label="Critical only" on={showCriticalOnly} set={setShowCriticalOnly} />
            <LayerToggle label="GPS only" on={showGpsOnly} set={setShowGpsOnly} />
            <LayerToggle label="Region heat" on={showRegions} set={setShowRegions} />
            <LayerToggle label="Towns" on={showTowns} set={setShowTowns} />
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
      <div
        className={`absolute bottom-3 left-1/2 -translate-x-1/2 z-10 rounded-2xl border border-white/10 bg-black/85 backdrop-blur-md px-2 py-1.5 shadow-2xl flex items-center gap-1 max-w-[min(100%-1.5rem,520px)] transition-opacity duration-300 ${
          wallMode && !wallChrome ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          className="p-1.5 rounded-lg text-yellow-400 hover:bg-white/5"
          title={playing ? 'Pause timeline' : 'Play timeline'}
        >
          {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        </button>
        <Clock className="w-3.5 h-3.5 text-slate-500" />
        {TIME_WINDOWS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => {
              setTimeWindow(t.key);
              setScrub(1);
            }}
            className={`min-w-[2.1rem] px-2 py-1.5 rounded-xl text-[10px] font-black transition ${
              timeWindow === t.key
                ? 'bg-yellow-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {t.label}
          </button>
        ))}
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(scrub * 100)}
          onChange={(e) => {
            setPlaying(false);
            setScrub(Number(e.target.value) / 100);
          }}
          className="w-20 sm:w-28 accent-yellow-500"
          title="Scrub time window"
        />
        <div className="w-px h-5 bg-white/10 mx-0.5" />
        <button
          type="button"
          onClick={() =>
            setDisplayMode((m) => (m === 'heat' ? 'clusters' : m === 'clusters' ? 'both' : 'heat'))
          }
          className="px-2 py-1.5 rounded-xl text-[10px] font-bold text-orange-300 hover:bg-white/5 inline-flex items-center gap-1"
        >
          <Flame className="w-3 h-3" />
          {displayMode}
        </button>
        <button
          type="button"
          onClick={() => setShowLayers((v) => !v)}
          className={`px-2 py-1.5 rounded-xl text-[10px] font-bold inline-flex items-center gap-1 ${
            showLayers ? 'text-yellow-400 bg-white/5' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Layers className="w-3 h-3" />
          Layers
        </button>
      </div>

      {/* Controls */}
      <div
        className={`absolute bottom-3 right-3 z-10 flex flex-col gap-1.5 transition-opacity duration-300 ${
          wallMode && !wallChrome ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        <button
          type="button"
          onClick={() => setBasemap((b) => (b === 'satellite' ? 'dark' : 'satellite'))}
          title="Toggle satellite"
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
          onClick={() => {
            onRegionFilter?.(null);
            mapRef.current?.setView(ESWATINI_CENTER, DEFAULT_ZOOM);
          }}
          title="Reset Kingdom view"
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

      {/* Selected case card */}
      {selected && (
        <CaseCard
          incident={selected}
          isApprox={Boolean(selectedPin?.isApprox)}
          currentUserId={me.data?.user.id}
          agencyCode={
            selected.assignedAgencyCode || me.data?.user.agencyCode || 'BIKA'
          }
          wallMode={wallMode}
          onClose={() => onSelectIncident(null)}
        />
      )}

      {leafletReady && (
        <MapContainer
          center={ESWATINI_CENTER}
          zoom={DEFAULT_ZOOM}
          scrollWheelZoom
          style={{ width: '100%', height: '100%', background: '#05080f' }}
          className="z-0 map-ops map-kingdom"
          ref={(instance) => {
            mapRef.current = instance;
          }}
          // double-click clear handled via map events in overlay - use whenCreated alternative
        >
          <TileLayer
            key={basemap}
            attribution={
              basemap === 'satellite'
                ? 'Tiles &copy; Esri'
                : '&copy; OSM &copy; CARTO'
            }
            url={BASEMAPS[basemap].url}
          />

          {showRegions && geoData && (
            <GeoJSON
              key={`geo-${activeRegion ?? 'all'}-${openCount}`}
              data={geoData}
              style={geoStyle as never}
              onEachFeature={onEachRegion as never}
            />
          )}

          {showTowns &&
            TOWNS.map((t) => (
              <CircleMarker
                key={t.name}
                center={[t.lat, t.lng]}
                radius={3}
                pathOptions={{
                  color: '#fbbf24',
                  fillColor: '#fbbf24',
                  fillOpacity: 0.9,
                  weight: 1,
                  opacity: 0.8,
                }}
              >
                <Tooltip direction="top" offset={[0, -4]} opacity={0.95} permanent={false}>
                  <span className="text-[11px] font-bold">{t.name}</span>
                </Tooltip>
              </CircleMarker>
            ))}

          {lens === 'transport' &&
            TRANSPORT_CORRIDOR.map((c, i) => (
              <CircleMarker
                key={`corridor-${i}`}
                center={c}
                radius={4}
                pathOptions={{
                  color: '#38bdf8',
                  fillColor: '#0ea5e9',
                  fillOpacity: 0.25,
                  weight: 1,
                  opacity: 0.4,
                }}
              />
            ))}

          <MapOverlayLayers
            pins={pins}
            mode={displayMode}
            selectedIncidentId={selectedIncidentId}
            onSelectIncident={onSelectIncident}
            onHover={setHovered}
            hideApproxAtZoom={11}
          />
        </MapContainer>
      )}

      {hovered && !selected && (
        <div className="absolute bottom-20 left-3 z-10 max-w-xs rounded-2xl border border-white/10 bg-black/85 backdrop-blur-md px-3 py-2 shadow-2xl pointer-events-none">
          <div className="flex items-center gap-2 text-[10px]">
            <span className="font-mono text-yellow-400 font-bold">{hovered.id}</span>
            <span className="text-slate-400 font-semibold">
              {hovered.region} · {hovered.mode}
            </span>
          </div>
          <div className="text-xs font-bold text-white truncate">
            {hovered.category} — {hovered.location}
          </div>
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
        .bika-bloom-wrap {
          background: transparent !important;
          border: none !important;
        }
        .bika-bloom {
          width: 48px;
          height: 48px;
          border-radius: 9999px;
          border: 2px solid rgba(239, 68, 68, 0.55);
          animation: bika-bloom-pulse 1.8s ease-out infinite;
        }
        .bika-bloom--critical {
          border-color: rgba(239, 68, 68, 0.7);
          box-shadow: 0 0 20px rgba(239, 68, 68, 0.35);
        }
        .bika-bloom--fresh {
          border-color: rgba(251, 191, 36, 0.55);
          animation-duration: 2.2s;
        }
        @keyframes bika-bloom-pulse {
          0% {
            transform: scale(0.35);
            opacity: 0.85;
          }
          70% {
            transform: scale(1.15);
            opacity: 0;
          }
          100% {
            transform: scale(1.2);
            opacity: 0;
          }
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

function CaseCard({
  incident,
  isApprox,
  currentUserId,
  agencyCode,
  wallMode,
  onClose,
}: {
  incident: Incident;
  isApprox: boolean;
  currentUserId?: string;
  agencyCode: AgencyCode | string;
  wallMode: boolean;
  onClose: () => void;
}) {
  const assign = useAssignIncident(incident.id);
  const acknowledge = useAcknowledgeIncident(incident.id);

  const canClaim =
    Boolean(currentUserId) &&
    !incident.assignedOfficerId &&
    isOpen(incident.status);

  const canAck =
    Boolean(currentUserId) &&
    ['submitted', 'triaged', 'assigned'].includes(incident.status) &&
    (!incident.assignedOfficerId || incident.assignedOfficerId === currentUserId);

  const ageMin = Math.max(
    0,
    Math.round((Date.now() - new Date(incident.createdAt).getTime()) / 60_000)
  );

  return (
    <div
      className={`absolute z-20 rounded-2xl border border-white/10 bg-black/90 backdrop-blur-md shadow-2xl ${
        wallMode
          ? 'top-16 left-3 right-3 sm:right-auto sm:w-[360px] p-4'
          : 'bottom-20 right-3 w-[min(100%-1.5rem,320px)] p-3.5'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-xs font-black text-yellow-400">{incident.id}</span>
            <span
              className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md"
              style={{
                backgroundColor: `${SEVERITY_COLOR[incident.severity]}33`,
                color: SEVERITY_COLOR[incident.severity],
              }}
            >
              {incident.severity}
            </span>
            <span className="text-[9px] font-bold text-slate-400 uppercase">
              {statusLabel(incident.status)}
            </span>
          </div>
          <div className="text-sm font-bold text-white mt-1 leading-snug">
            {incident.category}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {incident.location} · {incident.region}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg text-slate-500 hover:text-white"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex flex-wrap gap-2 text-[10px] text-slate-500 mb-3">
        <span className="inline-flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {ageMin < 60 ? `${ageMin}m ago` : `${Math.round(ageMin / 60)}h ago`}
        </span>
        <span className="inline-flex items-center gap-1">
          {isApprox ? (
            <>
              <Navigation className="w-3 h-3 text-slate-500" /> Region only
            </>
          ) : (
            <>
              <MapPin className="w-3 h-3 text-emerald-400" /> GPS
            </>
          )}
        </span>
        {incident.assignedOfficerName ? (
          <span>Assigned: {incident.assignedOfficerName}</span>
        ) : (
          <span className="text-sky-400">Unassigned</span>
        )}
      </div>

      <p className="text-[11px] text-slate-400 line-clamp-3 mb-3">{incident.description}</p>

      <div className="flex flex-wrap gap-2">
        {canClaim && currentUserId && (
          <button
            type="button"
            disabled={assign.isPending}
            onClick={() =>
              assign.mutate(
                {
                  officerId: currentUserId,
                  agencyCode: agencyCode as AgencyCode,
                  reason: 'Claimed from Kingdom map',
                },
                {
                  onSuccess: () => toast.success(`Claimed ${incident.id}`),
                  onError: (e) => toast.error(e.message || 'Claim failed'),
                }
              )
            }
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-yellow-500 text-slate-950 text-[10px] font-black disabled:opacity-50"
          >
            {assign.isPending ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <UserPlus className="w-3 h-3" />
            )}
            Claim
          </button>
        )}
        {canAck && (
          <button
            type="button"
            disabled={acknowledge.isPending}
            onClick={() =>
              acknowledge.mutate(undefined, {
                onSuccess: () => toast.success(`Acknowledged ${incident.id}`),
                onError: (e) => toast.error(e.message || 'Ack failed'),
              })
            }
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-[10px] font-bold disabled:opacity-50"
          >
            {acknowledge.isPending ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <CheckCircle2 className="w-3 h-3" />
            )}
            Ack
          </button>
        )}
        {!wallMode && (
          <Link
            href={`/officer/case/${incident.id}`}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-white/15 text-slate-200 text-[10px] font-bold hover:border-yellow-500/40 hover:text-yellow-300"
          >
            Open case
            <ExternalLink className="w-3 h-3" />
          </Link>
        )}
      </div>
    </div>
  );
}
