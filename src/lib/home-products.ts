export type HomeServiceItem = {
  id: string;
  slug: string;
  cover: string;
  category: string;
  name: string;
  subtitle: string;
  summary: string;
  deliveryNote: string;
  priceLabel: string;
  stock: string;
  averageTime: string;
  tags: string[];
};

export type HomeServiceGroup = {
  id: string;
  label: string;
  items: HomeServiceItem[];
};

export function resolveHomeProductSelection(
  groups: HomeServiceGroup[],
  requestedCategory?: string,
) {
  const validGroupIds = new Set(groups.map((group) => group.id));
  const activeGroupId =
    requestedCategory && validGroupIds.has(requestedCategory)
      ? requestedCategory
      : "all";
  const visibleItems =
    activeGroupId === "all"
      ? groups.flatMap((group) => group.items)
      : groups.find((group) => group.id === activeGroupId)?.items ?? [];

  return {
    activeGroupId,
    visibleItems,
    totalItems: visibleItems.length,
  };
}
