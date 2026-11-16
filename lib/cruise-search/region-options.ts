import {
  FINDER_REGION_ALIASES,
  HERO_DESTINATION_REGION_IDS,
  REGION_TREE,
} from "./constants";

const TREE_IDS = new Set<string>(
  REGION_TREE.flatMap((group) => group.items.map(([id]) => id)),
);

function unique(items: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    if (!item || seen.has(item)) continue;
    seen.add(item);
    out.push(item);
  }
  return out;
}

/** Child tree ids for a group / hero label, or null if not a group. */
export function childRegionIdsForGroup(region: string): string[] | null {
  for (const group of REGION_TREE) {
    if (group.group === region) {
      return group.items.map(([id]) => id);
    }
  }

  const heroIds = HERO_DESTINATION_REGION_IDS[region];
  if (heroIds?.length) {
    return unique(heroIds.filter((id) => TREE_IDS.has(id)));
  }

  const aliasIds = FINDER_REGION_ALIASES[region];
  if (aliasIds?.length) {
    return unique(aliasIds.filter((id) => TREE_IDS.has(id)));
  }

  return null;
}

/** Expand group / hero labels into leaf region ids; leaves stay as-is. */
export function expandRegions(regions: string[]) {
  const out: string[] = [];
  for (const region of regions) {
    if (!region || region === "Будь-який") continue;
    const children = childRegionIdsForGroup(region);
    if (children?.length) {
      out.push(...children);
      continue;
    }
    out.push(region);
  }
  return unique(out);
}

export type RegionFilterOption = {
  value: string;
  label: string;
  /** Selecting this option toggles all listed leaf values. */
  expandsTo?: string[];
  /** Indent leaf under a group in the dropdown. */
  nested?: boolean;
};

/** Group headers (expand) + nested leaves for the region multi-select. */
export function buildRegionFilterOptions(): RegionFilterOption[] {
  const options: RegionFilterOption[] = [];

  for (const group of REGION_TREE) {
    if (group.group) {
      const childIds = group.items.map(([id]) => id);
      options.push({
        value: group.group,
        label: group.group,
        expandsTo: childIds,
      });
      for (const [id, label] of group.items) {
        options.push({
          value: id,
          label,
          nested: true,
        });
      }
      continue;
    }

    for (const [id, label] of group.items) {
      options.push({ value: id, label });
    }
  }

  return options;
}

export function regionOptionLabel(
  value: string,
  options: RegionFilterOption[] = buildRegionFilterOptions(),
) {
  return options.find((option) => option.value === value)?.label ?? value;
}

/** Compact label for chips / header when several regions are selected. */
export function formatSelectedRegionsLabel(
  regions: string[],
  options: RegionFilterOption[] = buildRegionFilterOptions(),
) {
  const expanded = expandRegions(regions);
  if (!expanded.length) return "";

  const covered = new Set<string>();
  const parts: string[] = [];

  for (const option of options) {
    if (!option.expandsTo?.length) continue;
    if (option.expandsTo.every((id) => expanded.includes(id))) {
      parts.push(option.label);
      for (const id of option.expandsTo) covered.add(id);
    }
  }

  for (const id of expanded) {
    if (covered.has(id)) continue;
    parts.push(regionOptionLabel(id, options));
  }

  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]}, ${parts[1]}`;
  return `${parts[0]} +${parts.length - 1}`;
}
