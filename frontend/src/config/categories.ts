// Shared category configuration, subcategory lists, and navigation slug mappings.

export interface SubCategoryItem {
  label: string;
  to: string;
}

export interface NavCategory {
  label: string;
  to: string;
  subs: SubCategoryItem[];
}

export const NAV_CATEGORIES: NavCategory[] = [
  {
    label: 'Exterior Accessories',
    to: '/collections/exterior-accessories',
    subs: [
      { label: 'Car Stickers', to: '/collections/car-stickers' },
      { label: 'Other Exterior Accessories', to: '/collections/other-exterior-accessories' },
      { label: 'Car Covers', to: '/collections/car-covers' },
    ],
  },
  {
    label: 'Interior Accessories',
    to: '/collections/interior-accessories',
    subs: [
      { label: 'Floor Mats', to: '/collections/floor-mats' },
      { label: 'Car Aromatherapy', to: '/collections/car-aromatherapy' },
      { label: 'Car Perfume', to: '/collections/car-perfume' },
      { label: 'Key Case for Car', to: '/collections/key-case-for-car' },
      { label: 'Steering Covers', to: '/collections/steering-covers' },
      { label: 'Automobiles Seat Covers', to: '/collections/automobiles-seat-covers' },
      { label: 'Stowing Tidying', to: '/collections/stowing-tidying' },
    ],
  },
  {
    label: 'Tools, Maintenance & Care',
    to: '/collections/tools-maintenance-care',
    subs: [
      { label: 'Car Washer', to: '/collections/car-washer' },
      { label: 'Diagnostic Tools', to: '/collections/diagnostic-tools' },
      { label: 'Paint Care', to: '/collections/paint-care' },
      { label: 'Other Maintenance Products', to: '/collections/other-maintenance-products' },
    ],
  },
  {
    label: 'Car Electronics',
    to: '/collections/car-electronics',
    subs: [
      { label: 'Vehicle Camera', to: '/collections/vehicle-camera' },
      { label: 'DVR & Dash Camera', to: '/collections/dvr-dash-camera' },
      { label: 'Car Monitors', to: '/collections/car-monitors' },
      { label: 'Vehicle GPS', to: '/collections/vehicle-gps' },
      { label: 'Car Mirror Video', to: '/collections/car-mirror-video' },
      { label: 'Car Radios', to: '/collections/car-radios' },
      { label: 'GPS Trackers', to: '/collections/gps-trackers' },
      { label: 'Car Multimedia Player', to: '/collections/car-multimedia-player' },
      { label: 'Alarm Systems & Security', to: '/collections/alarm-systems-security' },
      { label: 'Jump Starter', to: '/collections/jump-starter' },
    ],
  },
  {
    label: 'Motorcycle Accessories & Parts',
    to: '/collections/motorcycle-accessories',
    subs: [
      { label: 'Lighting', to: '/collections/motorcycle-lighting' },
      { label: 'Exhaust & Exhaust Systems', to: '/collections/exhaust-systems' },
      { label: 'Motor Brake System', to: '/collections/motor-brake-system' },
      { label: 'Motorcycle Seat Covers', to: '/collections/motorcycle-seat-covers' },
      { label: 'Other Motorcycle Accessories', to: '/collections/other-motorcycle-accessories' },
      { label: 'Helmet Headset', to: '/collections/helmet-headset' },
      { label: 'Body & Frame', to: '/collections/body-frame' },
    ],
  },
  {
    label: 'Auto Replacement Parts',
    to: '/collections/auto-replacement-parts',
    subs: [
      { label: 'Interior Parts', to: '/collections/interior-parts' },
      { label: 'Car Brake System', to: '/collections/car-brake-system' },
      { label: 'Spark Plugs & Ignition System', to: '/collections/spark-plugs-ignition' },
      { label: 'Automobiles Sensors', to: '/collections/automobiles-sensors' },
      { label: 'Exterior Parts', to: '/collections/exterior-parts' },
      { label: 'Other Replacement Parts', to: '/collections/other-replacement-parts' },
      { label: 'Car Lights', to: '/collections/car-lights' },
      { label: 'Windscreen Wipers & Windows', to: '/collections/windscreen-wipers-windows' },
    ],
  },
];

