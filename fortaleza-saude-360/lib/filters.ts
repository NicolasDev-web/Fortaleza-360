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
