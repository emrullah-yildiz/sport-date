import type { MapDiscoveryState } from "../concepts/PlayMapDiscovery";
import type { MapFilters } from "../concepts/play-map-data";

/** Landing selectors share discovery state, including an existing trip and its filters. */
export function patchLandingFilters(state: MapDiscoveryState, patch: Partial<MapFilters>): MapDiscoveryState {
  const destinationChanged = patch.destinationId !== undefined && patch.destinationId !== state.filters.destinationId;
  return {
    ...state,
    page: 0,
    filters: {
      ...state.filters,
      ...patch,
      ...(destinationChanged ? { areaId: "all" } : {}),
    },
  };
}
