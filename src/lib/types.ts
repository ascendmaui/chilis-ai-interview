export type Recommendation = "strong_yes" | "yes" | "maybe" | "no";

export type PipelineStatus = "reviewing" | "floor_invite" | "offer" | "passed";

export type RoleSlug =
  | "server"
  | "host"
  | "bartender"
  | "line-cook"
  | "togo"
  | "shift-manager";

export type InterviewStatus =
  | "applied"
  | "in_progress"
  | "completed"
  | "abandoned";

export type TranscriptLine = {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  at: number;
};

export type FloorAnswer = {
  id: string;
  prompt: string;
  choice: string;
  correct: boolean;
  at: number;
};

export type Scorecard = {
  overallScore: number;
  recommendation: Recommendation;
  summary: string;
  strengths: string[];
  developmentAreas: string[];
  scores: {
    hospitality: number;
    reliability: number;
    teamwork: number;
    guestRecovery: number;
    foodKnowledge: number;
    energy: number;
    coachability: number;
    rushJudgment: number;
  };
  scenarioNotes: string;
  nextStep: string;
};

export type Candidate = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  yearsExperience: string;
  availability: string[];
  nightsWeekends: boolean;
  consent: boolean;
};

export type InterviewRecord = {
  id: string;
  roleSlug: RoleSlug;
  status: InterviewStatus;
  pipelineStatus?: PipelineStatus;
  applicantUserId?: string;
  candidate: Candidate;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  durationSec?: number;
  transcript: TranscriptLine[];
  floorAnswers: FloorAnswer[];
  scorecard?: Scorecard;
  demo?: boolean;
  sentToManager?: boolean;
};

export const REC_LABEL: Record<Recommendation, string> = {
  strong_yes: "Strong hire",
  yes: "Hire",
  maybe: "Hold",
  no: "Pass",
};

export const PIPELINE_LABEL: Record<PipelineStatus, string> = {
  reviewing: "GM reviewing",
  floor_invite: "Floor invite",
  offer: "Next steps",
  passed: "Not moving forward",
};

export const PIPELINE_APPLICANT_COPY: Record<PipelineStatus, string> = {
  reviewing: "Cam scored your interview. The GM at this Chili's is reviewing it now.",
  floor_invite: "You're invited to a floor interview. Watch this page for timing from the GM.",
  offer: "The GM wants to talk next steps. Check your phone and email.",
  passed: "Not moving forward this round. Thank you for your time with Cam.",
};

export const SCORE_KEYS: { key: keyof Scorecard["scores"]; label: string }[] = [
  { key: "hospitality", label: "Hospitality" },
  { key: "reliability", label: "Reliability" },
  { key: "teamwork", label: "Teamwork" },
  { key: "guestRecovery", label: "Guest recovery" },
  { key: "foodKnowledge", label: "Food & bev" },
  { key: "energy", label: "Energy" },
  { key: "coachability", label: "Coachability" },
  { key: "rushJudgment", label: "Rush judgment" },
];
