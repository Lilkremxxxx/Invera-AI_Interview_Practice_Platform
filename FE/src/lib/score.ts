export const SCORE_MAX = 10;
export const SCORE_SUCCESS_THRESHOLD = 7;
export const SCORE_WARNING_THRESHOLD = 4;

export function formatScoreValue(score: number | null | undefined): string {
  if (score == null || Number.isNaN(score)) {
    return '0.0';
  }
  return score.toFixed(1);
}

export function formatScore(score: number | null | undefined): string {
  if (score == null || Number.isNaN(score)) {
    return '—';
  }
  return `${score.toFixed(1)}/10`;
}

export function getScoreTextClass(score: number | null | undefined): string {
  if (score == null || Number.isNaN(score)) {
    return 'text-muted-foreground';
  }
  if (score >= SCORE_SUCCESS_THRESHOLD) {
    return 'text-success';
  }
  if (score >= SCORE_WARNING_THRESHOLD) {
    return 'text-warning';
  }
  return 'text-destructive';
}

export function getScoreBgClass(score: number | null | undefined): string {
  if (score == null || Number.isNaN(score)) {
    return 'bg-muted';
  }
  if (score >= SCORE_SUCCESS_THRESHOLD) {
    return 'bg-success/10';
  }
  if (score >= SCORE_WARNING_THRESHOLD) {
    return 'bg-warning/10';
  }
  return 'bg-destructive/10';
}

export function getScoreBarClass(score: number | null | undefined): string {
  if (score == null || Number.isNaN(score)) {
    return 'bg-muted';
  }
  if (score >= SCORE_SUCCESS_THRESHOLD) {
    return 'bg-success';
  }
  if (score >= SCORE_WARNING_THRESHOLD) {
    return 'bg-warning';
  }
  return 'bg-destructive';
}

export function toScoreProgress(score: number | null | undefined): number {
  if (score == null || Number.isNaN(score)) {
    return 0;
  }
  return Math.max(0, Math.min(100, (score / SCORE_MAX) * 100));
}
