export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

export function formatCurrency(value, currency = 'USD') {
  const n = Number(value || 0);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(n);
}

export function formatTime(ts) {
  if (!ts) return '';
  const d = typeof ts === 'number' ? new Date(ts) : new Date(ts);
  return d.toLocaleString();
}
