// Traffic-light colours used in the sprint tables.

/** KPI progress bar: red < 80%, amber 80-99%, green >= 100%. */
export function kpiBarColor(kpiPercent: number): string {
  if (kpiPercent < 80) return '[&>div]:bg-red-500'
  if (kpiPercent < 100) return '[&>div]:bg-amber-500'
  return '[&>div]:bg-green-500'
}

/** Hours-used bar: green <= 100%, amber 100-110%, red > 110%. */
export function hoursBarColor(hoursPercent: number): string {
  if (hoursPercent <= 100) return '[&>div]:bg-green-500'
  if (hoursPercent <= 110) return '[&>div]:bg-amber-500'
  return '[&>div]:bg-red-500'
}

/** Billable rate text: red < $150/h, amber $150-189, green >= $190. */
export function billableRateColor(rate: number): string {
  if (rate < 150) return 'text-red-600 dark:text-red-400'
  if (rate < 190) return 'text-amber-600 dark:text-amber-400'
  return 'text-green-600 dark:text-green-400'
}
