/** 98000 → "98 000", 3504 → "3 504" (the design groups 4-digit numbers too,
 * which Intl's ka-GE format doesn't). Uses a no-break space. */
export function n(value: number) {
  return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

export function gel(value: number) {
  return `${n(value)} ლ`;
}
