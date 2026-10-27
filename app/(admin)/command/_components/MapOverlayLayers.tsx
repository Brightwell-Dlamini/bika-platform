'use client';

/**
 * Kingdom map overlays — clusters, severity-weighted heat, honest GPS vs approx,
 * animated CRITICAL pulse, and new-incident bloom.
 */

import { useEffect, useRef } from 'react';
import { useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet.heat';
import type { Incident, Severity } from '@/app/types';

export interface OverlayPin {
  incident: Incident;
  lat: number;
  lng: number;
  isApprox: boolean;
}

export type MapDisplayMode = 'clusters' | 'heat' | 'both';

const SEVERITY_COLOR: Record<Severity, string> = {
  CRITICAL: '#ef4444',
  HIGH: '#f97316',
  MEDIUM: '#eab308',
  LOW: '#38bdf8',
};

const RESOLVED_COLOR = '#10b981';

function isOpen(status: Incident['status']) {
  return !['resolved', 'closed', 'rejected'].includes(status);
}

function pinColor(incident: Incident) {
  if (incident.status === 'resolved' || incident.status === 'closed') return RESOLVED_COLOR;
  return SEVERITY_COLOR[incident.severity];
}

/** Severity × recency weight for heat (CRITICAL + fresh dominates). */
function heatWeight(incident: Incident): number {
  if (!isOpen(incident.status)) return 0.06;
  const ageMin = Math.max(0, (Date.now() - new Date(incident.createdAt).getTime()) / 60_000);
  const recency =
    ageMin < 15 ? 1 : ageMin < 60 ? 0.85 : ageMin < 360 ? 0.55 : ageMin < 1440 ? 0.35 : 0.2;
  const sev =
    incident.severity === 'CRITICAL'
      ? 1
      : incident.severity === 'HIGH'
        ? 0.72
        : incident.severity === 'MEDIUM'
          ? 0.4
          : 0.22;
  return Math.min(1, sev * recency * 1.15);
}

function isFresh(incident: Incident, ms = 30_000) {
  return Date.now() - new Date(incident.createdAt).getTime() < ms;
}

interface MapOverlayLayersProps {
  pins: OverlayPin[];
  mode: MapDisplayMode;
  selectedIncidentId: string | null;
  onSelectIncident: (id: string | null) => void;
  onHover: (incident: Incident | null) => void;
  /** Hide approximate pins when zoomed in (honest place). */
  hideApproxAtZoom?: number;
}

export default function MapOverlayLayers({
  pins,
  mode,
  selectedIncidentId,
  onSelectIncident,
  onHover,
  hideApproxAtZoom = 11,
}: MapOverlayLayersProps) {
  const map = useMap();
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const heatRef = useRef<L.Layer | null>(null);
  const pulseRef = useRef<L.LayerGroup | null>(null);
  const approxRef = useRef<L.LayerGroup | null>(null);
  const zoomRef = useRef(map.getZoom());

  useMapEvents({
    zoomend: () => {
      zoomRef.current = map.getZoom();
      // Force rebuild on zoom threshold cross via effect dependency alternative:
      // handled by listening below
    },
  });

  useEffect(() => {
    const onZoom = () => {
      zoomRef.current = map.getZoom();
    };
    map.on('zoomend', onZoom);
    return () => {
      map.off('zoomend', onZoom);
    };
  }, [map]);

  useEffect(() => {
    if (clusterRef.current) {
      map.removeLayer(clusterRef.current);
      clusterRef.current = null;
    }
    if (pulseRef.current) {
      map.removeLayer(pulseRef.current);
      pulseRef.current = null;
    }
    if (heatRef.current) {
      map.removeLayer(heatRef.current);
      heatRef.current = null;
    }
    if (approxRef.current) {
      map.removeLayer(approxRef.current);
      approxRef.current = null;
    }

    const zoom = map.getZoom();
    const showApprox = zoom < hideApproxAtZoom;
    const showClusters = mode === 'clusters' || mode === 'both';
    const showHeat = mode === 'heat' || mode === 'both';

    const gpsPins = pins.filter((p) => !p.isApprox);
    const approxPins = showApprox ? pins.filter((p) => p.isApprox) : [];

    if (showHeat && pins.length > 0) {
      const heatPoints: [number, number, number][] = pins.map((p) => [
        p.lat,
        p.lng,
        heatWeight(p.incident),
      ]);
      const heat = (
        L as typeof L & {
          heatLayer: (latlngs: [number, number, number][], opts?: object) => L.Layer;
        }
      ).heatLayer(heatPoints, {
        radius: 32,
        blur: 24,
        maxZoom: 14,
        max: 1.0,
        minOpacity: 0.22,
        gradient: {
          0.15: '#0c4a6e',
          0.35: '#0ea5e9',
          0.5: '#eab308',
          0.7: '#f97316',
          0.88: '#ef4444',
          1.0: '#f43f5e',
        },
      });
      heat.addTo(map);
      heatRef.current = heat;
    }

    // Approximate region markers — soft, never look like street GPS
    if (approxPins.length > 0) {
      const approxGroup = L.layerGroup();
      for (const pin of approxPins) {
        const color = pinColor(pin.incident);
        const marker = L.circleMarker([pin.lat, pin.lng], {
          radius: 5,
          fillColor: color,
          color,
          weight: 1,
          fillOpacity: 0.35,
          opacity: 0.55,
          dashArray: '3 4',
        });
        marker.on('click', () => onSelectIncident(pin.incident.id));
        marker.on('mouseover', () => onHover(pin.incident));
        marker.on('mouseout', () => onHover(null));
        approxGroup.addLayer(marker);
      }
      approxGroup.addTo(map);
      approxRef.current = approxGroup;
    }

    if (showClusters) {
      const cluster = L.markerClusterGroup({
        showCoverageOnHover: false,
        maxClusterRadius: 46,
        spiderfyOnMaxZoom: true,
        disableClusteringAtZoom: 13,
        zoomToBoundsOnClick: true,
        iconCreateFunction: (clust) => {
          const count = clust.getChildCount();
          const size = count < 8 ? 'sm' : count < 25 ? 'md' : 'lg';
          const dims = size === 'sm' ? 34 : size === 'md' ? 42 : 52;
          return L.divIcon({
            html: `<div class="bika-cluster bika-cluster--${size}"><span>${count}</span></div>`,
            className: 'bika-cluster-wrap',
            iconSize: L.point(dims, dims),
          });
        },
      });

      const pulses = L.layerGroup();

      for (const pin of gpsPins) {
        const { incident, lat, lng } = pin;
        const color = pinColor(incident);
        const isSelected = incident.id === selectedIncidentId;
        const critical = incident.severity === 'CRITICAL' && isOpen(incident.status);
        const fresh = isFresh(incident, 45_000);

        // Primary GPS marker
        const marker = L.circleMarker([lat, lng], {
          radius: isSelected ? 13 : critical ? 10 : 7.5,
          fillColor: color,
          color: isSelected ? '#fbbf24' : '#ffffff',
          weight: isSelected ? 3 : 2.25,
          fillOpacity: 0.95,
          opacity: 1,
          className: critical ? 'bika-pin-critical' : fresh ? 'bika-pin-fresh' : '',
        });

        marker.on('click', () => onSelectIncident(incident.id));
        marker.on('mouseover', () => onHover(incident));
        marker.on('mouseout', () => onHover(null));
        cluster.addLayer(marker);

        // Animated CRITICAL / new bloom (divIcon)
        if (critical || fresh) {
          const bloom = L.marker([lat, lng], {
            interactive: false,
            keyboard: false,
            icon: L.divIcon({
              className: 'bika-bloom-wrap',
              html: `<div class="bika-bloom ${critical ? 'bika-bloom--critical' : 'bika-bloom--fresh'}"></div>`,
              iconSize: [48, 48],
              iconAnchor: [24, 24],
            }),
            zIndexOffset: -10,
          });
          pulses.addLayer(bloom);
        }
      }

      cluster.addTo(map);
      clusterRef.current = cluster;
      pulses.addTo(map);
      pulseRef.current = pulses;
    }

    return () => {
      if (clusterRef.current) {
        map.removeLayer(clusterRef.current);
        clusterRef.current = null;
      }
      if (pulseRef.current) {
        map.removeLayer(pulseRef.current);
        pulseRef.current = null;
      }
      if (heatRef.current) {
        map.removeLayer(heatRef.current);
        heatRef.current = null;
      }
      if (approxRef.current) {
        map.removeLayer(approxRef.current);
        approxRef.current = null;
      }
    };
  }, [
    map,
    pins,
    mode,
    selectedIncidentId,
    onSelectIncident,
    onHover,
    hideApproxAtZoom,
  ]);

  // Rebuild when crossing approx visibility zoom threshold
  useEffect(() => {
    const handler = () => {
      // trigger by slightly noop - parent pin list + mode deps; force via event
      const z = map.getZoom();
      if (
        (z >= hideApproxAtZoom && zoomRef.current < hideApproxAtZoom) ||
        (z < hideApproxAtZoom && zoomRef.current >= hideApproxAtZoom)
      ) {
        zoomRef.current = z;
        map.fire('viewreset');
      }
      zoomRef.current = z;
    };
    map.on('zoomend', handler);
    return () => {
      map.off('zoomend', handler);
    };
  }, [map, hideApproxAtZoom]);

  return null;
}
