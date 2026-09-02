import { create } from "zustand";
import { persist } from "zustand/middleware";
import { SEED_INTERVIEWS } from "./seed";
import type {
  FloorAnswer,
  InterviewRecord,
  PipelineStatus,
  Scorecard,
  TranscriptLine,
} from "./types";

type Store = {
  interviews: InterviewRecord[];
  upsert: (rec: InterviewRecord) => void;
  mergeRemote: (recs: InterviewRecord[]) => void;
  patch: (id: string, patch: Partial<InterviewRecord>) => void;
  setTranscript: (id: string, lines: TranscriptLine[]) => void;
  addFloorAnswer: (id: string, answer: FloorAnswer) => void;
  setScorecard: (id: string, scorecard: Scorecard, durationSec: number) => void;
  setPipelineStatus: (id: string, pipelineStatus: PipelineStatus) => void;
  get: (id: string) => InterviewRecord | undefined;
  resetDemo: () => void;
};

export const useHiringStore = create<Store>()(
  persist(
    (set, get) => ({
      interviews: SEED_INTERVIEWS,
      upsert: (rec) =>
        set((s) => ({
          interviews: [rec, ...s.interviews.filter((i) => i.id !== rec.id)],
        })),
      mergeRemote: (recs) =>
        set((s) => {
          const byId = new Map(s.interviews.map((i) => [i.id, i]));
          for (const rec of recs) {
            const prev = byId.get(rec.id);
            if (!prev) {
              byId.set(rec.id, rec);
              continue;
            }
            byId.set(rec.id, {
              ...prev,
              ...rec,
              transcript: rec.transcript.length ? rec.transcript : prev.transcript,
              floorAnswers: rec.floorAnswers.length ? rec.floorAnswers : prev.floorAnswers,
              scorecard: rec.scorecard ?? prev.scorecard,
              pipelineStatus: rec.pipelineStatus ?? prev.pipelineStatus,
              sentToManager: rec.sentToManager || prev.sentToManager,
            });
          }
          return { interviews: Array.from(byId.values()) };
        }),
      patch: (id, patch) =>
        set((s) => ({
          interviews: s.interviews.map((i) => (i.id === id ? { ...i, ...patch } : i)),
        })),
      setTranscript: (id, lines) =>
        set((s) => ({
          interviews: s.interviews.map((i) =>
            i.id === id ? { ...i, transcript: lines } : i,
          ),
        })),
      addFloorAnswer: (id, answer) =>
        set((s) => ({
          interviews: s.interviews.map((i) =>
            i.id === id
              ? { ...i, floorAnswers: [...i.floorAnswers, answer] }
              : i,
          ),
        })),
      setScorecard: (id, scorecard, durationSec) =>
        set((s) => ({
          interviews: s.interviews.map((i) =>
            i.id === id
              ? {
                  ...i,
                  scorecard,
                  durationSec,
                  status: "completed" as const,
                  pipelineStatus: i.pipelineStatus ?? "reviewing",
                  completedAt: new Date().toISOString(),
                }
              : i,
          ),
        })),
      setPipelineStatus: (id, pipelineStatus) =>
        set((s) => ({
          interviews: s.interviews.map((i) =>
            i.id === id ? { ...i, pipelineStatus } : i,
          ),
        })),
      get: (id) => get().interviews.find((i) => i.id === id),
      resetDemo: () =>
        set((s) => ({
          interviews: [
            ...SEED_INTERVIEWS,
            ...s.interviews.filter((i) => !i.demo),
          ],
        })),
    }),
    {
      name: "chilis-hiring-v1",
      skipHydration: true,
    },
  ),
);

export function toApplicationPayload(rec: InterviewRecord) {
  return {
    id: rec.id,
    roleSlug: rec.roleSlug,
    status: rec.status,
    pipelineStatus: rec.pipelineStatus ?? "reviewing",
    candidate: rec.candidate,
    createdAt: rec.createdAt,
    startedAt: rec.startedAt,
    completedAt: rec.completedAt,
    durationSec: rec.durationSec,
    transcript: rec.transcript,
    floorAnswers: rec.floorAnswers,
    scorecard: rec.scorecard,
    demo: rec.demo,
  };
}
