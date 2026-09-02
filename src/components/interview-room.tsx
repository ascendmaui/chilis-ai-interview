import { useNavigate } from "@tanstack/react-router";
import { Mic, MicOff, Send, Square } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { evaluateInterview, interviewTurn, speakText, transcribeAudio } from "@/lib/ai";
import { sendToManager } from "@/lib/hiring";
import {
  blobToBase64,
  micErrorMessage,
  pickRecorderMime,
  recordUtterance,
  requestMic,
  type RecordHandle,
} from "@/lib/mic";
import {
  FLOOR_PROMPTS,
  QUIZ_FIRST_DELAY_MS,
  QUIZ_INTERVAL_MS,
  type FloorPrompt,
} from "@/lib/scenarios";
import { greetingFor, INTERVIEW_COMPLETE_MARK } from "@/lib/prompts";
import { getRole, STORE } from "@/lib/roles";
import { toApplicationPayload, useHiringStore } from "@/lib/store";
import type { FloorAnswer, InterviewRecord, TranscriptLine } from "@/lib/types";
import { cn, formatClock, uid } from "@/lib/utils";
import { FloorAlert } from "./floor-alert";
import { PepperMark } from "./pepper";
import { Button } from "./ui/button";

type Phase = "ready" | "live" | "finishing";
type MicState = "idle" | "on" | "blocked";

