import type { FloorAnswer, Recommendation, Scorecard } from "./types";

const RECS: Recommendation[] = ["strong_yes", "yes", "maybe", "no"];

const SCORE_FIELDS: (keyof Scorecard["scores"])[] = [
  "hospitality",
  "reliability",
  "teamwork",
  "guestRecovery",
  "foodKnowledge",
  "energy",
  "coachability",
  "rushJudgment",
];

function clampScore(n: unknown, fallback = 5): number {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.max(1, Math.min(10, Math.round(v * 10) / 10));
}

function asStringList(value: unknown, max = 4): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .slice(0, max);
}

export function parseModelJson(text: string): unknown {
  const trimmed = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  const slice = start >= 0 && end > start ? trimmed.slice(start, end + 1) : trimmed;
  return JSON.parse(slice);
}

export function normalizeScorecard(
  raw: unknown,
  floorAnswers: FloorAnswer[],
): Scorecard {
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const rec = RECS.includes(obj.recommendation as Recommendation)
    ? (obj.recommendation as Recommendation)
    : "maybe";
  const scoresIn =
    obj.scores && typeof obj.scores === "object"
      ? (obj.scores as Record<string, unknown>)
      : {};
  const floorRush =
    floorAnswers.length > 0
      ? clampScore(
          (floorAnswers.filter((a) => a.correct).length / floorAnswers.length) * 9 + 1,
        )
      : 5;

  const scores = {
    hospitality: clampScore(scoresIn.hospitality),
    reliability: clampScore(scoresIn.reliability),
    teamwork: clampScore(scoresIn.teamwork),
    guestRecovery: clampScore(scoresIn.guestRecovery),
    foodKnowledge: clampScore(scoresIn.foodKnowledge),
    energy: clampScore(scoresIn.energy),
    coachability: clampScore(scoresIn.coachability),
    rushJudgment: clampScore(scoresIn.rushJudgment, floorRush),
  };

  const overallFromDims =
    SCORE_FIELDS.reduce((sum, key) => sum + scores[key], 0) / SCORE_FIELDS.length;

  return {
    overallScore: clampScore(obj.overallScore, overallFromDims),
    recommendation: rec,
    summary:
      typeof obj.summary === "string" && obj.summary.trim()
        ? obj.summary.trim().slice(0, 800)
        : "Cam scored the conversation. The GM should review the transcript.",
    strengths: asStringList(obj.strengths),
    developmentAreas: asStringList(obj.developmentAreas, 3),
    scores,
    scenarioNotes:
      typeof obj.scenarioNotes === "string" && obj.scenarioNotes.trim()
        ? obj.scenarioNotes.trim().slice(0, 600)
        : "See floor calls and transcript.",
    nextStep:
      typeof obj.nextStep === "string" && obj.nextStep.trim()
        ? obj.nextStep.trim().slice(0, 240)
        : "GM should listen and decide on a floor invite.",
  };
}