export const CATEGORY_SLUG_MAP: Record<string, { subcategoryName?: string; collectionType?: string; title: string }> = {
  // Exterior Accessories
  'exterior-accessories': { collectionType: 'Exterior Accessories', title: 'Exterior Accessories' },
  'car-stickers': { subcategoryName: 'Car Stickers', collectionType: 'Exterior Accessories', title: 'Car Stickers' },
  'other-exterior-accessories': { subcategoryName: 'Other Exterior Accessories', collectionType: 'Exterior Accessories', title: 'Other Exterior Accessories' },
  'car-covers': { subcategoryName: 'Car Covers', collectionType: 'Exterior Accessories', title: 'Car Covers' },

  // Interior Accessories
  'interior-accessories': { collectionType: 'Interior Accessories', title: 'Interior Accessories' },
  'floor-mats': { subcategoryName: 'Floor Mats', collectionType: 'Interior Accessories', title: 'Floor Mats' },
  'car-aromatherapy': { subcategoryName: 'Car Aromatherapy', collectionType: 'Interior Accessories', title: 'Car Aromatherapy' },
  'car-perfume': { subcategoryName: 'Car Perfume', collectionType: 'Interior Accessories', title: 'Car Perfume' },
  'key-case-for-car': { subcategoryName: 'Key Case for Car', collectionType: 'Interior Accessories', title: 'Key Case for Car' },
  'steering-covers': { subcategoryName: 'Steering Covers', collectionType: 'Interior Accessories', title: 'Steering Covers' },
  'automobiles-seat-covers': { subcategoryName: 'Automobiles Seat Covers', collectionType: 'Interior Accessories', title: 'Automobiles Seat Covers' },
  'stowing-tidying': { subcategoryName: 'Stowing Tidying', collectionType: 'Interior Accessories', title: 'Stowing Tidying' },

  // Tools, Maintenance & Care
  'tools-maintenance-care': { collectionType: 'Tools, Maintenance & Care', title: 'Tools, Maintenance & Care' },
  'car-washer': { subcategoryName: 'Car Washer', collectionType: 'Tools, Maintenance & Care', title: 'Car Washer' },
  'diagnostic-tools': { subcategoryName: 'Diagnostic Tools', collectionType: 'Tools, Maintenance & Care', title: 'Diagnostic Tools' },
  'paint-care': { subcategoryName: 'Paint Care', collectionType: 'Tools, Maintenance & Care', title: 'Paint Care' },
  'other-maintenance-products': { subcategoryName: 'Other Maintenance Products', collectionType: 'Tools, Maintenance & Care', title: 'Other Maintenance Products' },

  // Car Electronics
  'car-electronics': { collectionType: 'Car Electronics', title: 'Car Electronics' },
  'vehicle-camera': { subcategoryName: 'Vehicle Camera', collectionType: 'Car Electronics', title: 'Vehicle Camera' },
  'dvr-dash-camera': { subcategoryName: 'DVR & Dash Camera', collectionType: 'Car Electronics', title: 'DVR & Dash Camera' },
  'car-monitors': { subcategoryName: 'Car Monitors', collectionType: 'Car Electronics', title: 'Car Monitors' },
  'vehicle-gps': { subcategoryName: 'Vehicle GPS', collectionType: 'Car Electronics', title: 'Vehicle GPS' },
  'car-mirror-video': { subcategoryName: 'Car Mirror Video', collectionType: 'Car Electronics', title: 'Car Mirror Video' },
  'car-radios': { subcategoryName: 'Car Radios', collectionType: 'Car Electronics', title: 'Car Radios' },
  'gps-trackers': { subcategoryName: 'GPS Trackers', collectionType: 'Car Electronics', title: 'GPS Trackers' },
  'car-multimedia-player': { subcategoryName: 'Car Multimedia Player', collectionType: 'Car Electronics', title: 'Car Multimedia Player' },
  'alarm-systems-security': { subcategoryName: 'Alarm Systems & Security', collectionType: 'Car Electronics', title: 'Alarm Systems & Security' },
  'jump-starter': { subcategoryName: 'Jump Starter', collectionType: 'Car Electronics', title: 'Jump Starter' },

  // Motorcycle Accessories & Parts
  'motorcycle-accessories': { collectionType: 'Motorcycle Accessories & Parts', title: 'Motorcycle Accessories & Parts' },
  'motorcycle-accessories-parts': { collectionType: 'Motorcycle Accessories & Parts', title: 'Motorcycle Accessories & Parts' },
  'motorcycle-lighting': { subcategoryName: 'Lighting', collectionType: 'Motorcycle Accessories & Parts', title: 'Motorcycle Lighting' },
  'exhaust-systems': { subcategoryName: 'Exhaust & Exhaust Systems', collectionType: 'Motorcycle Accessories & Parts', title: 'Exhaust Systems' },
  'motor-brake-system': { subcategoryName: 'Motor Brake System', collectionType: 'Motorcycle Accessories & Parts', title: 'Motor Brake System' },
  'motorcycle-seat-covers': { subcategoryName: 'Motorcycle Seat Covers', collectionType: 'Motorcycle Accessories & Parts', title: 'Motorcycle Seat Covers' },
  'other-motorcycle-accessories': { subcategoryName: 'Other Motorcycle Accessories', collectionType: 'Motorcycle Accessories & Parts', title: 'Other Motorcycle Accessories' },
  'helmet-headset': { subcategoryName: 'Helmet Headset', collectionType: 'Motorcycle Accessories & Parts', title: 'Helmet Headset' },
  'body-frame': { subcategoryName: 'Body & Frame', collectionType: 'Motorcycle Accessories & Parts', title: 'Body & Frame' },

  // Auto Replacement Parts
  'auto-replacement-parts': { collectionType: 'Auto Replacement Parts', title: 'Auto Replacement Parts' },
  'interior-parts': { subcategoryName: 'Interior Parts', collectionType: 'Auto Replacement Parts', title: 'Interior Parts' },
  'car-brake-system': { subcategoryName: 'Car Brake System', collectionType: 'Auto Replacement Parts', title: 'Car Brake System' },
  'spark-plugs-ignition': { subcategoryName: 'Spark Plugs & Ignition System', collectionType: 'Auto Replacement Parts', title: 'Spark Plugs & Ignition System' },
  'automobiles-sensors': { subcategoryName: 'Automobiles Sensors', collectionType: 'Auto Replacement Parts', title: 'Automobiles Sensors' },
  'exterior-parts': { subcategoryName: 'Exterior Parts', collectionType: 'Auto Replacement Parts', title: 'Exterior Parts' },
  'other-replacement-parts': { subcategoryName: 'Other Replacement Parts', collectionType: 'Auto Replacement Parts', title: 'Other Replacement Parts' },
  'car-lights': { subcategoryName: 'Car Lights', collectionType: 'Auto Replacement Parts', title: 'Car Lights' },
  'windscreen-wipers-windows': { subcategoryName: 'Windscreen Wipers & Windows', collectionType: 'Auto Replacement Parts', title: 'Windscreen Wipers & Windows' },

  // Aliases for database-normalized slugs to fix tab navigation on collection pages
  'all': { title: 'All Collections' },
  'dvr-and-dash-camera': { subcategoryName: 'DVR & Dash Camera', collectionType: 'Car Electronics', title: 'DVR & Dash Camera' },
  'dash-camera': { subcategoryName: 'DVR & Dash Camera', collectionType: 'Car Electronics', title: 'DVR & Dash Camera' },
  'dash-cam': { subcategoryName: 'DVR & Dash Camera', collectionType: 'Car Electronics', title: 'DVR & Dash Camera' },
  'alarm-systems-and-security': { subcategoryName: 'Alarm Systems & Security', collectionType: 'Car Electronics', title: 'Alarm Systems & Security' },
  'exhaust-and-exhaust-systems': { subcategoryName: 'Exhaust & Exhaust Systems', collectionType: 'Motorcycle Accessories & Parts', title: 'Exhaust Systems' },
  'motorcycle-accessories-and-parts': { collectionType: 'Motorcycle Accessories & Parts', title: 'Motorcycle Accessories & Parts' },
  'tools-maintenance-and-care': { collectionType: 'Tools, Maintenance & Care', title: 'Tools, Maintenance & Care' },
  'spark-plugs-and-ignition-system': { subcategoryName: 'Spark Plugs & Ignition System', collectionType: 'Auto Replacement Parts', title: 'Spark Plugs & Ignition System' },
  'spark-plugs': { subcategoryName: 'Spark Plugs & Ignition System', collectionType: 'Auto Replacement Parts', title: 'Spark Plugs & Ignition System' },
  'windscreen-wipers-and-windows': { subcategoryName: 'Windscreen Wipers & Windows', collectionType: 'Auto Replacement Parts', title: 'Windscreen Wipers & Windows' },
  'lighting': { subcategoryName: 'Lighting', collectionType: 'Motorcycle Accessories & Parts', title: 'Motorcycle Lighting' },
  'car-washers': { subcategoryName: 'Car Washer', collectionType: 'Tools, Maintenance & Care', title: 'Car Washer' },
  'floor-mat': { subcategoryName: 'Floor Mats', collectionType: 'Interior Accessories', title: 'Floor Mats' },
  'seat-covers': { subcategoryName: 'Automobiles Seat Covers', collectionType: 'Interior Accessories', title: 'Automobiles Seat Covers' },
  'automobile-seat-covers': { subcategoryName: 'Automobiles Seat Covers', collectionType: 'Interior Accessories', title: 'Automobiles Seat Covers' },
  'car-perfumes': { subcategoryName: 'Car Perfume', collectionType: 'Interior Accessories', title: 'Car Perfume' },
  'diagnostic-tool': { subcategoryName: 'Diagnostic Tools', collectionType: 'Tools, Maintenance & Care', title: 'Diagnostic Tools' },
  'gps-tracker': { subcategoryName: 'GPS Trackers', collectionType: 'Car Electronics', title: 'GPS Trackers' },
  'key-cases': { subcategoryName: 'Key Case for Car', collectionType: 'Interior Accessories', title: 'Key Case for Car' },
  'jump-starters': { subcategoryName: 'Jump Starter', collectionType: 'Car Electronics', title: 'Jump Starter' },
  'helmet-headsets': { subcategoryName: 'Helmet Headset', collectionType: 'Motorcycle Accessories & Parts', title: 'Helmet Headset' },
  'car-light': { subcategoryName: 'Car Lights', collectionType: 'Auto Replacement Parts', title: 'Car Lights' },
  'interior-part': { subcategoryName: 'Interior Parts', collectionType: 'Auto Replacement Parts', title: 'Interior Parts' },
  'exterior-part': { subcategoryName: 'Exterior Parts', collectionType: 'Auto Replacement Parts', title: 'Exterior Parts' },
};

export const normalizeSlug = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

