export type FacilityType = "uaps" | "upa" | "hospital";

export type MapLayer = "neighborhoods" | "access";

export type FilterState = {
  facilityType: FacilityType | null;
  neighborhoodId: string | null;
  mapLayer: MapLayer | null;
  selectedFacilityId: string | null;
};

export const DEFAULT_FILTER_STATE: Readonly<FilterState> = {
  facilityType: null,
  neighborhoodId: null,
  mapLayer: null,
  selectedFacilityId: null,
};

export function resetFilters(): FilterState {
  return { ...DEFAULT_FILTER_STATE };
}

export function serializeFilters(state: Readonly<FilterState>): string {
  const params = new URLSearchParams();

  if (state.facilityType) params.set("facility", state.facilityType);
  if (state.neighborhoodId) params.set("neighborhood", state.neighborhoodId);
  if (state.mapLayer) params.set("layer", state.mapLayer);
  if (state.selectedFacilityId) {
    params.set("selected", state.selectedFacilityId);
  }

  return params.toString();
}

const FACILITY_TYPES: readonly FacilityType[] = ["uaps", "upa", "hospital"];
const MAP_LAYERS: readonly MapLayer[] = ["neighborhoods", "access"];

function pick<T extends string>(value: string | null, allowed: readonly T[]): T | null {
  return allowed.find((option) => option === value) ?? null;
}

function cleanId(value: string | null): string | null {
  const trimmed = value?.trim() ?? "";
  return /^[\w-]{1,64}$/.test(trimmed) ? trimmed : null;
}

export function parseFilters(search: string): FilterState {
  const params = new URLSearchParams(search);

  return {
    facilityType: pick(params.get("facility"), FACILITY_TYPES),
    neighborhoodId: cleanId(params.get("neighborhood")),
    mapLayer: pick(params.get("layer"), MAP_LAYERS),
    selectedFacilityId: cleanId(params.get("selected")),
  };
}
