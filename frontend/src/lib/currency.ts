export const formatINR = (price: number): string => {
  return `₹${Math.round(price).toLocaleString('en-IN')}`;
};

export function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}