'use client';

import { useEffect, useRef } from 'react';
import { CityData } from './NearbyCitiesDropdown';

interface CitiesLeafletMapProps {
  cities: CityData[];
  selectedCitySlug: string;
  lockedCitySlug?: string | null;
  onSelectCity?: (slug: string) => void;
  onCityClick?: (slug: string) => void;
  onCityHover?: (slug: string) => void;
}

import { CITY_BOUNDARIES } from '@/lib/city-boundaries';

// Smooth organic fallback polygon generator in case of custom city coordinates
function generateOrganicPolygon(centerLat: number, centerLng: number, radiusKm: number = 3.2): [number, number][] {
  const points: [number, number][] = [];
  const steps = 24;
  for (let i = 0; i <= steps; i++) {
    const angle = (i * 2 * Math.PI) / steps;
    const r = radiusKm * (1 + 0.12 * Math.sin(angle * 3) + 0.08 * Math.cos(angle * 2));
    const latOffset = r / 111;
    const lngOffset = r / (111 * Math.cos((centerLat * Math.PI) / 180));
    points.push([
      Number((centerLat + latOffset * Math.sin(angle)).toFixed(5)),
      Number((centerLng + lngOffset * Math.cos(angle)).toFixed(5)),
    ]);
  }
  return points;
}

