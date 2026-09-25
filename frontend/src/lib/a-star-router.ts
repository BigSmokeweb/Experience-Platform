/**
 * A* (A-Star) Pathfinding & Real-Road Navigation Engine
 * Powers real highway, street, and turn-by-turn routing for Leaflet map.
 */

export interface LatLngPoint {
  lat: number;
  lng: number;
}

export interface NavigationStep {
  instruction: string;
  name: string;
  distanceMeters: number;
  durationSeconds: number;
  type: string;
  modifier?: string;
}

export interface RouteResult {
  polyline: [number, number][]; // [lat, lng]
  totalDistanceKm: number;
  totalDurationMin: number;
  mode: 'driving' | 'walking';
  algorithm: string;
  stepsCount: number;
  steps: NavigationStep[];
}

export async function calculateRealRoadRoute(
  start: LatLngPoint,
  destinations: LatLngPoint[],
  mode: 'driving' | 'walking' = 'driving'
): Promise<RouteResult> {
  if (destinations.length === 0) {
    return {
      polyline: [[start.lat, start.lng]],
      totalDistanceKm: 0,
      totalDurationMin: 0,
      mode,
      algorithm: 'A* Navigation',
      stepsCount: 1,
      steps: [],
    };
  }

  // Deduplicate consecutive identical waypoints
  const allWaypoints: LatLngPoint[] = [start];
  for (const d of destinations) {
    const last = allWaypoints[allWaypoints.length - 1];
    const dist = Math.hypot(d.lat - last.lat, d.lng - last.lng);
    if (dist > 0.0001) {
      allWaypoints.push(d);
    }
  }

  const waypointsParam = allWaypoints.map((p) => `${p.lng},${p.lat}`).join(';');
  const apiUrl = `/api/route-navigation?waypoints=${encodeURIComponent(waypointsParam)}&mode=${mode}`;

  try {
    const res = await fetch(apiUrl);
    if (res.ok) {
      const data = await res.json();
      if (data.polyline && data.polyline.length > 0) {
        return {
          polyline: data.polyline,
          totalDistanceKm: data.totalDistanceKm,
          totalDurationMin: data.totalDurationMin,
          mode,
          algorithm: 'A* Highway & Street Router',
          stepsCount: data.polyline.length,
          steps: data.steps || [],
        };
      }
    }
  } catch (err) {
    console.warn('Real-road API call error:', err);
  }

  // Minimal fallback
  return {
    polyline: allWaypoints.map((p) => [p.lat, p.lng]),
    totalDistanceKm: 0,
    totalDurationMin: 0,
    mode,
    algorithm: 'Direct Route',
    stepsCount: allWaypoints.length,
    steps: [],
  };
}

/**
 * A* Pathfinding to find the shortest traversal order from a member's location through all decided spots.
 * Uses A* graph search with Euclidean/Haversine distance and admissible MST/nearest-neighbor heuristic.
 */
export function findShortestAStarOrder<T extends { candidateLat?: number; candidateLng?: number; latitude?: number; longitude?: number }>(
  start: LatLngPoint,
  stops: T[],
): T[] {
  if (!stops || stops.length <= 1) return stops;

  const getCoords = (s: T): LatLngPoint => ({
    lat: s.candidateLat ?? s.latitude ?? 0,
    lng: s.candidateLng ?? s.longitude ?? 0,
  });

  const dist = (p1: LatLngPoint, p2: LatLngPoint) => {
    const dLat = (p2.lat - p1.lat) * 111;
    const dLng = (p2.lng - p1.lng) * 111 * Math.cos((p1.lat * Math.PI) / 180);
    return Math.hypot(dLat, dLng);
  };

  const n = stops.length;
  interface SearchNode {
    currPos: LatLngPoint;
    mask: number; // bitmask of visited stops
    g: number; // cost so far (km)
    f: number; // g + h
    path: number[]; // indices of stops visited in order
  }

  // Heuristic: distance to nearest unvisited stop
  function heuristic(pos: LatLngPoint, mask: number): number {
    let minDist = Infinity;
    for (let i = 0; i < n; i++) {
      if ((mask & (1 << i)) === 0) {
        const d = dist(pos, getCoords(stops[i]));
        if (d < minDist) minDist = d;
      }
    }
    return minDist === Infinity ? 0 : minDist;
  }

  const startNode: SearchNode = {
    currPos: start,
    mask: 0,
    g: 0,
    f: heuristic(start, 0),
    path: [],
  };

  const openList: SearchNode[] = [startNode];
  const targetMask = (1 << n) - 1;

  while (openList.length > 0) {
    openList.sort((a, b) => a.f - b.f);
    const node = openList.shift()!;

    if (node.mask === targetMask) {
      return node.path.map((idx) => stops[idx]);
    }

    for (let i = 0; i < n; i++) {
      if ((node.mask & (1 << i)) === 0) {
        const nextPos = getCoords(stops[i]);
        const stepDist = dist(node.currPos, nextPos);
        const newG = node.g + stepDist;
        const newMask = node.mask | (1 << i);
        const newF = newG + heuristic(nextPos, newMask);

        openList.push({
          currPos: nextPos,
          mask: newMask,
          g: newG,
          f: newF,
          path: [...node.path, i],
        });
      }
    }
  }

  return stops;
}

