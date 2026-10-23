'use client';

/**
 * Imperative Leaflet overlays (cluster + heat) rendered inside MapContainer.
 * Must only mount on the client — imported dynamically with ssr:false.
 */

import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
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

const SEVERITY_WEIGHT: Record<Severity, number> = {
  CRITICAL: 1.0,
  HIGH: 0.72,
  MEDIUM: 0.42,
  LOW: 0.22,
};

function isOpen(status: Incident['status']) {
  return !['resolved', 'closed', 'rejected'].includes(status);
}

function pinColor(incident: Incident) {
  if (incident.status === 'resolved' || incident.status === 'closed') return RESOLVED_COLOR;
  return SEVERITY_COLOR[incident.severity];
}

interface MapOverlayLayersProps {
  pins: OverlayPin[];
  mode: MapDisplayMode;
  selectedIncidentId: string | null;
  onSelectIncident: (id: string | null) => void;
  onHover: (incident: Incident | null) => void;
}

export default function MapOverlayLayers({
  pins,
  mode,
  selectedIncidentId,
  onSelectIncident,
  onHover,
}: MapOverlayLayersProps) {
  const map = useMap();
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const heatRef = useRef<L.Layer | null>(null);
  const pulseRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    // Cluster group
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

    const showClusters = mode === 'clusters' || mode === 'both';
    const showHeat = mode === 'heat' || mode === 'both';

    if (showHeat && pins.length > 0) {
      const heatPoints: [number, number, number][] = pins.map((p) => {
        const base = isOpen(p.incident.status)
          ? SEVERITY_WEIGHT[p.incident.severity]
          : 0.08;
        return [p.lat, p.lng, base];
      });
      // leaflet.heat augments L
      const heat = (L as typeof L & {
        heatLayer: (
          latlngs: [number, number, number][],
          opts?: object
        ) => L.Layer;
      }).heatLayer(heatPoints, {
        radius: 28,
        blur: 22,
        maxZoom: 14,
        max: 1.0,
        minOpacity: 0.25,
        gradient: {
          0.2: '#0ea5e9',
          0.4: '#eab308',
          0.65: '#f97316',
          0.85: '#ef4444',
          1.0: '#f43f5e',
        },
      });
      heat.addTo(map);
      heatRef.current = heat;
    }

    if (showClusters) {
      const cluster = L.markerClusterGroup({
        showCoverageOnHover: false,
        maxClusterRadius: 48,
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

      for (const pin of pins) {
        const { incident, lat, lng, isApprox } = pin;
        const color = pinColor(incident);
        const isSelected = incident.id === selectedIncidentId;
        const critical = incident.severity === 'CRITICAL' && isOpen(incident.status);

        const marker = L.circleMarker([lat, lng], {
          radius: isSelected ? 12 : critical ? 9 : isApprox ? 6 : 7,
          fillColor: color,
          color: isSelected ? '#fbbf24' : isApprox ? color : '#ffffff',
          weight: isSelected ? 3 : isApprox ? 1.5 : 2,
          fillOpacity: isApprox ? 0.55 : 0.92,
          opacity: 0.95,
          dashArray: isApprox ? '2 3' : undefined,
        });

        marker.bindPopup(
          `<div style="font:12px/1.35 system-ui,sans-serif;min-width:180px">
            <div style="font-family:ui-monospace,monospace;font-weight:700;color:#d97706">${incident.id}</div>
            <div style="font-weight:600">${escapeHtml(incident.category)}</div>
            <div style="color:#64748b">${escapeHtml(incident.location)}</div>
            <div style="margin-top:4px;font-size:10px;text-transform:uppercase;letter-spacing:.04em;color:#94a3b8">
              ${incident.severity} · ${incident.status}${isApprox ? ' · approx' : ' · GPS'}
            </div>
          </div>`
        );

        marker.on('click', () => onSelectIncident(incident.id));
        marker.on('mouseover', () => onHover(incident));
        marker.on('mouseout', () => onHover(null));

        cluster.addLayer(marker);

        if (critical) {
          const ring = L.circle([lat, lng], {
            radius: 750,
            color: '#ef4444',
            weight: 1,
            opacity: 0.35,
            fillColor: '#ef4444',
            fillOpacity: 0.08,
            interactive: false,
          });
          pulses.addLayer(ring);
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
    };
  }, [map, pins, mode, selectedIncidentId, onSelectIncident, onHover]);

  return null;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
