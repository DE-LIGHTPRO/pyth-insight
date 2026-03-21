/**
 * POST /api/ai/chat
 *
 * Streaming AI oracle analyst.
 * Tries Anthropic Claude first; falls back to Gemini if no Anthropic key.
 * The client sends its current live price snapshot as context so the AI
 * can answer questions about what is happening on-chain RIGHT NOW.
 *
 * Response: SSE stream — `data: {"text":"…"}\n\n` then `data: [DONE]\n\n`
 */

import { NextRequest } from "next/server";
import { AI_SYSTEM_PROMPT } from "@/lib/pyth/ai-data";

export const runtime     = "nodejs";
export const maxDuration = 30;

interface ChatMessage {
  role:    "user" | "assistant";
  content: string;
}

// ── Anthropic streaming ───────────────────────────────────────────────────────

async function* streamAnthropic(
  systemPrompt: string,
  messages: ChatMessage[]
): AsyncGenerator<string> {
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client    = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const stream = client.messages.stream({
    model:      "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    system:     systemPrompt,
    messages,
  });

  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      yield event.delta.text;
    }
  }
}

// ── Gemini model discovery ────────────────────────────────────────────────────

// Cache discovered model names for the process lifetime (avoids repeated list calls)
let _discoveredModels: string[] | null = null;

async function discoverGeminiModels(apiKey: string): Promise<string[]> {
  if (_discoveredModels) return _discoveredModels;
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      { signal: AbortSignal.timeout(6000) }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const models: string[] = (data.models ?? [])
      .filter((m: { supportedGenerationMethods?: string[]; name?: string }) =>
        m.supportedGenerationMethods?.includes("generateContent") &&
        m.name?.includes("gemini")
      )
      .map((m: { name: string }) => m.name.replace("models/", ""))
      // Prefer flash (fast/free) over pro; newer versions first
      .sort((a: string, b: string) => {
        const score = (n: string) =>
          (n.includes("flash") ? 10 : 0) +
          (n.includes("2.5")   ?  4 : 0) +
          (n.includes("2.0")   ?  3 : 0) +
          (n.includes("1.5")   ?  2 : 0) +
          (n.includes("lite")  ? -1 : 0);
        return score(b) - score(a);
      });
    if (models.length) _discoveredModels = models;
    return models;
  } catch {
    return [];
  }
}

// ── Gemini non-streaming (no SDK needed — plain fetch) ────────────────────────

async function* streamGemini(
  systemPrompt: string,
  messages: ChatMessage[]
): AsyncGenerator<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("No AI key configured. Add GEMINI_API_KEY to .env.local.");

  const lastUserMsg = messages.filter((m) => m.role === "user").at(-1)?.content ?? "";
  const history     = messages.slice(0, -1);

  // Build Gemini content array (system → user alternation)
  const contents = [
    { role: "user",  parts: [{ text: systemPrompt }] },
    { role: "model", parts: [{ text: "Understood. I am the Pyth Oracle Analyst. How can I help?" }] },
    ...history.map((m) => ({
      role:  m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }],
    })),
    { role: "user", parts: [{ text: lastUserMsg }] },
  ];

  // Static fallback list covering known aliases across 2024-2026.
  // Dynamic discovery (below) is tried first — this catches anything new.
  const STATIC_MODELS = [
    { api: "v1beta", name: "gemini-2.5-flash"              },
    { api: "v1beta", name: "gemini-2.5-pro"                },
    { api: "v1beta", name: "gemini-2.0-flash"              },
    { api: "v1beta", name: "gemini-2.0-flash-001"          },
    { api: "v1beta", name: "gemini-2.0-flash-lite"         },
    { api: "v1beta", name: "gemini-2.0-flash-exp"          },
    { api: "v1beta", name: "gemini-1.5-flash-latest"       },
    { api: "v1beta", name: "gemini-1.5-flash-8b"           },
    { api: "v1",     name: "gemini-1.5-flash"              },
    { api: "v1",     name: "gemini-1.5-flash-001"          },
    { api: "v1",     name: "gemini-pro"                    },
  ];

  // Discover models dynamically then merge with static list (discovered first)
  const discovered = await discoverGeminiModels(apiKey);
  const allModels: Array<{ api: string; name: string }> = [
    ...discovered.map((name) => ({ api: "v1beta", name })),
    ...STATIC_MODELS.filter((s) => !discovered.includes(s.name)),
  ];

  let res: Response | null = null;
  let lastErr = "";

  for (const { api, name } of allModels) {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/${api}/models/${name}:generateContent?key=${apiKey}`,
      {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
        }),
        signal: AbortSignal.timeout(20000),
      }
    );
    if (r.ok) { res = r; break; }
    lastErr = `${name} HTTP ${r.status}`;
  }

  if (!res) throw new Error(`Gemini error: ${lastErr}`);

  const data = await res.json();

  // Surface Gemini-level errors (e.g. safety blocks, quota, auth)
  if (data?.error) {
    throw new Error(`Gemini: ${data.error.message ?? JSON.stringify(data.error)}`);
  }

  const candidate = data?.candidates?.[0];
  if (!candidate) {
    const reason = data?.promptFeedback?.blockReason ?? "no candidates returned";
    throw new Error(`Gemini returned no response (${reason}). Check GEMINI_API_KEY validity.`);
  }

  const text = candidate?.content?.parts?.[0]?.text ?? "";

  // Simulate streaming — yield in ~50-char chunks so the UI feels responsive
  const chunkSize = 50;
  for (let i = 0; i < text.length; i += chunkSize) {
    yield text.slice(i, i + chunkSize);
    await new Promise((r) => setTimeout(r, 10));
  }
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<Response> {
  let messages:    ChatMessage[];
  let liveContext: string | undefined;

  try {
    const body = await req.json();
    messages    = body.messages    ?? [];
    liveContext = body.liveContext ?? undefined;
  } catch {
    return new Response(JSON.stringify({ error: "invalid JSON" }), { status: 400 });
  }

  if (!messages.length) {
    return new Response(JSON.stringify({ error: "messages array required" }), { status: 400 });
  }

  const systemPrompt = liveContext
    ? `${AI_SYSTEM_PROMPT}\n\n## Live Feed Snapshot (right now)\n\n${liveContext}`
    : AI_SYSTEM_PROMPT;

  const validMessages = messages.filter(
    (m): m is ChatMessage => (m.role === "user" || m.role === "assistant") && typeof m.content === "string"
  );

  if (!validMessages.length) {
    return new Response(JSON.stringify({ error: "no valid messages" }), { status: 400 });
  }

  const useAnthropic = !!process.env.ANTHROPIC_API_KEY;
  const encoder      = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      const send = (data: string) => controller.enqueue(encoder.encode(`data: ${data}\n\n`));

      try {
        const gen = useAnthropic
          ? streamAnthropic(systemPrompt, validMessages)
          : streamGemini(systemPrompt, validMessages);

        for await (const chunk of gen) {
          send(JSON.stringify({ text: chunk }));
        }
        send("[DONE]");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Stream error";
        send(JSON.stringify({ error: msg }));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type":      "text/event-stream",
      "Cache-Control":     "no-cache",
      "Connection":        "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
