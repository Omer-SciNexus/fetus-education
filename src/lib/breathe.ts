// Breathing pacer rhythm: in for 4 seconds, out for 6.
export const BREATHE_IN = 4
export const BREATHE_OUT = 6

export function breathPhase(elapsed: number): { phase: 'in' | 'out'; secondsLeft: number } {
  const t = elapsed % (BREATHE_IN + BREATHE_OUT)
  return t < BREATHE_IN
    ? { phase: 'in', secondsLeft: BREATHE_IN - t }
    : { phase: 'out', secondsLeft: BREATHE_IN + BREATHE_OUT - t }
}
