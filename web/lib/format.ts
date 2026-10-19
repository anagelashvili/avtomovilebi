const number = new Intl.NumberFormat("ka-GE");

/** 98000 → "98 000" */
export function n(value: number) {
  return number.format(value);
}

export function gel(value: number) {
  return `${n(value)} ლ`;
}
