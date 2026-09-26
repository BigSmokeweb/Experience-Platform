import { useEffect, useRef, useState } from 'react';
import { Locate, Compass, Navigation, ExternalLink, Car, Footprints, ChevronDown, ChevronUp, ArrowUpRight, Train } from 'lucide-react';
import { SelectedExperience, RecommendationItem, sanitizeExperienceCoordinates } from '@/lib/trip-session-store';
import { calculateRealRoadRoute, findShortestAStarOrder, RouteResult } from '@/lib/a-star-router';
import { calculateMumbaiTrainPlan, MultimodalRouteResult } from '@/lib/mumbai-train-router';

interface RealAreaMapProps {
  city?: string;
  initialUserLat?: number;
  initialUserLng?: number;
  stops: SelectedExperience[];
  candidateStops?: RecommendationItem[];
  onAddStop?: (cand: RecommendationItem) => void;
}

const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  mumbai: { lat: 18.9220, lng: 72.8347 },
  thane: { lat: 19.2183, lng: 72.9781 },
  'navi-mumbai': { lat: 19.0330, lng: 73.0297 },
  powai: { lat: 19.1197, lng: 72.9051 },
  'kanjur-marg': { lat: 19.1300, lng: 72.9300 },
  panvel: { lat: 18.9894, lng: 73.1175 },
  'kalyan-dombivli': { lat: 19.2211, lng: 73.0919 },
};

