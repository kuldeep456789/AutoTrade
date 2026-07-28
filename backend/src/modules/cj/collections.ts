export interface CJCategory {
  categoryId: string;
  name: string;
}

export interface AutomobileCategory {
  parentName: string;
  items: CJCategory[];
}

/**
 * All automobile categories with their real CJ Dropshipping categoryIds.
 * Empty string '' = categoryId not yet obtained from CJ dashboard.
 */
export const Automobiles: Record<string, CJCategory[]> = {
  'Exterior Accessories': [
    { categoryId: '255A489E-8518-4E31-AC84-A2E8EB645C78', name: 'Car Stickers' },
    { categoryId: 'ED1BECF0-0B39-41EE-968C-2948FED771C3', name: 'Other Exterior Accessories' },
    { categoryId: 'ED8B5070-DA72-451A-A0BF-DBE65FDA465E', name: 'Car Covers' },
  ],

  'Interior Accessories': [
    { categoryId: '090E48F4-B406-438B-9EBF-D52450AC370A', name: 'Floor Mats' },
    { categoryId: '2601070551311618400',                  name: 'Car Aromatherapy' },
    { categoryId: '2601070551481626500',                  name: 'Car Perfume' },
    { categoryId: '309854A6-BDC2-4F52-80D8-93E5109B3A53', name: 'Key Case for Car' },
    { categoryId: '5559DD57-7F12-44BC-9C29-9E9BD1CDB029', name: 'Steering Covers' },
    { categoryId: '808A409E-8E16-43A8-879A-153672135DB9', name: 'Automobiles Seat Covers' },
    { categoryId: 'D44C3391-0AF1-455A-A671-29214DA68F27', name: 'Stowing Tidying' },
  ],

  'Tools, Maintenance & Care': [
    { categoryId: '00E6FC51-B865-4D50-9EF9-21E7050F5653', name: 'Car Washer' },
    { categoryId: '3627FAE5-F4A4-4227-8066-A7D460BA6E21', name: 'Diagnostic Tools' },
    { categoryId: '77A90826-779B-47DD-AB79-8FEE91AE0A3E', name: 'Paint Care' },
    { categoryId: '',                                      name: 'Other Maintenance Products' },
  ],

  'Car Electronics': [
    { categoryId: '', name: 'Vehicle Camera' },
    { categoryId: '', name: 'DVR & Dash Camera' },
    { categoryId: '', name: 'Car Monitors' },
    { categoryId: '', name: 'Vehicle GPS' },
    { categoryId: '', name: 'Car Mirror Video' },
    { categoryId: '', name: 'Car Radios' },
    { categoryId: '', name: 'GPS Trackers' },
    { categoryId: '', name: 'Car Multimedia Player' },
    { categoryId: '', name: 'Alarm Systems & Security' },
    { categoryId: '', name: 'Jump Starter' },
  ],

  'Motorcycle Accessories & Parts': [
    { categoryId: '', name: 'Lighting' },
    { categoryId: '', name: 'Exhaust & Exhaust Systems' },
    { categoryId: '', name: 'Motor Brake System' },
    { categoryId: '', name: 'Motorcycle Seat Covers' },
    { categoryId: '', name: 'Other Motorcycle Accessories' },
    { categoryId: '', name: 'Helmet Headset' },
    { categoryId: '', name: 'Body & Frame' },
  ],

  'Auto Replacement Parts': [
    { categoryId: '', name: 'Interior Parts' },
    { categoryId: '', name: 'Car Brake System' },
    { categoryId: '', name: 'Spark Plugs & Ignition System' },
    { categoryId: '', name: 'Automobiles Sensors' },
    { categoryId: '', name: 'Exterior Parts' },
    { categoryId: '', name: 'Other Replacement Parts' },
    { categoryId: '', name: 'Car Lights' },
    { categoryId: '', name: 'Windscreen Wipers & Windows' },
  ],
};

/**
 * Flat list of all categories with their parent group name.
 * Used in fetchCatalog to build the sync target list.
 */
export function getAllSyncTargets(): { categoryId: string; parentCategory: string; name: string }[] {
  const targets: { categoryId: string; parentCategory: string; name: string }[] = [];
  for (const [parent, items] of Object.entries(Automobiles)) {
    for (const item of items) {
      if (item.categoryId) {
        targets.push({
          categoryId: item.categoryId,
          parentCategory: parent,
          name: item.name,
        });
      }
    }
  }
  return targets;
}

/** Look up a category entry by its CJ categoryId */
export function getCategoryById(categoryId: string): { parentCategory: string; item: CJCategory } | null {
  if (!categoryId) return null;
  for (const [parent, items] of Object.entries(Automobiles)) {
    const found = items.find(i => i.categoryId === categoryId);
    if (found) return { parentCategory: parent, item: found };
  }
  return null;
}

/** Return all non-empty CJ categoryIds as a flat array */
export function getAllCategoryIds(): string[] {
  return Object.values(Automobiles)
    .flat()
    .map(i => i.categoryId)
    .filter(Boolean);
}
