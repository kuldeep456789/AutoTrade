const COLOR_MAP: Record<string, string> = {
  black: '#1a1a1a',
  white: '#f5f5f5',
  offwhite: '#faf9f6',
  navyblue: '#1e3a5f',
  charcoalgrey: '#4a4a4a',
  olivegreen: '#556b2f',
  darkbrown: '#5c4033',
  beige: '#d4c4a8',
  pink: '#f8b4c4',
  hotpink: '#ff1493',
  lavender: '#b8a9c9',
  peach: '#ffcba4',
  skyblue: '#87ceeb',
  cream: '#fffdd0',
  purple: '#7b4f9e',
  rosegold: '#b76e79',
  red: '#c0392b',
  burgundy: '#800020',
  green: '#2d6a4f',
  forestgreen: '#228b22',
  mint: '#98ff98',
  grey: '#9e9e9e',
  gray: '#9e9e9e',
  heathergrey: '#b0b0b0',
  yellow: '#f4d03f',
  mustard: '#e1ad01',
  orange: '#e67e22',
  burntorange: '#cc5500',
  blue: '#2980b9',
  royalblue: '#4169e1',
  teal: '#008080',
  turquoise: '#40e0d0',
  maroon: '#800000',
  coral: '#ff7f50',
  khaki: '#c3b091',
  taupe: '#483c32',
  camel: '#c19a6b',
  rust: '#b7410e',
  plum: '#673147',
  blush: '#de5d83',
  lilac: '#c8a2c8',
  ivory: '#fffff0',
  charcoal: '#36454f',
  steelblue: '#4682b4',
  sage: '#b2ac88',
  terracotta: '#e2725b',
  champagne: '#f7e7ce',
  indigo: '#4b0082',
};

export const getColorHex = (color: string): string => {
  const key = color.toLowerCase().replace(/[\s'-]+/g, '');
  return COLOR_MAP[key] || '#cccccc';
};

export const getAllColors = () => COLOR_MAP;

export const getColorName = (hex: string): string | null => {
  const entry = Object.entries(COLOR_MAP).find(([, v]) => v === hex);
  return entry ? entry[0] : null;
};