export function TripAreaMap({
  city = 'Mumbai',
  initialUserLat,
  initialUserLng,
  stops,
  candidateStops = [],
  onAddStop,
}: RealAreaMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const layerGroupRef = useRef<any>(null);

  const cityKey = (city || 'Mumbai').toLowerCase();
  const cityDefault = CITY_COORDINATES[cityKey] || CITY_COORDINATES.mumbai;

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number }>({
    lat: initialUserLat || cityDefault.lat,
    lng: initialUserLng || cityDefault.lng,
  });

  const [isLocating, setIsLocating] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [travelMode, setTravelMode] = useState<'driving' | 'train' | 'walking'>('driving');
  const [showTurnList, setShowTurnList] = useState(false);
  const [routeTelemetry, setRouteTelemetry] = useState<RouteResult | null>(null);
  const [trainRouteTelemetry, setTrainRouteTelemetry] = useState<MultimodalRouteResult | null>(null);
  const [isRouting, setIsRouting] = useState<boolean>(false);
  const [optimizeFromMyLocation, setOptimizeFromMyLocation] = useState<boolean>(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Geolocation trigger
  function requestLiveLocation() {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setLocationStatus('Geolocation not supported by browser.');
      return;
    }

    setIsLocating(true);
    setLocationStatus('Pinpointing live GPS coordinates...');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setUserLocation(coords);
        setIsLocating(false);
        setLocationStatus('GPS position locked.');

        // Pan real map to user
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([coords.lat, coords.lng], 14, { animate: true });
        }
      },
      (err) => {
        setIsLocating(false);
        setLocationStatus(
          err.code === 1
            ? 'Permission denied. Showing starting zone.'
            : 'Weak signal. Using circuit start point.'
        );
      },
      { enableHighAccuracy: true, timeout: 9000, maximumAge: 30000 }
    );
  }

  // Auto-locate member coordinates on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        () => {},
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 60000 }
      );
    }
  }, []);

  // Leaflet Map Initialization and Layer Updates
  useEffect(() => {
    if (!isMounted || !mapContainerRef.current) return;

    let isSubscribed = true;

    async function initMap() {
      const L = (await import('leaflet')).default;

      if (!isSubscribed || !mapContainerRef.current) return;

      // Initialize map instance if not already present
      if (!mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current, {
          center: [userLocation.lat, userLocation.lng],
          zoom: 13,
          zoomControl: false,
          attributionControl: false,
        });

        // High-performance CartoDB Voyager tiles (global Fastly CDN, matches warm Ivory theme)
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
          maxZoom: 19,
          subdomains: 'abcd',
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        }).addTo(map);

        // Custom position zoom control
        L.control.zoom({ position: 'bottomright' }).addTo(map);

        const layerGroup = L.layerGroup().addTo(map);
        layerGroupRef.current = layerGroup;
        mapInstanceRef.current = map;

        // Invalidate size to ensure container dimensions are properly registered
        setTimeout(() => map.invalidateSize(), 150);
        setTimeout(() => map.invalidateSize(), 500);
      }

      const map = mapInstanceRef.current;
      const layerGroup = layerGroupRef.current;

      if (!map || !layerGroup) return;

      // Clear existing markers & route lines
      layerGroup.clearLayers();

      const routePoints: [number, number][] = [[userLocation.lat, userLocation.lng]];

      // 1. User / Member Location Pulse Marker
      const currentUserName = typeof window !== 'undefined' ? localStorage.getItem('userName') : null;
      const userDotLabel = currentUserName ? `${currentUserName} (Your Location)` : 'Your Live Location';

      const userIcon = L.divIcon({
        className: 'custom-map-pin',
        html: `
          <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px;">
            <div style="position: absolute; width: 36px; height: 36px; background-color: rgba(52, 127, 140, 0.35); border-radius: 9999px; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="position: absolute; width: 22px; height: 22px; background-color: rgba(52, 127, 140, 0.5); border-radius: 9999px;"></div>
            <div style="position: relative; width: 14px; height: 14px; background-color: #347F8C; border: 2.5px solid #FFFFFF; border-radius: 9999px; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const userMarker = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon });
      userMarker.bindPopup(`
        <div style="padding: 6px; font-family: monospace; font-size: 11px;">
          <div style="color: #347F8C; font-weight: 700; text-transform: uppercase; margin-bottom: 2px;">
            ● ${userDotLabel}
          </div>
          <div style="color: #2C2C2C; opacity: 0.8;">${userLocation.lat.toFixed(4)}°N, ${userLocation.lng.toFixed(4)}°E</div>
          <div style="font-size: 9.5px; color: #8B7355; margin-top: 4px; font-weight: 600;">
            A* Shortest Route Origin Point
          </div>
        </div>
      `);
      layerGroup.addLayer(userMarker);

      // Order of stops to visit: optionally optimized via A* from member location
      const orderedStops = optimizeFromMyLocation ? findShortestAStarOrder(userLocation, stops) : stops;

      // 2. Add Stop Markers
      orderedStops.forEach((stop, idx) => {
        const coords = sanitizeExperienceCoordinates({
          ...stop,
          city: city || stop.city,
        });
        const stopLat = coords.lat;
        const stopLng = coords.lng;
        routePoints.push([stopLat, stopLng]);

        const stopIcon = L.divIcon({
          className: 'custom-map-pin',
          html: `
            <div style="background-color: #347F8C; color: #F5F1E6; border: 2px solid #FFFFFF; box-shadow: 0 4px 10px rgba(52, 127, 140, 0.4); border-radius: 9999px; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-family: monospace; font-weight: bold; font-size: 12px;">
              ${idx + 1}
            </div>
          `,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        const marker = L.marker([stopLat, stopLng], { icon: stopIcon });
        marker.bindPopup(`
          <div style="font-family: inherit; width: 210px;">
            <div style="font-size: 9px; font-family: monospace; text-transform: uppercase; color: #347F8C; font-weight: 700; letter-spacing: 0.05em; margin-bottom: 2px;">
              Stop ${idx + 1} &bull; ${stop.category}
            </div>
            <strong style="font-size: 12px; font-weight: 700; color: #2C2C2C; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.3; margin-bottom: 3px;">
              ${stop.title}
            </strong>
            <div style="font-size: 10px; font-family: monospace; color: #2C2C2C; opacity: 0.75; white-space: nowrap;">
              ₹${stop.priceMin}–₹${stop.priceMax} &bull; ${stop.city}
            </div>
          </div>
        `, {
          maxWidth: 250,
          minWidth: 210,
          className: 'compact-leaflet-popup',
        });
        layerGroup.addLayer(marker);
      });

      // 2b. Add Candidate Recommendation Preview Markers on Map
      if (candidateStops && candidateStops.length > 0) {
        const selectedIdSet = new Set(stops.map((s) => s.id));
        candidateStops
          .filter((cand) => !selectedIdSet.has(cand.id))
          .forEach((cand) => {
            const coords = sanitizeExperienceCoordinates({
              ...cand,
              city: city || cand.city,
            });
            const candIcon = L.divIcon({
              className: 'candidate-map-pin',
              html: `
                <div style="background-color: #FFFFFF; color: #D97706; border: 2px dashed #D97706; box-shadow: 0 2px 8px rgba(0,0,0,0.18); border-radius: 9999px; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; cursor: pointer;">
                  ★
                </div>
              `,
              iconSize: [22, 22],
              iconAnchor: [11, 11],
            });

            const candMarker = L.marker([coords.lat, coords.lng], { icon: candIcon });

            const popupNode = document.createElement('div');
            popupNode.style.fontFamily = 'inherit';
            popupNode.style.width = '215px';
            popupNode.innerHTML = `
              <div style="font-size: 9px; font-family: monospace; text-transform: uppercase; color: #D97706; font-weight: 700; letter-spacing: 0.06em; margin-bottom: 3px; padding-right: 14px; white-space: nowrap;">
                Recommended Stop
              </div>
              <strong style="font-size: 12px; font-weight: 700; color: #2C2C2C; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.3; margin-bottom: 4px;">
                ${cand.title}
              </strong>
              <div style="font-size: 10px; font-family: monospace; color: #2C2C2C; opacity: 0.8; margin-bottom: 8px; white-space: nowrap;">
                ${cand.category} &bull; ★${cand.ratingAverage.toFixed(1)} &bull; ₹${cand.priceMin}
              </div>
              ${
                onAddStop
                  ? `<button type="button" class="compact-popup-add-btn" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 5px; background: #347F8C; color: #F5F1E6; border: none; border-radius: 7px; padding: 6px 10px; font-size: 10.5px; font-family: monospace; font-weight: 700; text-transform: uppercase; cursor: pointer; transition: all 0.15s ease; white-space: nowrap;">
                      + Add Stop
                    </button>`
                  : ''
              }
            `;

            if (onAddStop) {
              const addBtn = popupNode.querySelector('.compact-popup-add-btn');
              addBtn?.addEventListener('click', (e) => {
                e.stopPropagation();
                onAddStop(cand);
                candMarker.closePopup();
              });
            }

            candMarker.bindPopup(popupNode, {
              maxWidth: 250,
              minWidth: 215,
              className: 'compact-leaflet-popup',
              autoPanPadding: [20, 20],
            });

            layerGroup.addLayer(candMarker);
          });
      }

      // 3. Draw Route: Train Track A* Router OR Real Road Engine
      if (routePoints.length > 1) {
        setIsRouting(true);

        if (travelMode === 'train') {
          const destinationPoints = stops.map((s, idx) => {
            const coords = sanitizeExperienceCoordinates({
              ...s,
              city: city || s.city,
            });
            return {
              lat: coords.lat,
              lng: coords.lng,
              title: s.title || `Stop ${idx + 1}`,
            };
          });

          const trainPlan = await calculateMumbaiTrainPlan(
            userLocation.lat,
            userLocation.lng,
            destinationPoints
          );
          if (!isSubscribed) return;

          setTrainRouteTelemetry(trainPlan);
          setRouteTelemetry(null);
          setIsRouting(false);

          // 1. Draw individual road segments (Walk or Auto/Cab along real street curves)
          if (trainPlan.roadSegments && trainPlan.roadSegments.length > 0) {
            trainPlan.roadSegments.forEach((seg) => {
              if (!seg.polyline || seg.polyline.length < 2) return;
              if (seg.isDrive) {
                // Auto/Cab road leg (>5km): Amber route with dark casing
                layerGroup.addLayer(
                  L.polyline(seg.polyline, {
                    color: '#1E293B',
                    weight: 5,
                    opacity: 0.35,
                    lineCap: 'round',
                    lineJoin: 'round',
                  })
                );
                layerGroup.addLayer(
                  L.polyline(seg.polyline, {
                    color: '#D97706',
                    weight: 3.5,
                    opacity: 0.95,
                    dashArray: '6, 5',
                    lineCap: 'round',
                    lineJoin: 'round',
                  })
                );
              } else {
                // Walking road leg (<=5km): Dotted teal route along actual streets
                layerGroup.addLayer(
                  L.polyline(seg.polyline, {
                    color: '#347F8C',
                    weight: 3.5,
                    opacity: 0.95,
                    dashArray: '3, 7',
                    lineCap: 'round',
                    lineJoin: 'round',
                  })
                );
              }
            });
          } else {
            // Fallback if roadSegments not present
            if (trainPlan.walkToStationPolyline?.length > 1) {
              layerGroup.addLayer(
                L.polyline(trainPlan.walkToStationPolyline, {
                  color: '#347F8C',
                  weight: 3.5,
                  opacity: 0.9,
                  dashArray: '3, 7',
                  lineCap: 'round',
                })
              );
            }
            if (trainPlan.walkToDestPolyline?.length > 1) {
              layerGroup.addLayer(
                L.polyline(trainPlan.walkToDestPolyline, {
                  color: '#347F8C',
                  weight: 3.5,
                  opacity: 0.9,
                  dashArray: '3, 7',
                  lineCap: 'round',
                })
              );
            }
          }

          // 2. Realistic Railway Track: Railroad bed + ties + central rail per train segment
          if (trainPlan.trainSegments && trainPlan.trainSegments.length > 0) {
            trainPlan.trainSegments.forEach((seg) => {
              if (!seg.polyline || seg.polyline.length < 2) return;
              // Railway bed
              layerGroup.addLayer(
                L.polyline(seg.polyline, {
                  color: '#1E293B',
                  weight: 6.5,
                  opacity: 0.9,
                  lineCap: 'round',
                  lineJoin: 'round',
                })
              );
              // Railway sleepers
              layerGroup.addLayer(
                L.polyline(seg.polyline, {
                  color: '#F8FAFC',
                  weight: 4,
                  opacity: 0.9,
                  dashArray: '3, 6',
                  lineCap: 'square',
                })
              );
              // Central rail line
              layerGroup.addLayer(
                L.polyline(seg.polyline, {
                  color: '#347F8C',
                  weight: 2,
                  opacity: 1,
                  lineCap: 'round',
                })
              );
            });
          } else if (trainPlan.trainPolyline?.length > 1) {
            layerGroup.addLayer(
              L.polyline(trainPlan.trainPolyline, {
                color: '#1E293B',
                weight: 6.5,
                opacity: 0.9,
                lineCap: 'round',
                lineJoin: 'round',
              })
            );
            layerGroup.addLayer(
              L.polyline(trainPlan.trainPolyline, {
                color: '#F8FAFC',
                weight: 4,
                opacity: 0.9,
                dashArray: '3, 6',
                lineCap: 'square',
              })
            );
            layerGroup.addLayer(
              L.polyline(trainPlan.trainPolyline, {
                color: '#347F8C',
                weight: 2,
                opacity: 1,
                lineCap: 'round',
              })
            );
          }

          // 3. Station Markers along Railway Track
          trainPlan.trainStationsOnRoute.forEach((st, sIdx) => {
            const isBoarding = sIdx === 0;
            const isAlighting = sIdx === trainPlan.trainStationsOnRoute.length - 1;
            const isKeyStation = isBoarding || isAlighting;

            const stIcon = L.divIcon({
              className: 'custom-station-pin',
              html: `
                <div style="background-color: ${isKeyStation ? '#D97706' : '#1E293B'}; color: #FFFFFF; border: 2px solid #FFFFFF; border-radius: 9999px; width: ${isKeyStation ? '24px' : '10px'}; height: ${isKeyStation ? '24px' : '10px'}; display: flex; align-items: center; justify-content: center; font-size: ${isKeyStation ? '11px' : '6px'}; box-shadow: 0 2px 6px rgba(0,0,0,0.4);">
                  ${isKeyStation ? '🚆' : ''}
                </div>
              `,
              iconSize: isKeyStation ? [24, 24] : [10, 10],
              iconAnchor: isKeyStation ? [12, 12] : [5, 5],
            });

            const stMarker = L.marker([st.lat, st.lng], { icon: stIcon });
            stMarker.bindPopup(`
              <div style="padding: 4px; font-family: monospace; font-size: 11px;">
                <strong style="color: #D97706;">🚆 ${st.name}</strong>
                <div style="color: #2C2C2C; opacity: 0.8; margin-top: 2px;">
                  ${isBoarding ? 'Board Here' : isAlighting ? 'Alight Here' : 'En-route Station'}
                </div>
              </div>
            `);
            layerGroup.addLayer(stMarker);
          });

          // 4. Fit map bounds to railway journey and road segments
          const allTrainCoords: [number, number][] = [];
          if (trainPlan.roadSegments && trainPlan.roadSegments.length > 0) {
            trainPlan.roadSegments.forEach((s) => allTrainCoords.push(...s.polyline));
          }
          if (trainPlan.trainSegments && trainPlan.trainSegments.length > 0) {
            trainPlan.trainSegments.forEach((s) => allTrainCoords.push(...s.polyline));
          }
          if (allTrainCoords.length === 0) {
            allTrainCoords.push(
              ...trainPlan.walkToStationPolyline,
              ...trainPlan.trainPolyline,
              ...trainPlan.walkToDestPolyline
            );
          }
          if (allTrainCoords.length > 0) {
            const bounds = L.latLngBounds(allTrainCoords);
            map.fitBounds(bounds, { padding: [45, 45], maxZoom: 15 });
          }
        } else {
          setTrainRouteTelemetry(null);
          const destinationPoints = orderedStops.map((s, idx) => {
            const coords = sanitizeExperienceCoordinates({
              ...s,
              city: city || s.city,
            });
            return {
              lat: coords.lat,
              lng: coords.lng,
              title: s.title || `Stop ${idx + 1}`,
            };
          });

          const result = await calculateRealRoadRoute(userLocation, destinationPoints, travelMode);
          if (!isSubscribed) return;

          setRouteTelemetry(result);
          setIsRouting(false);

          const roadCoords = result.polyline;

          if (travelMode === 'walking') {
            // Walking style: dotted teal route
            const walkingOutline = L.polyline(roadCoords, {
              color: '#2A6772',
              weight: 6,
              opacity: 0.35,
              lineCap: 'round',
              lineJoin: 'round',
            });
            layerGroup.addLayer(walkingOutline);

            const walkingRoute = L.polyline(roadCoords, {
              color: '#347F8C',
              weight: 4,
              opacity: 0.95,
              dashArray: '3, 8',
              lineCap: 'round',
              lineJoin: 'round',
            });
            layerGroup.addLayer(walkingRoute);
          } else {
            // Driving style: solid brand teal route with darker teal outer casing
            const outerCasing = L.polyline(roadCoords, {
              color: '#2A6772',
              weight: 7,
              opacity: 0.5,
              lineCap: 'round',
              lineJoin: 'round',
            });
            layerGroup.addLayer(outerCasing);

            const coreRoute = L.polyline(roadCoords, {
              color: '#347F8C',
              weight: 4.5,
              opacity: 1,
              lineCap: 'round',
              lineJoin: 'round',
            });
            layerGroup.addLayer(coreRoute);
          }

          // Fit map bounds to encompass road curves and stop pins
          const allBoundsCoords = [...roadCoords, ...routePoints];
          const bounds = L.latLngBounds(allBoundsCoords);
          map.fitBounds(bounds, { padding: [45, 45], maxZoom: 16 });
          setTimeout(() => map.invalidateSize(), 60);
        }
      } else {
        setRouteTelemetry(null);
        setTrainRouteTelemetry(null);
        setIsRouting(false);

        const validCandCoords = (candidateStops || [])
          .filter((c) => c.candidateLat != null && c.candidateLng != null)
          .slice(0, 8)
          .map((c) => [c.candidateLat!, c.candidateLng!] as [number, number]);

        if (validCandCoords.length > 0) {
          const bounds = L.latLngBounds([[userLocation.lat, userLocation.lng], ...validCandCoords]);
          map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
          setTimeout(() => map.invalidateSize(), 60);
        } else {
          map.setView([userLocation.lat, userLocation.lng], 14);
          setTimeout(() => map.invalidateSize(), 60);
        }
      }
    }

    initMap();

    return () => {
      isSubscribed = false;
    };
  }, [isMounted, userLocation, stops, candidateStops, onAddStop, travelMode, optimizeFromMyLocation]);

  // Cleanup map on unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  const routeWaypoints = stops.map((s) => encodeURIComponent(s.title + ' ' + (s.city || city))).join('/');
  const externalRouteUrl = stops.length > 0
    ? `https://www.google.com/maps/dir/${userLocation.lat},${userLocation.lng}/${routeWaypoints}`
    : `https://www.google.com/maps/@${userLocation.lat},${userLocation.lng},14z`;

  // First meaningful next turn instruction for driving/walking
  const firstManeuver = routeTelemetry?.steps?.find(
    (s) => s.type !== 'depart' && s.instruction && !s.instruction.toLowerCase().includes('arrive')
  ) || routeTelemetry?.steps?.[0];

  return (
    <div className="bg-white rounded-3xl border border-[#D4CFC0] p-5 sm:p-6 shadow-sm overflow-hidden flex flex-col">
      {/* Map Header */}
      <div className="flex flex-wrap items-center justify-between pb-3 border-b border-[#C4A265] mb-3 gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#347F8C]/15 text-[#347F8C] flex items-center justify-center">
            {travelMode === 'train' ? <Train className="w-4 h-4" /> : <Compass className="w-4 h-4" />}
          </div>
          <div>
            <h4 className="font-manifold text-sm uppercase tracking-wider text-[#2C2C2C] font-bold">
              {travelMode === 'train' ? 'Mumbai Rail & Track Route' : 'Real Road Navigation'}
            </h4>
            <p className="text-[11px] font-mono text-[#2C2C2C]/70">
              {travelMode === 'train' ? 'Central & Western Suburban Lines' : 'Turn-by-turn road network'} &bull; {city} &bull; {stops.length} stop{stops.length === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Mode Switcher: Driving vs Train vs Walking */}
          <div className="inline-flex bg-[#F5F1E6] p-0.5 rounded-xl border border-[#D4CFC0]">
            <button
              type="button"
              onClick={() => setTravelMode('driving')}
              className={`inline-flex items-center gap-1 text-[11px] font-mono px-2.5 py-1 rounded-lg transition font-medium cursor-pointer ${
                travelMode === 'driving'
                  ? 'bg-[#347F8C] text-[#F5F1E6] shadow-xs font-semibold'
                  : 'text-[#2C2C2C]/70 hover:text-[#2C2C2C]'
              }`}
            >
              <Car className="w-3.5 h-3.5" />
              <span>Drive</span>
            </button>
            <button
              type="button"
              onClick={() => setTravelMode('train')}
              className={`inline-flex items-center gap-1 text-[11px] font-mono px-2.5 py-1 rounded-lg transition font-medium cursor-pointer ${
                travelMode === 'train'
                  ? 'bg-[#347F8C] text-[#F5F1E6] shadow-xs font-semibold'
                  : 'text-[#2C2C2C]/70 hover:text-[#2C2C2C]'
              }`}
            >
              <Train className="w-3.5 h-3.5" />
              <span>Train</span>
            </button>
            <button
              type="button"
              onClick={() => setTravelMode('walking')}
              className={`inline-flex items-center gap-1 text-[11px] font-mono px-2.5 py-1 rounded-lg transition font-medium cursor-pointer ${
                travelMode === 'walking'
                  ? 'bg-[#347F8C] text-[#F5F1E6] shadow-xs font-semibold'
                  : 'text-[#2C2C2C]/70 hover:text-[#2C2C2C]'
              }`}
            >
              <Footprints className="w-3.5 h-3.5" />
              <span>Walk</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setOptimizeFromMyLocation(!optimizeFromMyLocation)}
            title="Compute shortest route from your location to all decided spots using A* graph search"
            className={`inline-flex items-center gap-1.5 text-[11px] font-mono font-semibold uppercase tracking-wider px-2.5 py-1.5 rounded-xl transition cursor-pointer active:scale-95 border ${
              optimizeFromMyLocation
                ? 'bg-[#8B7355] text-white border-[#8B7355] shadow-xs'
                : 'text-[#8B7355] hover:text-[#725E45] bg-[#8B7355]/10 hover:bg-[#8B7355]/20 border-[#8B7355]/25'
            }`}
          >
            <Navigation className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {optimizeFromMyLocation ? 'A* Shortest Active' : 'A* Shortest Route'}
            </span>
          </button>

          <button
            type="button"
            onClick={requestLiveLocation}
            disabled={isLocating}
            title="Detect Current GPS Location"
            className="inline-flex items-center gap-1.5 text-[11px] font-mono font-semibold uppercase tracking-wider text-[#347F8C] hover:text-[#2A6772] bg-[#347F8C]/10 hover:bg-[#347F8C]/20 border border-[#347F8C]/25 px-2.5 py-1.5 rounded-xl transition cursor-pointer active:scale-95"
          >
            <Locate className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isLocating ? 'Locating...' : 'Locate Me'}</span>
          </button>
        </div>
      </div>

      {locationStatus && (
        <div className="mb-3 px-3 py-1.5 bg-[#347F8C]/10 rounded-xl text-[11px] font-mono text-[#347F8C] flex items-center justify-between">
          <span>{locationStatus}</span>
          <button onClick={() => setLocationStatus(null)} className="ml-2 font-bold hover:text-[#2A6772]">✕</button>
        </div>
      )}

      {/* Brand Teal Train Navigation Banner */}
      {travelMode === 'train' && trainRouteTelemetry && (
        <div className="mb-3 bg-gradient-to-r from-[#347F8C] to-[#2A6772] text-[#F5F1E6] rounded-2xl p-3 shadow-md flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center shrink-0">
              <Train className="w-5 h-5 text-[#F5F1E6]" />
            </div>
            <div>
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-xl font-bold font-sans tracking-tight text-[#F5F1E6]">
                  {trainRouteTelemetry.totalDurationMin} min
                </span>
                <span className="text-xs font-mono text-[#F5F1E6]/85">
                  ({trainRouteTelemetry.totalDistanceKm} km)
                </span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-white/20 text-[#F5F1E6] font-semibold">
                  Local Fare ₹{trainRouteTelemetry.fareInr}
                </span>
                <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-[#D97706]/80 text-white font-bold hidden sm:inline">
                  A* Track Search
                </span>
              </div>
              <div className="text-[11px] text-[#F5F1E6]/90 flex items-center gap-1 mt-0.5 line-clamp-1">
                <ArrowUpRight className="w-3.5 h-3.5 shrink-0 opacity-80" />
                <span>
                  {trainRouteTelemetry.summaryText || `Walk to ${trainRouteTelemetry.startStation.name} • Local to ${trainRouteTelemetry.destStation.name} (${trainRouteTelemetry.trainStationsOnRoute.length} stations)`}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowTurnList((prev) => !prev)}
            className="inline-flex items-center gap-1 text-[11px] font-mono font-medium bg-white/20 hover:bg-white/30 text-[#F5F1E6] px-2.5 py-1.5 rounded-xl transition cursor-pointer shrink-0 ml-2"
          >
            <span>{showTurnList ? 'Hide Plan' : 'Plan'}</span>
            {showTurnList ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}

      {/* Brand Teal Driving/Walking Road Navigation Banner */}
      {travelMode !== 'train' && routeTelemetry && (
        <div className="mb-3 bg-gradient-to-r from-[#347F8C] to-[#2A6772] text-[#F5F1E6] rounded-2xl p-3 shadow-md flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center shrink-0">
              <Navigation className="w-5 h-5 text-[#F5F1E6] transform -rotate-45" />
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold font-sans tracking-tight text-[#F5F1E6]">
                  {routeTelemetry.totalDurationMin < 60
                    ? `${routeTelemetry.totalDurationMin} min`
                    : `${Math.floor(routeTelemetry.totalDurationMin / 60)} hr ${routeTelemetry.totalDurationMin % 60} min`}
                </span>
                <span className="text-xs font-mono text-[#F5F1E6]/85">
                  ({routeTelemetry.totalDistanceKm} km)
                </span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-white/20 text-[#F5F1E6] font-semibold">
                  Fastest Route
                </span>
              </div>
              {firstManeuver && (
                <div className="text-[11px] text-[#F5F1E6]/90 flex items-center gap-1 mt-0.5 line-clamp-1">
                  <ArrowUpRight className="w-3.5 h-3.5 shrink-0 opacity-80" />
                  <span>Next: {firstManeuver.instruction}</span>
                </div>
              )}
            </div>
          </div>

          {routeTelemetry.steps && routeTelemetry.steps.length > 0 && (
            <button
              type="button"
              onClick={() => setShowTurnList((prev) => !prev)}
              className="inline-flex items-center gap-1 text-[11px] font-mono font-medium bg-white/20 hover:bg-white/30 text-[#F5F1E6] px-2.5 py-1.5 rounded-xl transition cursor-pointer shrink-0 ml-2"
            >
              <span>{showTurnList ? 'Hide Steps' : 'Steps'}</span>
              {showTurnList ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      )}

      {/* Real Interactive Leaflet Container */}
      <div className="relative w-full aspect-[16/10] bg-[#F5F1E6] rounded-2xl border border-[#D4CFC0] overflow-hidden shadow-inner">
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Loading overlay when calculating route */}
        {isRouting && (
          <div className="absolute inset-0 z-[500] bg-black/20 backdrop-blur-xs flex items-center justify-center pointer-events-none">
            <div className="bg-white/95 rounded-2xl px-4 py-2.5 shadow-lg border border-[#D4CFC0] flex items-center gap-2.5 text-xs font-mono text-[#347F8C]">
              <div className="w-4 h-4 border-2 border-[#347F8C] border-t-transparent rounded-full animate-spin" />
              <span>
                {travelMode === 'train'
                  ? 'Finding nearest stations & A* rail track path...'
                  : 'Calculating highway & street route...'}
              </span>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="absolute top-3 right-3 z-[400] bg-white/95 backdrop-blur-sm border border-[#D4CFC0] rounded-xl px-2.5 py-1.5 text-[10px] font-mono text-[#2C2C2C]/90 shadow-xs space-y-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#347F8C] ring-2 ring-[#347F8C]/30" />
            <span>You (Start)</span>
          </div>
          {travelMode === 'train' ? (
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#D97706]" />
              <span>Train Stations</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#A69B80]" />
              <span>Stops (1-{stops.length || 0})</span>
            </div>
          )}
        </div>
      </div>

      {/* Turn-by-turn Navigation Steps List Drawer: Train vs Road */}
      {showTurnList && travelMode === 'train' && trainRouteTelemetry && (
        <div className="mt-3 bg-[#F5F1E6]/60 border border-[#D4CFC0] rounded-2xl p-3.5 max-h-64 overflow-y-auto space-y-2 font-mono text-xs text-[#2C2C2C]">
          <div className="flex items-center justify-between pb-1.5 border-b border-[#C4A265]/60 text-[11px] font-bold uppercase tracking-wider text-[#347F8C]">
            <span>Mumbai Transit Plan ({trainRouteTelemetry.steps.length} legs)</span>
            <span>Total: ~{trainRouteTelemetry.totalDurationMin} min &bull; Fare: ₹{trainRouteTelemetry.fareInr}</span>
          </div>
          <div className="space-y-2 pt-1">
            {trainRouteTelemetry.steps.map((st, i) => (
              <div key={i} className="p-2.5 rounded-xl bg-white/80 border border-[#D4CFC0]/50 space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-[#347F8C]/15 text-[#347F8C] flex items-center justify-center shrink-0 font-sans font-bold text-[10px]">
                    {st.type === 'train_ride' ? '🚆' : st.type.startsWith('drive') ? '🚖' : '🚶'}
                  </div>
                  <span className="font-bold text-[#2C2C2C] text-[11px]">
                    {st.type === 'walk_to_station'
                      ? 'Walk to Railway Station'
                      : st.type === 'drive_to_station'
                      ? 'First Mile: Auto / Cab to Station (>5km)'
                      : st.type === 'train_ride'
                      ? 'Transit: Suburban Local Train'
                      : st.type === 'drive_to_dest'
                      ? 'Auto / Cab to Destination (>5km)'
                      : 'Walk to Destination'}
                  </span>
                  <span className="ml-auto text-[10px] text-[#2C2C2C]/60 font-semibold">
                    ~{st.durationMin} min ({st.distanceMeters > 1000 ? `${(st.distanceMeters / 1000).toFixed(1)} km` : `${st.distanceMeters} m`})
                  </span>
                </div>
                <p className="text-[11px] text-[#2C2C2C]/90 pl-7">{st.instruction}</p>
                {st.stationsList && st.stationsList.length > 0 && (
                  <div className="pl-7 pt-1 text-[10px] text-[#2C2C2C]/70 leading-relaxed">
                    <span className="font-semibold text-[#347F8C]">Stations along route ({st.stationsList.length}):</span>{' '}
                    <span>{st.stationsList.join(' → ')}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {showTurnList && travelMode !== 'train' && routeTelemetry?.steps && routeTelemetry.steps.length > 0 && (
        <div className="mt-3 bg-[#F5F1E6]/60 border border-[#D4CFC0] rounded-2xl p-3.5 max-h-56 overflow-y-auto space-y-2 font-mono text-xs text-[#2C2C2C]">
          <div className="flex items-center justify-between pb-1.5 border-b border-[#C4A265]/60 text-[11px] font-bold uppercase tracking-wider text-[#347F8C]">
            <span>Turn-by-Turn Navigation ({routeTelemetry.steps.length} steps)</span>
            <span>Est. {routeTelemetry.totalDurationMin} min</span>
          </div>
          <div className="space-y-1.5 pt-1">
            {routeTelemetry.steps.map((st, i) => (
              <div key={i} className="flex items-start gap-2.5 py-1 px-2 rounded-lg bg-white/70 hover:bg-white border border-[#D4CFC0]/40 transition">
                <div className="w-5 h-5 rounded-full bg-[#347F8C]/15 text-[#347F8C] flex items-center justify-center shrink-0 font-sans font-bold text-[10px] mt-0.5">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[#2C2C2C] truncate">{st.instruction}</p>
                  <p className="text-[10px] text-[#2C2C2C]/60">
                    {st.distanceMeters > 1000
                      ? `${(st.distanceMeters / 1000).toFixed(1)} km`
                      : `${st.distanceMeters} m`}{' '}
                    &bull; {Math.max(1, Math.round(st.durationSeconds / 60))} min
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Footer Actions */}
      <div className="mt-3 pt-3 border-t border-[#D4CFC0] flex items-center justify-between text-xs">
        <span className="font-mono text-[11px] text-[#2C2C2C]/70">
          {travelMode === 'train'
            ? 'Multimodal transit: Auto/Walk to station + Suburban local train + Auto/Walk to destination'
            : stops.length === 0
            ? 'Select stops on the left to draw live route path'
            : `Continuous road route across ${stops.length} stop${stops.length === 1 ? '' : 's'}`}
        </span>

        <a
          href={externalRouteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold uppercase text-[#347F8C] hover:text-[#2A6772] hover:underline"
        >
          <span>Open in Google Maps</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}