export function CitiesLeafletMap({
  cities,
  selectedCitySlug,
  lockedCitySlug,
  onSelectCity,
  onCityClick,
  onCityHover,
}: CitiesLeafletMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const layersRef = useRef<Map<string, { polygon: any; marker: any }>>(new Map());
  const leafletRef = useRef<any>(null);
  const onSelectCityRef = useRef(onSelectCity);
  onSelectCityRef.current = onSelectCity;
  const onCityClickRef = useRef(onCityClick);
  onCityClickRef.current = onCityClick;
  const onCityHoverRef = useRef(onCityHover);
  onCityHoverRef.current = onCityHover;
  const lockedCitySlugRef = useRef(lockedCitySlug);
  lockedCitySlugRef.current = lockedCitySlug;

  // Single mount effect: initialize map once, never rebuild on re-renders
  useEffect(() => {
    let isMounted = true;

    async function setupMap() {
      if (!containerRef.current || mapRef.current) return;

      const L = (await import('leaflet')).default;
      if (!isMounted || !containerRef.current || mapRef.current) return;
      leafletRef.current = L;

      // Initialize Leaflet map with OpenStreetMap centered on Mumbai Metropolitan Region
      const map = L.map(containerRef.current, {
        center: [19.10, 72.98],
        zoom: 10,
        zoomControl: false,
        attributionControl: false,
        scrollWheelZoom: true,
      });

      // Standard OpenStreetMap Tile Layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '&copy; OpenStreetMap',
      }).addTo(map);

      // Subtle Zoom Control in bottom-right
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      const layers = new Map<string, { polygon: any; marker: any }>();

      cities.forEach((city) => {
        const polygonCoords = CITY_BOUNDARIES[city.slug] || generateOrganicPolygon(city.lat, city.lng);

        const isSelected = city.slug === selectedCitySlug;

        // 1. Highlighted City Boundary Area Polygon (accurate organic municipal border)
        const polygon = L.polygon(polygonCoords, {
          color: isSelected ? '#C4A265' : '#347F8C',
          weight: isSelected ? 3.5 : 2,
          fillColor: '#347F8C',
          fillOpacity: isSelected ? 0.48 : 0.20,
          className: 'city-area-polygon cursor-pointer',
        }).addTo(map);

        // 2. Custom Centroid Pin Marker
        const pinIcon = L.divIcon({
          className: 'custom-city-leaflet-marker',
          html: `
            <div class="relative flex flex-col items-center group cursor-pointer -translate-x-1/2 -translate-y-1/2">
              <div class="w-5 h-5 rounded-full ${isSelected ? 'bg-[#347F8C] ring-4 ring-[#C4A265]' : 'bg-[#2C2C2C]'} border-2 border-white flex items-center justify-center shadow-lg transition-all">
                <span class="w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-amber-300 animate-pulse' : 'bg-white'}"></span>
              </div>
              <div class="mt-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold tracking-wider ${isSelected ? 'bg-[#2C2C2C] text-[#F5F1E6] border border-[#C4A265] shadow-lg scale-110' : 'bg-white/95 text-[#2C2C2C] border border-[#D4CFC0] shadow-xs'} transition-all pointer-events-none whitespace-nowrap">
                ${city.name}
              </div>
            </div>
          `,
          iconSize: [0, 0],
        });

        const marker = L.marker([city.lat, city.lng], {
          icon: pinIcon,
          zIndexOffset: isSelected ? 1000 : 100,
        }).addTo(map);

        // Interactive Tooltip
        polygon.bindTooltip(
          `<div class="p-1 font-mono text-center">
            <div class="font-bold text-xs text-[#2C2C2C]">📍 ${city.name}</div>
            <div class="text-[10px] text-[#347F8C] font-semibold">${city.experienceCount}+ Experiences</div>
          </div>`,
          {
            direction: 'top',
            offset: [0, -10],
            opacity: 0.95,
            className: 'compact-leaflet-popup',
          }
        );

        // Hover events on the highlighted city area
        polygon.on('mouseover', () => {
          // When a city is locked, hovering other cities does not change the active city
          if (lockedCitySlugRef.current) return;
          if (onCityHoverRef.current) {
            onCityHoverRef.current(city.slug);
          } else if (onSelectCityRef.current) {
            onSelectCityRef.current(city.slug);
          }
        });

        marker.on('mouseover', () => {
          if (lockedCitySlugRef.current) return;
          if (onCityHoverRef.current) {
            onCityHoverRef.current(city.slug);
          } else if (onSelectCityRef.current) {
            onSelectCityRef.current(city.slug);
          }
        });

        // Click locks and centers smoothly on city without resetting user's zoom level
        polygon.on('click', () => {
          if (onCityClickRef.current) {
            onCityClickRef.current(city.slug);
          } else if (onSelectCityRef.current) {
            onSelectCityRef.current(city.slug);
          }
          map.panTo([city.lat, city.lng], { animate: true, duration: 0.4 });
        });

        marker.on('click', () => {
          if (onCityClickRef.current) {
            onCityClickRef.current(city.slug);
          } else if (onSelectCityRef.current) {
            onSelectCityRef.current(city.slug);
          }
          map.panTo([city.lat, city.lng], { animate: true, duration: 0.4 });
        });

        layers.set(city.slug, { polygon, marker });
      });

      layersRef.current = layers;
      mapRef.current = map;

      // Invalidate size to guarantee crisp tiles on popover mount
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize();
        }
      }, 100);

      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize();
        }
      }, 300);
    }

    setupMap();

    return () => {
      isMounted = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        layersRef.current.clear();
      }
    };
  }, []);

  // Update styles and pan map when selectedCitySlug changes (click or external selection)
  const prevSelectedSlugRef = useRef<string>(selectedCitySlug);

  useEffect(() => {
    if (!mapRef.current || layersRef.current.size === 0) return;

    // Pan map to active city if selection changed externally
    if (prevSelectedSlugRef.current !== selectedCitySlug) {
      prevSelectedSlugRef.current = selectedCitySlug;
      const targetCity = cities.find((c) => c.slug === selectedCitySlug);
      if (targetCity) {
        mapRef.current.panTo([targetCity.lat, targetCity.lng], { animate: true, duration: 0.4 });
      }
    }

    layersRef.current.forEach(({ polygon, marker }, slug) => {
      const isSelected = slug === selectedCitySlug;
      const city = cities.find((c) => c.slug === slug);
      if (!city) return;

      if (isSelected) {
        // Highlighted & Stands Out
        polygon.setStyle({
          color: '#C4A265',
          weight: 3.5,
          dashArray: '',
          fillColor: '#347F8C',
          fillOpacity: 0.50,
        });
        polygon.bringToFront();
        marker.setZIndexOffset(1000);
      } else {
        // Normal / Inactive
        polygon.setStyle({
          color: '#347F8C',
          weight: 2,
          dashArray: '',
          fillColor: '#347F8C',
          fillOpacity: 0.20,
        });
        marker.setZIndexOffset(100);
      }

      // Update marker HTML for active glow
      const icon = marker.getIcon();
      if (icon) {
        const L = leafletRef.current || (typeof window !== 'undefined' ? (window as any).L : null);
        if (L) {
          const newIcon = L.divIcon({
            className: 'custom-city-leaflet-marker',
            html: `
              <div class="relative flex flex-col items-center group cursor-pointer -translate-x-1/2 -translate-y-1/2">
                <div class="w-5 h-5 rounded-full ${isSelected ? 'bg-[#347F8C] ring-4 ring-[#C4A265] scale-125' : 'bg-[#2C2C2C]'} border-2 border-white flex items-center justify-center shadow-lg transition-all">
                  <span class="w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-amber-300 animate-pulse' : 'bg-white'}"></span>
                </div>
                <div class="mt-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold tracking-wider ${isSelected ? 'bg-[#2C2C2C] text-[#F5F1E6] border border-[#C4A265] shadow-lg scale-110 -translate-y-1' : 'bg-white/95 text-[#2C2C2C] border border-[#D4CFC0] shadow-xs'} transition-all pointer-events-none whitespace-nowrap">
                  ${city.name}
                </div>
              </div>
            `,
            iconSize: [0, 0],
          });
          marker.setIcon(newIcon);
        }
      }
    });
  }, [selectedCitySlug, cities]);

  return (
    <div className="relative w-full h-[300px] sm:h-[330px] bg-[#EAE5D8] overflow-hidden select-none border-b border-[#D4CFC0]">
      {/* Real OpenStreetMap Leaflet container */}
      <div ref={containerRef} className="w-full h-full z-0" />

      {/* Top attribution badge */}
      <div className="absolute top-2.5 right-2.5 bg-white/95 backdrop-blur-xs border border-[#D4CFC0] px-2.5 py-0.5 rounded-md text-[9px] font-mono uppercase tracking-wider text-[#2C2C2C] font-bold pointer-events-none shadow-xs z-10 flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <span>OpenStreetMap • Highlighted Areas</span>
      </div>
    </div>
  );
}
