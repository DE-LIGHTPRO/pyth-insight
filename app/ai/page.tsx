"use client";

/**
 * AI Oracle Analyst — conversational interface to Pyth live data.
 *
 * Claude is injected with a live snapshot of every connected Pyth feed
 * (prices, CI, asset type) so it can answer questions about what is
 * happening on-chain right now, not just from training data.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { usePriceStore }  from "@/lib/stores/priceStore";
import { formatPrice, formatConf } from "@/lib/pyth/hermes";

// ── Quick-action prompts shown before / after first message ───────────────────

const QUICK_PROMPTS = [
  "Which crypto feed has the tightest confidence interval right now?",
  "What does a wide confidence interval mean for a DeFi liquidation engine?",
  "How does Pyth's CI calibration work and why should protocols care?",
  "Which assets look most volatile based on live CI data?",
  "Explain the difference between Pyth Hermes and Pyth Benchmarks.",
  "What's EMA price and why does Pyth publish it alongside spot price?",
];

// ── Types ─────────────────────────────────────────────────────────────────────

interface Message {
  role:       "user" | "assistant";
  content:    string;
  streaming?: boolean;
}

// ── Live context builder ───────────────────────────────────────────────────────
// Converts the Zustand price store into a compact text block injected into
// the system prompt so Claude knows what the oracle is doing RIGHT NOW.

function buildLiveContext(
  prices: ReturnType<typeof usePriceStore.getState>["prices"]
): string {
  const entries = Object.values(prices);
  if (entries.length === 0) return "No live feed data available yet.";

  const sorted   = [...entries].sort((a, b) => a.confPct - b.confPct);
  const tightest = sorted.slice(0, 5);
  const widest   = [...sorted].reverse().slice(0, 5);
  const crypto   = entries.filter((p) => p.assetType === "crypto");
  const byType   = {
    crypto: entries.filter((p) => p.assetType === "crypto").length,
    fx:     entries.filter((p) => p.assetType === "fx").length,
    metal:  entries.filter((p) => p.assetType === "metal").length,
  };

  const fmt = (p: (typeof entries)[0]) =>
    `  ${p.symbol.padEnd(14)} $${formatPrice(p.price).padStart(14)} CI ±${formatConf(p.confPct).padStart(7)} (${p.assetType})`;

  return [
    `Total live feeds: ${entries.length} (crypto: ${byType.crypto}, forex: ${byType.fx}, metals: ${byType.metal})`,
    "",
    "5 tightest CI feeds (most precise right now):",
    ...tightest.map(fmt),
    "",
    "5 widest CI feeds (highest uncertainty right now):",
    ...widest.map(fmt),
    "",
    `Crypto sample (${crypto.length} total, first 20):`,
    ...crypto.slice(0, 20).map(fmt),
  ].join("\n");
}

// ── Message bubble ─────────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-lg bg-green-950/70 border border-green-800/40 flex items-center justify-center flex-shrink-0 mt-0.5">
          <svg className="w-3.5 h-3.5 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="9" />
            <path strokeLinecap="round" d="M12 8v4m0 4h.01" />
          </svg>
        </div>
      )}
      <div
        className={`max-w-[78%] rounded-xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words ${
          isUser
            ? "bg-purple-600/90 text-white rounded-tr-sm"
            : "bg-white/5 text-slate-200 border border-white/8 rounded-tl-sm"
        }`}
      >
        {msg.content}
        {msg.streaming && (
          <span className="inline-block w-1.5 h-4 bg-green-400 ml-0.5 animate-pulse rounded-sm align-text-bottom" />
        )}
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AIPage() {
  const [messages,   setMessages]   = useState<Message[]>([]);
  const [input,      setInput]      = useState("");
  const [streaming,  setStreaming]  = useState(false);
  const [streamText, setStreamText] = useState("");
  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLTextAreaElement>(null);

  const prices = usePriceStore((s) => s.prices);
  const status = usePriceStore((s) => s.status);
  const total  = Object.keys(prices).length;

  // Scroll to bottom whenever content changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamText]);

  // ── Send ──────────────────────────────────────────────────────────────────

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || streaming) return;

      const userMsg: Message = { role: "user", content: trimmed };
      const nextMessages     = [...messages, userMsg];
      setMessages(nextMessages);
      setInput("");
      setStreaming(true);
      setStreamText("");

      try {
        const res = await fetch("/api/ai/chat", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages:    nextMessages,
            liveContext: buildLiveContext(prices),
          }),
        });

        if (!res.ok || !res.body) throw new Error(`Server error ${res.status}`);

        const reader  = res.body.getReader();
        const decoder = new TextDecoder();
        let fullText  = "";
        let buffer    = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const payload = line.slice(6).trim();
            if (payload === "[DONE]") break;
            try {
              const parsed = JSON.parse(payload);
              if (parsed.text)  { fullText += parsed.text; setStreamText(fullText); }
              if (parsed.error) throw new Error(parsed.error);
            } catch { /* ignore partial JSON */ }
          }
        }

        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: fullText || "No response generated." },
        ]);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `⚠ ${msg}\n\nEnsure ANTHROPIC_API_KEY is set in Vercel environment variables.` },
        ]);
      } finally {
        setStreaming(false);
        setStreamText("");
        inputRef.current?.focus();
      }
    },
    [messages, prices, streaming]
  );

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  const displayMessages: Message[] = [
    ...messages,
    ...(streaming && streamText
      ? [{ role: "assistant" as const, content: streamText, streaming: true }]
      : []),
  ];

  const hasMessages = displayMessages.length > 0;

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div
      className="max-w-4xl mx-auto px-4 sm:px-6 flex flex-col"
      style={{ height: "calc(100dvh - 72px)" }}
    >
      {/* Header */}
      <div className="py-5 flex items-center justify-between gap-4 flex-shrink-0 border-b border-white/6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-green-400 font-medium tracking-wide uppercase">AI Oracle Analyst</span>
            <span className="text-xs text-slate-600">Pyth + Claude</span>
          </div>
          <p className="text-sm text-slate-400 max-w-sm">
            Ask anything about live Pyth feeds, CI quality, or DeFi oracle risk.
          </p>
        </div>
        {/* Live status pill */}
        <div className={`flex-shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1 border text-xs font-medium ${
          status === "connected"  ? "bg-emerald-950/50 border-emerald-800/40 text-emerald-400" :
          status === "connecting" ? "bg-yellow-950/50  border-yellow-800/40  text-yellow-400"  :
                                    "bg-slate-800/50   border-slate-700/40   text-slate-500"
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${
            status === "connected"  ? "bg-emerald-400 animate-pulse" :
            status === "connecting" ? "bg-yellow-400  animate-pulse" : "bg-slate-500"
          }`} />
          {status === "connected"  ? `${total.toLocaleString()} live feeds` :
           status === "connecting" ? "Connecting…" : "Offline"}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto min-h-0 py-4">

        {/* Empty state */}
        {!hasMessages && (
          <div className="flex flex-col items-center justify-center h-full gap-8">
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-green-950/60 border border-green-800/40 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                </svg>
              </div>
              <p className="text-white font-semibold text-lg">AI Oracle Analyst</p>
              <p className="text-slate-500 text-sm mt-1 max-w-sm mx-auto">
                {total > 0
                  ? `Watching ${total} live Pyth feeds. Ask anything.`
                  : "Connecting to Pyth Hermes… ask anything about oracle data."}
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-2 w-full max-w-2xl">
              {QUICK_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => sendMessage(p)}
                  disabled={streaming}
                  className="text-left px-4 py-3 rounded-xl border border-white/8 bg-white/3 hover:bg-white/6 hover:border-white/14 text-slate-400 hover:text-slate-200 text-sm leading-snug transition-all duration-150 disabled:opacity-40"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message thread */}
        {hasMessages && (
          <div className="space-y-4 pb-2">
            {displayMessages.map((msg, i) => (
              <MessageBubble key={i} msg={msg} />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input bar */}
      <div className="py-4 flex-shrink-0 border-t border-white/6">
        {/* Quick prompts (compact row after conversation starts) */}
        {hasMessages && (
          <div className="flex gap-2 flex-wrap mb-3">
            {QUICK_PROMPTS.slice(0, 3).map((p) => (
              <button
                key={p}
                onClick={() => sendMessage(p)}
                disabled={streaming}
                className="text-xs px-3 py-1.5 rounded-full border border-white/8 bg-white/3 hover:bg-white/8 text-slate-500 hover:text-slate-300 transition-all duration-150 disabled:opacity-30 max-w-[260px] truncate"
              >
                {p}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-3 items-end rounded-xl border border-white/10 bg-white/3 px-4 py-3 focus-within:border-white/20 transition-colors">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask about live feeds, CI calibration, DeFi risk…"
            rows={1}
            disabled={streaming}
            className="flex-1 bg-transparent text-white placeholder-slate-600 text-sm resize-none outline-none leading-relaxed disabled:opacity-50"
            style={{ maxHeight: "120px", overflowY: "auto" }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || streaming}
            className="flex-shrink-0 w-8 h-8 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:bg-white/8 disabled:cursor-not-allowed flex items-center justify-center transition-all duration-150"
            aria-label="Send"
          >
            {streaming ? (
              <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 1l7 7-7 7V9.5H1v-3h7V1z" />
              </svg>
            )}
          </button>
        </div>
        <p className="text-[11px] text-slate-700 mt-2 text-center">
          Powered by Anthropic Claude · live Pyth Hermes data · Enter to send, Shift+Enter for newline
        </p>
      </div>
    </div>
  );
}
