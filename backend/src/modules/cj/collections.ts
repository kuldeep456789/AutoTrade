export interface CJCategory {
  categoryId: string;
  name: string;
}

export const Automobiles: Record<string, CJCategory[]> = {
  'Exterior Accessories': [
    {
      categoryId: '255A489E-8518-4E31-AC84-A2E8EB645C78',
      name: 'Car Stickers',
    },
    {
      categoryId: 'ED1BECF0-0B39-41EE-968C-2948FED771C3',
      name: 'Other Exterior Accessories',
    },
    { categoryId: 'ED8B5070-DA72-451A-A0BF-DBE65FDA465E', name: 'Car Covers' },
  ],

  'Interior Accessories': [
    { categoryId: '090E48F4-B406-438B-9EBF-D52450AC370A', name: 'Floor Mats' },
    { categoryId: '2601070551311618400', name: 'Car Aromatherapy' },
    { categoryId: '2601070551481626500', name: 'Car Perfume' },
    {
      categoryId: '309854A6-BDC2-4F52-80D8-93E5109B3A53',
      name: 'Key Case for Car',
    },
    {
      categoryId: '5559DD57-7F12-44BC-9C29-9E9BD1CDB029',
      name: 'Steering Covers',
    },
    {
      categoryId: '808A409E-8E16-43A8-879A-153672135DB9',
      name: 'Automobiles Seat Covers',
    },
    {
      categoryId: 'D44C3391-0AF1-455A-A671-29214DA68F27',
      name: 'Stowing Tidying',
    },
  ],

  'Tools, Maintenance & Care': [
    { categoryId: '00E6FC51-B865-4D50-9EF9-21E7050F5653', name: 'Car Washer' },
    {
      categoryId: '3627FAE5-F4A4-4227-8066-A7D460BA6E21',
      name: 'Diagnostic Tools',
    },
    { categoryId: '77A90826-779B-47DD-AB79-8FEE91AE0A3E', name: 'Paint Care' },
    {
      categoryId: 'D24CEB99-1ABB-4643-B0B6-33C60AF9B101',
      name: 'Other Maintenance Products',
    },
  ],

  'Car Electronics': [
    {
      categoryId: '10B94E89-4E22-4BC8-8E6C-9A5CB2119F03',
      name: 'Vehicle Camera',
    },
    {
      categoryId: '2A64C22F-F04A-4AAA-9C1C-8AF89323FB63',
      name: 'DVR & Dash Camera',
    },
    {
      categoryId: '4B2ED078-B253-4105-98A2-1203875448F5',
      name: 'Car Monitors',
    },
    { categoryId: '5D2C4AD8-AF51-4258-A329-45A675E2805D', name: 'Vehicle GPS' },
    {
      categoryId: '5F6BBD36-AFDE-4433-81D1-8684781E04DE',
      name: 'Car Mirror Video',
    },
    { categoryId: 'A3E67E41-8A5C-449F-8C22-739889760AAD', name: 'Car Radios' },
    {
      categoryId: 'B39B6F95-9C89-4D6C-9E98-1633DA6A51CF',
      name: 'GPS Trackers',
    },
    {
      categoryId: 'B43C754E-838C-4028-99E7-D3D0E029C68C',
      name: 'Car Multimedia Player',
    },
    {
      categoryId: 'BCC009E7-B5FF-4E4B-8D1D-7DE5B5DBFAE0',
      name: 'Alarm Systems & Security',
    },
    {
      categoryId: 'C7B399B2-4D26-4363-8062-C6F451DA55B3',
      name: 'Jump Starter',
    },
  ],

  'Motorcycle Accessories & Parts': [
    { categoryId: '11B12208-A434-467B-8AD3-DC65E32EC2E5', name: 'Lighting' },
    {
      categoryId: '45EA5F91-6654-48C5-8D3A-0E5E97156F16',
      name: 'Exhaust & Exhaust Systems',
    },
    {
      categoryId: '482DBC73-CA1B-4FF5-A943-D282D7FBC18F',
      name: 'Motor Brake System',
    },
    {
      categoryId: '4FB5AA23-AA52-4928-A653-616ED3347074',
      name: 'Motorcycle Seat Covers',
    },
    {
      categoryId: '628E44C8-73BF-4D4C-87C9-0B4F9A60D0C3',
      name: 'Other Motorcycle Accessories',
    },
    {
      categoryId: '683FC820-3B12-4F92-A250-FF213D8D3899',
      name: 'Helmet Headset',
    },
    {
      categoryId: '9EB55782-830D-41A5-B29C-B5A13520923E',
      name: 'Body & Frame',
    },
  ],

  'Auto Replacement Parts': [
    {
      categoryId: '28508884-954A-4F76-83BC-FAEA0E0C43FE',
      name: 'Interior Parts',
    },
    {
      categoryId: '3166F1D4-5213-42D7-A2B6-670ACF0D489A',
      name: 'Car Brake System',
    },
    {
      categoryId: '9F6B73A9-0E4F-4EE9-978F-69984CF3E300',
      name: 'Spark Plugs & Ignition System',
    },
    {
      categoryId: 'C8B7A95E-0E98-41F8-892B-35B5679713A6',
      name: 'Automobiles Sensors',
    },
    {
      categoryId: 'CAE924E7-EB56-4299-A5B0-8DB86C9ECB52',
      name: 'Exterior Parts',
    },
    {
      categoryId: 'CB255FA6-9B4C-4542-82CC-F774DE8F8C68',
      name: 'Other Replacement Parts',
    },
    { categoryId: 'E987126C-FF3D-4BCF-B496-40990D39D2F8', name: 'Car Lights' },
    {
      categoryId: 'FF672D98-F632-4C18-ABA3-E86C9C8951FE',
      name: 'Windscreen Wipers & Windows',
    },
  ],
};

