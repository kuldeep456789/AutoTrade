export const CLOTHING_CATEGORIES = {
  men: [
    { categoryId: '2409230540121629100', name: 'Men Shirts' },
    { categoryId: '2502140308291606200', name: 'Men Long Sleeve T-Shirts' },
    {
      categoryId: '655B8008-6BB9-4AA1-8025-6206ACFF018A',
      name: 'Men Solid T-Shirts',
    },
    {
      categoryId: 'BE11EEDB-B765-4A39-8A3D-F6015FC7A846',
      name: 'Men Printed T-Shirts',
    },

    {
      categoryId: '976399B4-534B-46F0-B18A-62075824A717',
      name: 'Men Hoodies & Sweatshirts',
    },
    { categoryId: '1357252400104214528', name: 'Men Sweaters' },

    { categoryId: '2409230540351618000', name: 'Men Jackets' },
    { categoryId: '2502140305411618900', name: 'Men Suits' },

    { categoryId: '846D76D8-095D-4DD8-89DF-1E48D869F60C', name: 'Cargo Pants' },
    { categoryId: '911754C0-443D-4ECF-9083-DF04C907BD81', name: 'Men Jeans' },
    {
      categoryId: 'C992BFAB-12A9-4C61-A1DA-6E09C926BB81',
      name: 'Casual Pants',
    },
    { categoryId: 'D75F1892-F6F8-4295-966B-CB405B77070A', name: 'Sweatpants' },
    { categoryId: '7D830BF3-03DB-4EBB-8A50-ED5F1231E17A', name: 'Men Shorts' },
  ],
  women: [
    { categoryId: '1357251872037146624', name: 'Women Short Sleeve Tops' },
    { categoryId: '2409230541301627300', name: 'Women Camis' },
    { categoryId: '2502140253001614100', name: 'Women Vests' },
    { categoryId: '2502190153271613100', name: 'Women Short Sleeve Shirts' },
    { categoryId: '2502190153531612600', name: 'Women Long Sleeve Shirts' },
    {
      categoryId: '5A3E7341-18B5-4C61-BFCD-8965B3479A9A',
      name: 'Blouses & Shirts',
    },

    {
      categoryId: '5E656DFB-9BAE-44DD-A755-40AFA2E0E686',
      name: 'Women Hoodies & Sweatshirts',
    },
    {
      categoryId: 'DE9C662C-3F48-4855-87E7-E18733EFF6D2',
      name: 'Women Sweaters',
    },
    {
      categoryId: 'D2432903-0D4E-4787-886F-D3D9DA7890D9',
      name: 'Women Dresses',
    },
    {
      categoryId: 'ECDBD4C4-7467-4831-9F55-740E3C7968BE',
      name: 'Women Suits & Sets',
    },

    { categoryId: '63584B9B-5275-4268-8BEA-7D3C7A7BB925', name: 'Women Jeans' },
    {
      categoryId: '8A22518D-0C6F-430D-8CD9-7E043062A279',
      name: 'Women Shorts',
    },
    {
      categoryId: '9694B484-7EA0-4D71-993B-9CF02D24B271',
      name: 'Women Pants & Capris',
    },
    {
      categoryId: 'A7DE167B-ECFF-481E-A52A-2E7937BFAA95',
      name: 'Women Wide Leg Pants',
    },
    {
      categoryId: '396E962A-5632-49C2-B9BF-9529DE3B9141',
      name: 'Women Leggings',
    },
    {
      categoryId: '3B8946E7-B608-4DAB-B2F0-C425B7875035',
      name: 'Women Skirts',
    },

    {
      categoryId: '07398ADB-FC5E-4CC4-AD00-EB230E779E88',
      name: 'Women Blazers',
    },
    { categoryId: '2409230541081607100', name: 'Women Padded Jackets' },
    {
      categoryId: '4CF7E664-A644-4B96-951B-B76FA973320A',
      name: 'Women Basic Jackets',
    },
  ],
};

export function getCategoryInfoById(
  categoryId: string,
): { gender: string; subcategoryName: string; collectionType: string } | null {
  if (!categoryId) return null;

  for (const cat of CLOTHING_CATEGORIES.men) {
    if (cat.categoryId === categoryId) {
      return {
        gender: 'Men',
        subcategoryName: cat.name,
        collectionType: 'Men',
      };
    }
  }
  for (const cat of CLOTHING_CATEGORIES.women) {
    if (cat.categoryId === categoryId) {
      return {
        gender: 'Women',
        subcategoryName: cat.name,
        collectionType: 'Women',
      };
    }
  }
  return null;
}
