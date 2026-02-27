/**
 * POST /api/ai/chat
 *
 * Streaming AI oracle analyst powered by Anthropic Claude.
 * The client sends its current live price snapshot as context so Claude
 * can answer questions about what's happening on-chain RIGHT NOW.
 *
 * Response: SSE stream — `data: {"text":"…"}\n\n` then `data: [DONE]\n\n`
 */

import Anthropic                from "@anthropic-ai/sdk";
import { NextRequest }          from "next/server";
import { AI_SYSTEM_PROMPT }     from "@/lib/pyth/ai-data";

export const runtime     = "nodejs";
export const maxDuration = 30;

const client = new Anthropic();

interface ChatMessage {
  role:    "user" | "assistant";
  content: string;
}

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

  // Build system prompt — inject live feed data if the client provided it
  const systemPrompt = liveContext
    ? `${AI_SYSTEM_PROMPT}\n\n## Live Feed Snapshot (right now)\n\n${liveContext}`
    : AI_SYSTEM_PROMPT;

  // Validate roles (Anthropic SDK strict about alternating user/assistant)
  const validMessages = messages.filter(
    (m): m is ChatMessage => (m.role === "user" || m.role === "assistant") && typeof m.content === "string"
  );

  if (!validMessages.length) {
    return new Response(JSON.stringify({ error: "no valid messages" }), { status: 400 });
  }

  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      const send = (data: string) =>
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));

      try {
        const stream = client.messages.stream({
          model:      "claude-haiku-4-5-20251001", // fast, cheap — real-time chat feel
          max_tokens: 1024,
          system:     systemPrompt,
          messages:   validMessages,
        });

        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            send(JSON.stringify({ text: event.delta.text }));
          }
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
      "Content-Type":  "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection":    "keep-alive",
      "X-Accel-Buffering": "no", // disable nginx buffering on Vercel
    },
  });
}
