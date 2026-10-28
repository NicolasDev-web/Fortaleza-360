import type { Position } from "@/lib/geo";
import type { FacilityPoint } from "@/lib/map-model";

/** Raio médio da Terra (IUGG), o mesmo usado em `lib/geo.ts`. */
const EARTH_RADIUS_M = 6371008.8;

export const STRAIGHT_LINE_CAVEAT =
  "Proxy exploratório: distância em linha reta não é tempo de deslocamento, ignora ruas, barreiras e transporte, e não indica acesso efetivo.";

export type StraightLineResult = {
  method: "straight_line_proxy";
  facilityId: string;
  distanceM: number;
};

/** Distância geodésica entre dois pontos [lon, lat], em metros (fórmula de haversine). */
export function haversineMeters([lon1, lat1]: Position, [lon2, lat2]: Position): number {
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(a)));
}

export function nearestByStraightLine(
  origin: Position,
  facilities: readonly FacilityPoint[],
): StraightLineResult | null {
  let best: StraightLineResult | null = null;
  for (const facility of facilities) {
    const distanceM = haversineMeters(origin, facility.position);
    if (!best || distanceM < best.distanceM) {
      best = { method: "straight_line_proxy", facilityId: facility.id, distanceM };
    }
  }
  return best;
}

const kmFormat = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

/** Rótulo sempre com "em linha reta": nunca vira minutos nem percurso. */
export function formatStraightLineDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m em linha reta`;
  return `${kmFormat.format(meters / 1000)} km em linha reta`;
}