export const AUTOMOBILE_CATEGORIES = {
  exteriorAccessories: Automobiles['Exterior Accessories'],
  interiorAccessories: Automobiles['Interior Accessories'],
  toolsMaintenanceCare: Automobiles['Tools, Maintenance & Care'],
  carElectronics: Automobiles['Car Electronics'],
  motorcycleAccessoriesParts: Automobiles['Motorcycle Accessories & Parts'],
  autoReplacementParts: Automobiles['Auto Replacement Parts'],
};

export function getAllSyncTargets(): {
  categoryId: string;
  parentCategory: string;
  name: string;
}[] {
  const targets: {
    categoryId: string;
    parentCategory: string;
    name: string;
  }[] = [];
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
export function getCategoryById(
  categoryId: string,
): { parentCategory: string; item: CJCategory } | null {
  if (!categoryId) return null;
  for (const [parent, items] of Object.entries(Automobiles)) {
    const found = items.find((i) => i.categoryId === categoryId);
    if (found) return { parentCategory: parent, item: found };
  }
  return null;
}

export function getCategoryInfoById(
  categoryId: string,
): { subcategoryName: string; collectionType: string } | null {
  const info = getCategoryById(categoryId);
  if (!info) return null;
  return {
    subcategoryName: info.item.name,
    collectionType: info.parentCategory,
  };
}

export function getCategoryInfoBySubname(subcategoryName: string): {
  categoryId: string;
  subcategoryName: string;
  collectionType: string;
} | null {
  if (!subcategoryName) return null;
  const target = subcategoryName.trim().toLowerCase();
  for (const [parent, items] of Object.entries(Automobiles)) {
    const found = items.find((i) => i.name.toLowerCase() === target);
    if (found) {
      return {
        categoryId: found.categoryId,
        subcategoryName: found.name,
        collectionType: parent,
      };
    }
  }
  return null;
}

/** Return all non-empty CJ categoryIds as a flat array */
export function getAllCategoryIds(): string[] {
  return Object.values(Automobiles)
    .flat()
    .map((i) => i.categoryId)
    .filter(Boolean);
}
