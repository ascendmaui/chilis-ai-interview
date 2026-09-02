#!/usr/bin/env node
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const BASE = process.env.QA_URL || "http://127.0.0.1:8080";
const results = { ok: true, checks: [] };

function check(name, pass, detail = "") {
  results.checks.push({ name, pass, detail });
  if (!pass) results.ok = false;
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`);
}

async function sttRoundtrip() {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    check("stt-roundtrip", false, "XAI_API_KEY missing");
    return;
  }
  const tts = await fetch("https://api.x.ai/v1/tts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      text: "I have three years on the floor and I can close a four-top.",
      voice_id: "eve",
      language: "en",
    }),
    signal: AbortSignal.timeout(20000),
  });
  if (!tts.ok) {
    check("stt-roundtrip", false, `TTS ${tts.status}`);
    return;
  }
  const buf = Buffer.from(await tts.arrayBuffer());
  const mime = tts.headers.get("content-type") || "audio/mpeg";
  const form = new FormData();
  form.append("file", new Blob([buf], { type: mime }), "speech.mp3");
  const stt = await fetch("https://api.x.ai/v1/stt", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
    signal: AbortSignal.timeout(20000),
  });
  const payload = await stt.json().catch(() => ({}));
  const text = String(payload.text || payload.transcript || "").toLowerCase();
  check(
    "stt-roundtrip",
    stt.ok && text.length > 0,
    stt.ok ? `heard: ${text.slice(0, 80)}` : `STT ${stt.status} ${JSON.stringify(payload).slice(0, 120)}`,
  );
}

async function browserChecks() {
  const browser = await chromium.launch({
    args: [
      "--use-fake-ui-for-media-stream",
      "--use-fake-device-for-media-stream",
      "--use-fake-unresponsive-timeout-for-media-stream",
    ],
  });
  const context = await browser.newContext({
    permissions: ["microphone"],
    viewport: { width: 390, height: 844 },
  });
  await context.addInitScript(() => {
    window.__gumCalls = 0;
    const devices = navigator.mediaDevices;
    if (!devices?.getUserMedia) return;
    const orig = devices.getUserMedia.bind(devices);
    devices.getUserMedia = async (constraints) => {
      window.__gumCalls += 1;
      window.__gumConstraints = constraints;
      return orig(constraints);
    };
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (err) => errors.push(String(err)));

  await page.goto(`${BASE}/login`, { waitUntil: "networkidle", timeout: 30000 });
  const loginText = await page.locator("body").innerText();
  check("login-shows-google", /Continue with Google/i.test(loginText), loginText.slice(0, 80));
  check(
    "login-not-stuck-overlay",
    !/Signing you in/i.test(loginText) && !/You're in/i.test(loginText),
  );

  await page.goto(`${BASE}/apply?role=server`, { waitUntil: "networkidle", timeout: 30000 });
  await page.getByRole("button", { name: /fill demo/i }).click();
  await page.getByRole("button", { name: /continue to interview/i }).click();
  await page.waitForURL(/\/interview\//, { timeout: 15000 });
  await page.getByRole("button", { name: /start with cam/i }).click();

  await page.waitForTimeout(1500);
  const gumCalls = await page.evaluate(() => window.__gumCalls);
  check("start-requests-microphone", gumCalls >= 1, `getUserMedia calls: ${gumCalls}`);

  const live = await page.locator("body").innerText();
  check(
    "interview-goes-live",
    /Cam is speaking|Listening|Live — speak|Mic blocked|thinking/i.test(live),
    live.slice(0, 120),
  );

  await page.screenshot({ path: "/workspace/screenshots/interview-mic-fix.png", fullPage: true });

  await page.waitForTimeout(8000);
  const afterTts = await page.locator("body").innerText();
  check(
    "auto-listen-or-type-fallback",
    /Listening|Live — speak|Mic blocked|type your answers|Got it|Cam is speaking|thinking/i.test(
      afterTts,
    ),
    afterTts.slice(0, 160),
  );
  await page.screenshot({ path: "/workspace/screenshots/interview-listening.png", fullPage: true });

  check("no-page-errors", errors.length === 0, errors.slice(0, 3).join(" | "));

  await browser.close();
}

await sttRoundtrip();
await browserChecks();
writeFileSync("/workspace/screenshots/qa-mic-auth.json", JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
process.exit(results.ok ? 0 : 1);
