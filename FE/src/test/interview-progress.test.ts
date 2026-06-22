import { describe, expect, it } from "vitest";

import {
  buildTelemetryAnswerReplay,
  buildTelemetryImprovementSummary,
  buildTelemetryProgressSeries,
  buildTelemetrySessionSeries,
} from "../lib/interview-progress";

describe("interview progress telemetry helpers", () => {
  it("builds a per-answer progress series from telemetry snapshots", () => {
    const series = buildTelemetryProgressSeries([
      {
        telemetry_data: {
          gazeRatio: 0.5,
          bodyPostureScore: 0.6,
          speakingPace: 120,
          fillerWordsCount: 8,
          presentationConfidence: 70,
        },
      },
      {
        telemetry_data: {
          gazeRatio: 0.72,
          bodyPostureScore: 0.84,
          speakingPace: 104,
          fillerWordsCount: 5,
          presentationConfidence: 82,
        },
      },
    ]);

    expect(series).toEqual([
      {
        label: "Q1",
        answerIndex: 1,
        gaze: 50,
        posture: 60,
        wpm: 120,
        fillers: 8,
        confidence: 70,
      },
      {
        label: "Q2",
        answerIndex: 2,
        gaze: 72,
        posture: 84,
        wpm: 104,
        fillers: 5,
        confidence: 82,
      },
    ]);
  });

  it("summarizes improvement between the first and last telemetry points", () => {
    const summary = buildTelemetryImprovementSummary([
      {
        label: "Q1",
        answerIndex: 1,
        gaze: 50,
        posture: 60,
        wpm: 120,
        fillers: 8,
        confidence: 70,
      },
      {
        label: "Q2",
        answerIndex: 2,
        gaze: 72,
        posture: 84,
        wpm: 104,
        fillers: 5,
        confidence: 82,
      },
    ]);

    expect(summary).toEqual({
      gazeDelta: 22,
      postureDelta: 24,
      wpmDelta: -16,
      fillersDelta: -3,
      confidenceDelta: 12,
    });
  });

  it("builds a session-level telemetry trend series", () => {
    const series = buildTelemetrySessionSeries([
      {
        session_id: "session-1",
        created_at: "2026-06-10T00:00:00Z",
        avg_score: 7.2,
        summary: {
          gaze: 62,
          posture: 70,
          wpm: 118,
          fillers: 6,
          confidence: 74,
          blink: 4,
          tension: 18,
          answer_count: 2,
        },
        answers: [],
      },
      {
        session_id: "session-2",
        created_at: "2026-06-12T00:00:00Z",
        avg_score: 8.1,
        summary: {
          gaze: 74,
          posture: 80,
          wpm: 110,
          fillers: 4,
          confidence: 83,
          blink: 3,
          tension: 12,
          answer_count: 2,
        },
        answers: [],
      },
    ]);

    expect(series).toEqual([
      {
        sessionId: "session-2",
        label: "12/06",
        avgScore: 8.1,
        gaze: 74,
        posture: 80,
        wpm: 110,
        confidence: 83,
        fillers: 4,
        blink: 3,
        tension: 12,
        answerCount: 2,
      },
      {
        sessionId: "session-1",
        label: "10/06",
        avgScore: 7.2,
        gaze: 62,
        posture: 70,
        wpm: 118,
        confidence: 74,
        fillers: 6,
        blink: 4,
        tension: 18,
        answerCount: 2,
      },
    ]);
  });

  it("builds an answer replay series including follow-up points", () => {
    const series = buildTelemetryAnswerReplay({
      session_id: "session-1",
      created_at: "2026-06-10T00:00:00Z",
      avg_score: 7.2,
      summary: {
        gaze: 62,
        posture: 70,
        wpm: 118,
        fillers: 6,
        confidence: 74,
        blink: 4,
        tension: 18,
        answer_count: 2,
      },
      answers: [
        {
          label: "Q1",
          question_id: 10,
          is_follow_up: false,
          score: 7.2,
          submitted_at: "2026-06-10T00:05:00Z",
          telemetry_data: {
            gazeRatio: 0.62,
            bodyPostureScore: 0.7,
            speakingPace: 118,
            fillerWordsCount: 6,
            presentationConfidence: 74,
            blinkRatio: 0.04,
            avgTensionScore: 0.18,
          },
        },
        {
          label: "Q1b",
          question_id: 10,
          is_follow_up: true,
          score: 8.0,
          submitted_at: "2026-06-10T00:07:00Z",
          telemetry_data: {
            gazeRatio: 0.7,
            bodyPostureScore: 0.78,
            speakingPace: 110,
            fillerWordsCount: 4,
            presentationConfidence: 81,
            blinkRatio: 0.03,
            avgTensionScore: 0.12,
          },
        },
      ],
    });

    expect(series[0]).toMatchObject({
      label: "Q1",
      isFollowUp: false,
      score: 7.2,
      gaze: 62,
      posture: 70,
      blink: 4,
      tension: 18,
    });
    expect(series[1]).toMatchObject({
      label: "Q1b",
      isFollowUp: true,
      score: 8,
      gaze: 70,
      posture: 78,
      blink: 3,
      tension: 12,
    });
  });
});