export function InterviewRoom({ record }: { record: InterviewRecord }) {
  const navigate = useNavigate();
  const role = getRole(record.roleSlug);
  const patch = useHiringStore((s) => s.patch);
  const setTranscript = useHiringStore((s) => s.setTranscript);
  const addFloorAnswer = useHiringStore((s) => s.addFloorAnswer);
  const setScorecard = useHiringStore((s) => s.setScorecard);

  const [phase, setPhase] = useState<Phase>("ready");
  const [lines, setLines] = useState<TranscriptLine[]>(record.transcript);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [muted, setMuted] = useState(false);
  const [voiceOk, setVoiceOk] = useState(true);
  const [micState, setMicState] = useState<MicState>("idle");
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(record.durationSec ?? 0);
  const [floorIndex, setFloorIndex] = useState(-1);
  const [activeFloor, setActiveFloor] = useState<FloorPrompt | null>(null);

  const startedAt = useRef<number | null>(
    record.startedAt ? Date.parse(record.startedAt) : null,
  );
  const linesRef = useRef(lines);
  const answersRef = useRef(record.floorAnswers);
  const endingRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recHandleRef = useRef<RecordHandle | null>(null);
  const listenAbortRef = useRef<AbortController | null>(null);
  const mimeRef = useRef(pickRecorderMime());
  const endRef = useRef<HTMLDivElement | null>(null);
  const timers = useRef<number[]>([]);
  const voiceQueue = useRef<Promise<void>>(Promise.resolve());
  const flags = useRef({
    busy: false,
    speaking: false,
    listening: false,
    transcribing: false,
    muted: false,
    phase: "ready" as Phase,
    mic: "idle" as MicState,
  });

  flags.current.busy = busy;
  flags.current.speaking = speaking;
  flags.current.listening = listening;
  flags.current.transcribing = transcribing;
  flags.current.muted = muted;
  flags.current.phase = phase;
  flags.current.mic = micState;

  const prompts = FLOOR_PROMPTS[record.roleSlug];
  const beginListenRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    if (record.status === "completed") {
      void navigate({ to: "/done/$id", params: { id: record.id } });
    }
  }, [navigate, record.id, record.status]);

  useEffect(() => {
    linesRef.current = lines;
  }, [lines]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines, phase]);

  useEffect(() => {
    if (phase !== "live") return;
    const t = window.setInterval(() => {
      if (startedAt.current) {
        setElapsed(Math.floor((Date.now() - startedAt.current) / 1000));
      }
    }, 400);
    return () => window.clearInterval(t);
  }, [phase]);

  const setMicEnabled = useCallback((on: boolean) => {
    streamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = on;
    });
  }, []);

  const cancelListen = useCallback(() => {
    listenAbortRef.current?.abort();
    listenAbortRef.current = null;
    recHandleRef.current?.cancel();
    recHandleRef.current = null;
    setListening(false);
    setLevel(0);
  }, []);

  useEffect(() => {
    return () => {
      timers.current.forEach((id) => window.clearTimeout(id));
      cancelListen();
      audioRef.current?.pause();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [cancelListen]);

  const persistLines = useCallback(
    (next: TranscriptLine[]) => {
      setLines(next);
      setTranscript(record.id, next);
    },
    [record.id, setTranscript],
  );

  const finish = useCallback(async () => {
    if (endingRef.current) return;
    endingRef.current = true;
    setPhase("finishing");
    cancelListen();
    audioRef.current?.pause();
    timers.current.forEach((id) => window.clearTimeout(id));
    setActiveFloor(null);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    const durationSec = startedAt.current
      ? Math.floor((Date.now() - startedAt.current) / 1000)
      : elapsed;

    const result = await evaluateInterview({
      data: {
        roleSlug: record.roleSlug,
        candidateName: `${record.candidate.firstName} ${record.candidate.lastName}`.trim(),
        transcript: linesRef.current,
        durationSec,
        floorAnswers: answersRef.current,
      },
    });
    if (result.ok) {
      setScorecard(record.id, result.scorecard, durationSec);
    } else {
      setError(result.error);
      setScorecard(
        record.id,
        {
          overallScore: 5,
          recommendation: "maybe",
          summary: "Scoring could not run. GM should review the transcript.",
          strengths: [],
          developmentAreas: ["Manual review required"],
          scores: {
            hospitality: 5,
            reliability: 5,
            teamwork: 5,
            guestRecovery: 5,
            foodKnowledge: 5,
            energy: 5,
            coachability: 5,
            rushJudgment: 5,
          },
          scenarioNotes: result.error,
          nextStep: "Open the transcript in manager view.",
        },
        durationSec,
      );
    }

    const latest = useHiringStore.getState().get(record.id);
    if (latest) {
      try {
        const sent = await sendToManager({ data: toApplicationPayload(latest) });
        if (sent.ok) patch(record.id, { sentToManager: true });
      } catch {
        /* GM board still has the local copy in this browser */
      }
    }

    try {
      sessionStorage.setItem("chilis-last-interview", record.id);
    } catch {
      /* ignore */
    }

    void navigate({ to: "/done/$id", params: { id: record.id } });
  }, [cancelListen, elapsed, navigate, patch, record, setScorecard]);

  const playVoice = useCallback(
    (text: string) => {
      voiceQueue.current = voiceQueue.current.then(async () => {
        cancelListen();
        setMicEnabled(false);
        try {
          if (!flags.current.muted) {
            const res = await speakText({ data: { text } });
            if (!res.ok) {
              setVoiceOk(false);
            } else {
              setVoiceOk(true);
              const url = `data:${res.mime};base64,${res.audioBase64}`;
              const audio = new Audio(url);
              audioRef.current?.pause();
              audioRef.current = audio;
              setSpeaking(true);
              await audio.play();
              await new Promise<void>((resolve) => {
                audio.onended = () => resolve();
                audio.onerror = () => resolve();
              });
            }
          }
        } catch {
          setVoiceOk(false);
        } finally {
          setSpeaking(false);
          setMicEnabled(true);
        }
        await new Promise((r) => window.setTimeout(r, 280));
        if (
          flags.current.phase === "live" &&
          !flags.current.busy &&
          !flags.current.transcribing &&
          !endingRef.current
        ) {
          beginListenRef.current();
        }
      });
      return voiceQueue.current;
    },
    [cancelListen, setMicEnabled],
  );

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || flags.current.busy || endingRef.current) return;
      cancelListen();
      flags.current.busy = true;
      setBusy(true);
      setError(null);
      setDraft("");
      const userLine: TranscriptLine = {
        id: uid("ln"),
        role: "user",
        text: trimmed,
        at: Date.now(),
      };
      const next = [...linesRef.current, userLine];
      persistLines(next);

      const history = next
        .filter((l) => l.role === "user" || l.role === "assistant")
        .slice(0, -1)
        .map((l) => ({ role: l.role as "user" | "assistant", text: l.text }));

      try {
        const result = await interviewTurn({
          data: {
            roleSlug: record.roleSlug,
            candidate: record.candidate,
            history,
            userText: trimmed,
          },
        });

        if (!result.ok) {
          setError(result.error);
          flags.current.busy = false;
          setBusy(false);
          return;
        }

        const assistantLine: TranscriptLine = {
          id: uid("ln"),
          role: "assistant",
          text: result.text,
          at: Date.now(),
        };
        persistLines([...next, assistantLine]);
        flags.current.busy = false;
        setBusy(false);
        void playVoice(result.text);
        if (result.text.toLowerCase().includes(INTERVIEW_COMPLETE_MARK)) {
          void finish();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not reach Cam.");
        flags.current.busy = false;
        setBusy(false);
      }
    },
    [cancelListen, finish, persistLines, playVoice, record.candidate, record.roleSlug],
  );

  const openMic = useCallback(async (): Promise<boolean> => {
    if (streamRef.current?.getAudioTracks().some((t) => t.readyState === "live")) {
      setMicState("on");
      return true;
    }
    try {
      const stream = await requestMic();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = stream;
      mimeRef.current = pickRecorderMime();
      setMicState("on");
      setError(null);
      return true;
    } catch (err) {
      setMicState("blocked");
      setError(micErrorMessage(err));
      return false;
    }
  }, []);

  const beginListen = useCallback(() => {
    if (endingRef.current) return;
    if (flags.current.phase !== "live") return;
    if (flags.current.busy || flags.current.speaking || flags.current.transcribing) return;
    if (flags.current.listening) return;
    const stream = streamRef.current;
    if (!stream || flags.current.mic !== "on") return;
    if (typeof MediaRecorder === "undefined") {
      setError("Voice capture isn’t available here — type your answers.");
      return;
    }

    listenAbortRef.current?.abort();
    const abort = new AbortController();
    listenAbortRef.current = abort;
    setMicEnabled(true);
    setListening(true);
    setError(null);

    const handle = recordUtterance(stream, {
      mime: mimeRef.current,
      onLevel: setLevel,
      signal: abort.signal,
    });
    recHandleRef.current = handle;

    void handle.promise.then(async (blob) => {
      recHandleRef.current = null;
      setListening(false);
      setLevel(0);
      if (!blob || endingRef.current || abort.signal.aborted) return;
      if (blob.size < 1200) {
        setError("Didn't catch that — tap the mic and speak a little longer.");
        return;
      }
      setTranscribing(true);
      try {
        const audioBase64 = await blobToBase64(blob);
        const result = await transcribeAudio({
          data: { audioBase64, mime: blob.type || mimeRef.current || "audio/webm" },
        });
        if (!result.ok || !result.text.trim()) {
          setError(result.ok ? "Didn't catch any words — tap the mic or type." : result.error);
          return;
        }
        await send(result.text);
      } catch {
        setError("Voice ran into a snag — type this answer.");
      } finally {
        setTranscribing(false);
      }
    });
  }, [send, setMicEnabled]);

  beginListenRef.current = beginListen;

  async function onMicButton() {
    if (listening) {
      recHandleRef.current?.stop();
      return;
    }
    const ok = await openMic();
    if (!ok) return;
    beginListen();
  }

  async function start() {
    setError(null);
    const micPromise = openMic();
    setPhase("live");
    const now = Date.now();
    startedAt.current = now;
    patch(record.id, {
      status: "in_progress",
      startedAt: new Date(now).toISOString(),
    });
    const greeting = greetingFor(record.roleSlug, record.candidate.firstName);
    const greetLine: TranscriptLine = {
      id: uid("ln"),
      role: "assistant",
      text: greeting,
      at: now,
    };
    persistLines([greetLine]);
    void playVoice(greeting);

    void micPromise.then((ok) => {
      if (!ok) {
        setError((prev) => prev ?? "Mic is off — type your answers, or tap the mic to try again.");
      }
    });

    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = prompts.map((p, i) =>
      window.setTimeout(() => {
        setFloorIndex(i);
        setActiveFloor(p);
      }, QUIZ_FIRST_DELAY_MS + i * QUIZ_INTERVAL_MS),
    );
  }

  function onFloorAnswer(choiceId: string) {
    if (!activeFloor) return;
    const choice = activeFloor.choices.find((c) => c.id === choiceId);
    if (!choice) return;
    const answer: FloorAnswer = {
      id: uid("fl"),
      prompt: activeFloor.title,
      choice: choice.label,
      correct: choice.correct,
      at: Date.now(),
    };
    answersRef.current = [...answersRef.current, answer];
    addFloorAnswer(record.id, answer);
    setActiveFloor(null);
  }

  const first = record.candidate.firstName;

  const readyCopy = useMemo(
    () => ({
      title: `Ready when you are, ${first}`,
      body: `${role.title} · about 10 minutes with ${STORE.gmName}, GM at this Chili’s. Speak or type. Floor calls may pop up mid-conversation — answer them without dropping Cam.`,
    }),
    [first, role.title],
  );

  if (phase === "finishing") {
    return (
      <div className="flex min-h-[70dvh] flex-col items-center justify-center px-4 text-center">
        <div className="size-12 animate-spin rounded-full border-2 border-border border-t-chili" />
        <h1 className="mt-6 font-display text-4xl font-bold uppercase">Scoring the floor</h1>
        <p className="mt-2 max-w-xs text-sm text-muted">
          Cam is writing your scorecard and sending it to the GM. Keep this tab open.
        </p>
      </div>
    );
  }

  if (phase === "ready") {
    return (
      <div className="mx-auto max-w-lg space-y-5 px-4 py-8">
        <div className="overflow-hidden rounded-xl bg-surface shadow-card">
          <div className="relative h-48">
            <img
              src="/images/gm.jpg"
              alt="Cam, general manager"
              className="size-full object-cover object-[50%_20%]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-surface to-transparent" />
          </div>
          <div className="relative -mt-10 px-5 pb-6">
            <div className="flex size-16 items-center justify-center rounded-full bg-chili text-cream shadow-[var(--shadow-chili)]">
              <PepperMark className="size-8" />
            </div>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-chili">
              {role.title} · {STORE.location}
            </p>
            <h1 className="mt-1 font-display text-4xl font-bold uppercase">{readyCopy.title}</h1>
            <p className="mt-3 text-sm leading-relaxed text-muted">{readyCopy.body}</p>
            <ul className="mt-4 space-y-2 text-sm text-muted">
              <li>Start asks for your microphone so you can talk to Cam</li>
              <li>Floor pop-ups test rush judgment</li>
              <li>The GM gets your overview and scorecard when you finish</li>
            </ul>
          </div>
        </div>
        {error && <p className="text-sm text-chili">{error}</p>}
        <Button size="lg" className="w-full" onClick={() => void start()}>
          Start with Cam
        </Button>
      </div>
    );
  }

  const status = busy
    ? "Cam is thinking…"
    : transcribing
      ? "Got it — writing that down…"
      : speaking
        ? "Cam is speaking"
        : listening
          ? "Listening — go ahead"
          : micState === "blocked"
            ? "Mic blocked — type, or tap the mic to retry"
            : "Live — speak or type";

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-lg flex-col px-4 pb-[max(1.5rem,calc(env(safe-area-inset-bottom)+5.5rem))] pt-2">
      <div className="flex items-center justify-between text-sm">
        <span className="truncate text-muted">
          {role.title} · {STORE.gmName}
        </span>
        <span className="font-mono tabular-nums text-fg">{formatClock(elapsed)}</span>
      </div>

      <div className="mt-4 flex flex-col items-center rounded-xl bg-surface px-4 py-8 shadow-card">
        <div
          className={cn(
            "size-28 overflow-hidden rounded-full shadow-[0_0_0_1px_var(--color-border)]",
            (speaking || listening) && "animate-pulse-ring",
          )}
        >
          <img src="/images/gm.jpg" alt="" className="size-full object-cover object-[50%_18%]" />
        </div>
        <p className="mt-4 font-display text-3xl font-bold uppercase">{STORE.gmName}</p>
        <p className="text-sm text-muted">{status}</p>
        {!voiceOk && (
          <p className="mt-1 text-xs text-subtle">Voice is muted or unavailable — keep typing.</p>
        )}
        {(speaking || listening) && (
          <div className="mt-3 flex h-5 items-end gap-1">
            {[0, 0.12, 0.24, 0.36, 0.48].map((d, i) => (
              <span
                key={d}
                className="wave-bar w-1 rounded-sm bg-chili"
                style={{
                  height: listening ? Math.max(6, Math.min(18, 6 + level * 80 + i)) : 18,
                  animationDelay: `${d}s`,
                }}
              />
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 min-h-0 flex-1 space-y-2.5 overflow-y-auto rounded-xl bg-elevated/70 p-3">
        {lines.map((line) => (
          <Bubble key={line.id} line={line} />
        ))}
        <div ref={endRef} />
      </div>

      {error && <p className="mt-2 text-sm text-chili">{error}</p>}

      <form
        className="mt-3 flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void send(draft);
        }}
      >
        <button
          type="button"
          onClick={() => void onMicButton()}
          className={cn(
            "grid size-11 shrink-0 place-items-center rounded-full",
            listening ? "bg-chili text-cream" : "bg-elevated text-fg shadow-card",
          )}
          aria-label={listening ? "Stop listening" : "Speak"}
        >
          {listening ? <MicOff className="size-5" /> : <Mic className="size-5" />}
        </button>
        <textarea
          rows={1}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send(draft);
            }
          }}
          placeholder={listening ? "Listening…" : "Type your answer…"}
          className="min-h-11 flex-1 resize-none rounded-lg bg-surface px-3.5 py-2.5 text-base text-fg shadow-card outline-none"
        />
        <Button type="submit" size="icon" disabled={busy || !draft.trim()} aria-label="Send">
          <Send className="size-4" />
        </Button>
      </form>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            setMuted((m) => {
              const next = !m;
              if (next) audioRef.current?.pause();
              return next;
            });
          }}
        >
          {muted ? "Unmute Cam" : "Mute Cam"}
        </Button>
        <Button type="button" variant="outline" onClick={() => void finish()}>
          <Square className="size-3.5 fill-current" />
          End interview
        </Button>
      </div>

      {activeFloor && (
        <FloorAlert
          prompt={activeFloor}
          index={Math.max(0, floorIndex)}
          total={prompts.length}
          onAnswer={onFloorAnswer}
        />
      )}
    </div>
  );
}

function Bubble({ line }: { line: TranscriptLine }) {
  if (line.role === "system") {
    return <p className="text-center text-xs text-subtle">{line.text}</p>;
  }
  const mine = line.role === "user";
  return (
    <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[88%] px-3.5 py-2.5 text-sm leading-relaxed",
          mine
            ? "rounded-[16px_16px_4px_16px] bg-chili text-cream"
            : "rounded-[16px_16px_16px_4px] bg-surface text-fg shadow-card",
        )}
      >
        <p className="mb-0.5 text-xs font-semibold uppercase tracking-wider opacity-70">
          {mine ? "You" : STORE.gmName}
        </p>
        {line.text}
      </div>
    </div>
  );
}
