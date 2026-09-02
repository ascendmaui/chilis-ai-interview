import { createServerFn } from "@tanstack/react-start";
import { buildEvalPrompt, buildInterviewerPrompt, greetingFor } from "./prompts";
import { normalizeScorecard, parseModelJson } from "./score";
import type {
  Candidate,
  FloorAnswer,
  RoleSlug,
  Scorecard,
  TranscriptLine,
} from "./types";

const CHAT_MODEL = "grok-4.5";
const EVAL_MODEL = "grok-4.5";
const VOICE_ID = "eve";

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

async function xaiChat(opts: {
  model: string;
  messages: ChatMessage[];
  temperature: number;
  maxTokens: number;
  json?: boolean;
}): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) return { ok: false, error: "AI is not available in this environment" };

  const body: Record<string, unknown> = {
    model: opts.model,
    messages: opts.messages,
    temperature: opts.temperature,
    max_tokens: opts.maxTokens,
  };
  if (opts.json) body.response_format = { type: "json_object" };

  let res: Response;
  try {
    res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(28000),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Network error";
    return { ok: false, error: `Could not reach Cam (${msg})` };
  }

  if (!res.ok) {
    return { ok: false, error: `xAI API error ${res.status}` };
  }
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return { ok: true, text: data.choices?.[0]?.message?.content ?? "" };
}

export const startInterview = createServerFn({ method: "POST" })
  .validator((input: { roleSlug: RoleSlug; candidate: Candidate }) => input)
  .handler(async ({ data }) => {
    const greeting = greetingFor(data.roleSlug, data.candidate.firstName);
    return { ok: true as const, greeting, agentName: "Cam" };
  });

export const interviewTurn = createServerFn({ method: "POST" })
  .validator(
    (input: {
      roleSlug: RoleSlug;
      candidate: Candidate;
      history: { role: "user" | "assistant"; text: string }[];
      userText: string;
    }) => input,
  )
  .handler(async ({ data }) => {
    if (!data.userText.trim()) {
      return { ok: false as const, error: "Say something so Cam can respond." };
    }
    const messages: ChatMessage[] = [
      { role: "system", content: buildInterviewerPrompt(data.roleSlug, data.candidate) },
      ...data.history.map((h) => ({
        role: h.role,
        content: h.text,
      })),
      { role: "user", content: data.userText.trim().slice(0, 1200) },
    ];
    const result = await xaiChat({
      model: CHAT_MODEL,
      messages,
      temperature: 0.7,
      maxTokens: 220,
    });
    if (!result.ok) return result;
    const text = result.text.trim() || "Give me one more beat on that.";
    return { ok: true as const, text };
  });

export const speakText = createServerFn({ method: "POST" })
  .validator((input: { text: string }) => input)
  .handler(async ({ data }) => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) return { ok: false as const, error: "Voice is not available" };
    const text = data.text.trim().slice(0, 800);
    if (!text) return { ok: false as const, error: "Nothing to speak" };

    let res: Response;
    try {
      res = await fetch("https://api.x.ai/v1/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ text, voice_id: VOICE_ID, language: "en" }),
        signal: AbortSignal.timeout(20000),
      });
    } catch {
      return { ok: false as const, error: "Voice timed out" };
    }
    if (!res.ok) return { ok: false as const, error: `TTS error ${res.status}` };
    const buf = Buffer.from(await res.arrayBuffer());
    return {
      ok: true as const,
      mime: res.headers.get("content-type") || "audio/mpeg",
      audioBase64: buf.toString("base64"),
    };
  });

function filenameForMime(mime: string): string {
  if (mime.includes("mp4") || mime.includes("aac") || mime.includes("m4a")) return "speech.m4a";
  if (mime.includes("mpeg") || mime.includes("mp3")) return "speech.mp3";
  if (mime.includes("ogg")) return "speech.ogg";
  if (mime.includes("wav")) return "speech.wav";
  return "speech.webm";
}

function readTranscript(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const rec = payload as Record<string, unknown>;
  if (typeof rec.text === "string") return rec.text;
  if (typeof rec.transcript === "string") return rec.transcript;
  const nested = rec.result;
  if (nested && typeof nested === "object" && typeof (nested as { text?: string }).text === "string") {
    return (nested as { text: string }).text;
  }
  return "";
}

