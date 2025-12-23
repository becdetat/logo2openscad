// Shared utility functions for turtle graphics

/**
 * Format a number with 6 decimal places, trimming trailing zeros
 */
export function formatNum(n: number): string {
  return Number(n.toFixed(6)).toString()
}
