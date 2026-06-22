type TelemetrySnapshot = {
  gazeRatio?: number | null;
  bodyPostureScore?: number | null;
  slouchRatio?: number | null;
  speakingPace?: number | null;
  fillerWordsCount?: number | null;
  presentationConfidence?: number | null;
  followUp?: TelemetrySnapshot | null;
};

type ProgressAnswer = {
  telemetry_data?: TelemetrySnapshot | null;
  follow_up_telemetry_data?: TelemetrySnapshot | null;
};

type TelemetryHistoryAnswer = {
  label: string;
  question_id: number;
  is_follow_up?: boolean;
  score?: number | null;
  submitted_at?: string | null;
  telemetry_data?: TelemetrySnapshot | null;
};

type TelemetryHistorySession = {
  session_id: string;
  created_at: string;
  avg_score?: number | null;
  summary: {
    gaze: number;
    posture: number;
    wpm: number;
    fillers: number;
    confidence: number;
    blink: number;
    tension: number;
    answer_count: number;
  };
  answers: TelemetryHistoryAnswer[];
};

export interface TelemetryProgressPoint {
  label: string;
  answerIndex: number;
  gaze: number;
  posture: number;
  wpm: number;
  fillers: number;
  confidence: number;
}

export interface TelemetryImprovementSummary {
  gazeDelta: number;
  postureDelta: number;
  wpmDelta: number;
  fillersDelta: number;
  confidenceDelta: number;
}

export interface TelemetrySessionSeriesPoint {
  sessionId: string;
  label: string;
  avgScore: number;
  gaze: number;
  posture: number;
  wpm: number;
  confidence: number;
  fillers: number;
  blink: number;
  tension: number;
  answerCount: number;
}

export interface TelemetryAnswerReplayPoint extends TelemetryProgressPoint {
  isFollowUp: boolean;
  score: number;
  submittedAt: string | null;
  blink: number;
  tension: number;
}

function toPercent(value: number | null | undefined): number {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  return Math.round(value * 100);
}

function toWholeNumber(value: number | null | undefined, fallback = 0): number {
  if (typeof value !== "number" || Number.isNaN(value)) return fallback;
  return Math.round(value);
}

function snapshotToPoint(snapshot: TelemetrySnapshot | null | undefined, label: string, answerIndex: number): TelemetryProgressPoint | null {
  if (!snapshot) return null;
  return {
    label,
    answerIndex,
    gaze: toPercent(snapshot.gazeRatio),
    posture: toPercent(snapshot.bodyPostureScore ?? (snapshot.slouchRatio != null ? 1 - snapshot.slouchRatio : undefined)),
    wpm: toWholeNumber(snapshot.speakingPace),
    fillers: toWholeNumber(snapshot.fillerWordsCount),
    confidence: toWholeNumber(snapshot.presentationConfidence, 100),
  };
}

export function buildTelemetryProgressSeries(answers: ProgressAnswer[]): TelemetryProgressPoint[] {
  const points: TelemetryProgressPoint[] = [];

  answers.forEach((answer, index) => {
    const answerIndex = index + 1;
    const mainPoint = snapshotToPoint(answer.telemetry_data, `Q${answerIndex}`, answerIndex);
    if (mainPoint) {
      points.push(mainPoint);
    }

    const followUpPoint = snapshotToPoint(answer.follow_up_telemetry_data, `Q${answerIndex}b`, answerIndex);
    if (followUpPoint) {
      points.push(followUpPoint);
    }
  });

  return points;
}

export function buildTelemetryImprovementSummary(points: TelemetryProgressPoint[]): TelemetryImprovementSummary {
  if (points.length < 2) {
    return {
      gazeDelta: 0,
      postureDelta: 0,
      wpmDelta: 0,
      fillersDelta: 0,
      confidenceDelta: 0,
    };
  }

  const first = points[0];
  const last = points[points.length - 1];
  return {
    gazeDelta: last.gaze - first.gaze,
    postureDelta: last.posture - first.posture,
    wpmDelta: last.wpm - first.wpm,
    fillersDelta: last.fillers - first.fillers,
    confidenceDelta: last.confidence - first.confidence,
  };
}

export function buildTelemetrySessionSeries(sessions: TelemetryHistorySession[]): TelemetrySessionSeriesPoint[] {
  return sessions.map((session, index) => {
    const date = new Date(session.created_at);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");

    return {
      sessionId: session.session_id,
      label: Number.isNaN(date.getTime()) ? `S${index + 1}` : `${day}/${month}`,
      avgScore: typeof session.avg_score === "number" ? Number(session.avg_score.toFixed(1)) : 0,
      gaze: session.summary.gaze,
      posture: session.summary.posture,
      wpm: session.summary.wpm,
      confidence: session.summary.confidence,
      fillers: session.summary.fillers,
      blink: session.summary.blink,
      tension: session.summary.tension,
      answerCount: session.summary.answer_count,
    };
  }).reverse();
}

export function buildTelemetryAnswerReplay(session: TelemetryHistorySession | null | undefined): TelemetryAnswerReplayPoint[] {
  if (!session) return [];

  return session.answers.map((answer, index) => {
    const snapshot = answer.telemetry_data;
    return {
      label: answer.label,
      answerIndex: index + 1,
      gaze: toPercent(snapshot?.gazeRatio),
      posture: toPercent(snapshot?.bodyPostureScore ?? (snapshot?.slouchRatio != null ? 1 - snapshot.slouchRatio : undefined)),
      wpm: toWholeNumber(snapshot?.speakingPace),
      fillers: toWholeNumber(snapshot?.fillerWordsCount),
      confidence: toWholeNumber(snapshot?.presentationConfidence, 100),
      isFollowUp: Boolean(answer.is_follow_up),
      score: typeof answer.score === "number" ? Number(answer.score.toFixed(1)) : 0,
      submittedAt: answer.submitted_at ?? null,
      blink: toPercent(snapshot?.blinkRatio),
      tension: toPercent(snapshot?.avgTensionScore),
    };
  });
}