export const transcribeAudio = createServerFn({ method: "POST" })
  .validator((input: { audioBase64: string; mime: string }) => input)
  .handler(async ({ data }) => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) return { ok: false as const, error: "Voice is not available" };
    if (!data.audioBase64 || data.audioBase64.length < 80) {
      return { ok: false as const, error: "Clip was empty" };
    }
    if (data.audioBase64.length > 3_500_000) {
      return { ok: false as const, error: "Clip was too long — try a shorter answer" };
    }

    const mime = data.mime || "audio/webm";
    const bytes = Buffer.from(data.audioBase64, "base64");
    if (bytes.length < 64) return { ok: false as const, error: "Clip was empty" };

    const postStt = async (url: string, extra?: Record<string, string>) => {
      const form = new FormData();
      form.append(
        "file",
        new Blob([new Uint8Array(bytes)], { type: mime }),
        filenameForMime(mime),
      );
      if (extra) {
        for (const [k, v] of Object.entries(extra)) form.append(k, v);
      }
      return fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form,
        signal: AbortSignal.timeout(20000),
      });
    };

    let res: Response;
    try {
      res = await postStt("https://api.x.ai/v1/stt");
      if (res.status === 404 || res.status === 405) {
        res = await postStt("https://api.x.ai/v1/audio/transcriptions", {
          model: "whisper-1",
        });
      }
    } catch {
      return { ok: false as const, error: "Could not transcribe that clip" };
    }

    if (!res.ok) {
      return { ok: false as const, error: `Voice-to-text error ${res.status}` };
    }
    const payload: unknown = await res.json().catch(() => null);
    const text = readTranscript(payload).trim();
    if (!text) return { ok: false as const, error: "Didn't catch any words" };
    return { ok: true as const, text: text.slice(0, 1200) };
  });

function thinScorecard(floorAnswers: FloorAnswer[]): Scorecard {
  return normalizeScorecard(
    {
      overallScore: 2,
      recommendation: "maybe",
      summary:
        "Not enough conversation to grade. Invite them to re-run the interview on a stable connection.",
      strengths: [],
      developmentAreas: [
        "Need a real conversation sample",
        "Complete the interview before scoring",
      ],
      scores: {
        hospitality: 2,
        reliability: 2,
        teamwork: 2,
        guestRecovery: 2,
        foodKnowledge: 2,
        energy: 2,
        coachability: 2,
        rushJudgment: floorAnswers.filter((a) => a.correct).length || 2,
      },
      scenarioNotes: "Transcript too thin to evaluate.",
      nextStep: "Re-run the AI interview before a floor invite.",
    },
    floorAnswers,
  );
}

export const evaluateInterview = createServerFn({ method: "POST" })
  .validator(
    (input: {
      roleSlug: RoleSlug;
      candidateName: string;
      transcript: TranscriptLine[];
      durationSec: number;
      floorAnswers: FloorAnswer[];
    }) => input,
  )
  .handler(async ({ data }): Promise<{ ok: true; scorecard: Scorecard } | { ok: false; error: string }> => {
    const empty = data.transcript.filter((l) => l.role === "user").length < 2;
    if (empty) {
      return { ok: true, scorecard: thinScorecard(data.floorAnswers) };
    }

    const { system, user } = buildEvalPrompt(data);
    const result = await xaiChat({
      model: EVAL_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.3,
      maxTokens: 700,
      json: true,
    });
    if (!result.ok) return result;

    try {
      const parsed = parseModelJson(result.text);
      return { ok: true, scorecard: normalizeScorecard(parsed, data.floorAnswers) };
    } catch {
      return {
        ok: true,
        scorecard: normalizeScorecard(
          {
            overallScore: 5,
            recommendation: "maybe",
            summary: result.text.slice(0, 400) || "Could not parse scorecard.",
            strengths: [],
            developmentAreas: ["Review transcript manually"],
            scenarioNotes: "Fallback scorecard.",
            nextStep: "GM should listen to the transcript.",
          },
          data.floorAnswers,
        ),
      };
    }
  });
