import { describe, expect, it } from "vitest";
import {
  DEFAULT_FILTER_STATE,
  resetFilters,
  serializeFilters,
  type FilterState,
} from "@/lib/filters";

describe("estado dos filtros", () => {
  it("serializa a seleção em uma consulta determinística", () => {
    const state: FilterState = {
      facilityType: "uaps",
      neighborhoodId: "bairro-01",
      mapLayer: "neighborhoods",
      selectedFacilityId: "uaps-001",
    };

    expect(serializeFilters(state)).toBe(
      "facility=uaps&neighborhood=bairro-01&layer=neighborhoods&selected=uaps-001",
    );
  });

  it("reinicia todos os campos sem compartilhar a referência padrão", () => {
    const firstReset = resetFilters();
    const secondReset = resetFilters();

    expect(firstReset).toEqual(DEFAULT_FILTER_STATE);
    expect(firstReset).not.toBe(DEFAULT_FILTER_STATE);
    expect(firstReset).not.toBe(secondReset);
  });
});
