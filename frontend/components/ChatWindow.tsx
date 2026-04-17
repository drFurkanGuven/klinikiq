"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { getBaseUrl } from "@/lib/api";
import { storage } from "@/lib/storage";
import { WifiOff, Wifi, RefreshCw } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
  isError?: boolean;
}

interface Props {
  sessionId: string;
  initialMessages?: Message[];
}

export default function ChatWindow({ sessionId, initialMessages = [] }: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== "undefined" ? !navigator.onLine : false
  );
  const [connectionStatus, setConnectionStatus] = useState<
    null | "offline" | "error" | "reconnected"
  >(null);
  const [retryMessage, setRetryMessage] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const reconnectedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const handleOffline = () => {
      setIsOffline(true);
      setConnectionStatus("offline");
    };
    const handleOnline = () => {
      setIsOffline(false);
      setConnectionStatus("reconnected");
      if (reconnectedTimer.current) clearTimeout(reconnectedTimer.current);
      // Bekleyen mesaj varsa bar tıklanana kadar kalır, yoksa 2.5s'de kaybolur
      setRetryMessage((pending) => {
        if (!pending) {
          reconnectedTimer.current = setTimeout(() => setConnectionStatus(null), 2500);
        }
        return pending;
      });
    };
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
      if (reconnectedTimer.current) clearTimeout(reconnectedTimer.current);
    };
  }, []);

  const doSend = useCallback(
    async (text: string) => {
      setRetryMessage(null);
      setMessages((prev) => [...prev, { role: "user", content: text }]);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "", streaming: true },
      ]);
      setStreaming(true);

      try {
        await storage.waitForInit();
        const token = storage.getItem("access_token");
        const response = await fetch(
          `${getBaseUrl()}/sessions/${sessionId}/message`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ content: text }),
          }
        );

        if (!response.ok || !response.body) {
          throw new Error("stream_error");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          for (const line of chunk.split("\n")) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6).trim();
              if (data === "[DONE]") break;
              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  accumulated += parsed.content;
                  setMessages((prev) => {
                    const updated = [...prev];
                    updated[updated.length - 1] = {
                      role: "assistant",
                      content: accumulated,
                      streaming: true,
                    };
                    return updated;
                  });
                }
              } catch {
                /* skip malformed chunk */
              }
            }
          }
        }

        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: accumulated,
            streaming: false,
          };
          return updated;
        });
        if (connectionStatus === "error") setConnectionStatus(null);
      } catch {
        const offline = !navigator.onLine;
        setConnectionStatus(offline ? "offline" : "error");
        setRetryMessage(text);
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: offline
              ? "Çevrimdışısınız. İnternet bağlantınızı kontrol edin."
              : "Bağlantı koptu. Aşağıdaki butona basarak tekrar gönderebilirsiniz.",
            streaming: false,
            isError: true,
          };
          return updated;
        });
      } finally {
        setStreaming(false);
      }
    },
    [sessionId, connectionStatus]
  );

  const sendMessage = useCallback(async () => {
    if (!input.trim() || streaming) return;
    const text = input.trim();
    setInput("");
    await doSend(text);
  }, [input, streaming, doSend]);

  const handleRetry = useCallback(() => {
    if (!retryMessage || streaming || isOffline) return;
    setConnectionStatus(null);
    setMessages((prev) => prev.slice(0, -2));
    doSend(retryMessage);
  }, [retryMessage, streaming, isOffline, doSend]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function autoResize() {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Bağlantı durum barı */}
      {connectionStatus && (
        <div
          onClick={connectionStatus === "reconnected" && retryMessage ? handleRetry : undefined}
          className={`flex items-center justify-center gap-2 py-2 px-4 text-xs font-semibold transition-all ${
            connectionStatus === "offline"
              ? "bg-red-500/15 text-red-400 border-b border-red-500/20"
              : connectionStatus === "error"
              ? "bg-amber-500/15 text-amber-400 border-b border-amber-500/20"
              : retryMessage
              ? "bg-green-500/20 text-green-400 border-b border-green-500/30 cursor-pointer active:bg-green-500/30"
              : "bg-green-500/15 text-green-400 border-b border-green-500/20"
          }`}
        >
          {connectionStatus === "reconnected" ? (
            <Wifi className="w-3 h-3" />
          ) : (
            <WifiOff className="w-3 h-3" />
          )}
          {connectionStatus === "offline"
            ? "Çevrimdışı"
            : connectionStatus === "error"
            ? "Bağlantı koptu, tekrar bağlanılıyor..."
            : retryMessage
            ? "Bağlandı ✓ · Mesajı tekrar göndermek için dokun"
            : "Bağlandı ✓"}
        </div>
      )}

      {/* Mesajlar */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <p className="text-4xl mb-3">👨‍⚕️</p>
            <p className="text-sm">Hastaya bir şey sorun veya muayene başlatın.</p>
            <p className="text-xs mt-1 text-slate-600">
              Örnek: &quot;Ağrınız ne zamandan beri var?&quot;
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 flex items-center justify-center mr-2 flex-shrink-0 mt-0.5">
                <span className="text-sm">🏥</span>
              </div>
            )}
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-br-sm"
                  : msg.isError
                  ? "bg-amber-950/40 text-amber-300 border border-amber-500/20 rounded-bl-sm"
                  : "bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-sm"
              }`}
            >
              {msg.content}
              {msg.streaming && msg.content.length > 0 && (
                <span className="inline-block w-1 h-4 bg-blue-400 ml-1 animate-pulse rounded-sm align-middle" />
              )}
              {msg.streaming && msg.content.length === 0 && (
                <span className="flex gap-1 items-center h-4">
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:300ms]" />
                </span>
              )}
            </div>
          </div>
        ))}

        {/* Retry butonu */}
        {retryMessage && !streaming && (
          <div className="flex justify-center pt-1">
            <button
              onClick={handleRetry}
              disabled={isOffline}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
            >
              <RefreshCw className="w-3 h-3" />
              Son mesajı tekrar gönder
            </button>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input alanı */}
      <div className="p-4 border-t border-slate-800">
        <div className="flex items-end gap-3 bg-slate-800/50 border border-slate-700 rounded-2xl px-4 py-3 focus-within:border-blue-500/50 transition-colors">
          <textarea
            ref={textareaRef}
            id="chat-input"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              autoResize();
            }}
            onKeyDown={handleKeyDown}
            placeholder={
              isOffline
                ? "Çevrimdışı — bağlantı bekleniyor..."
                : "Hastaya bir şey sorun... (Enter ile gönder)"
            }
            rows={1}
            disabled={streaming || isOffline}
            className="flex-1 bg-transparent text-white placeholder-slate-500 text-sm resize-none outline-none max-h-30 disabled:opacity-50"
          />
          <button
            id="send-message"
            onClick={sendMessage}
            disabled={!input.trim() || streaming || isOffline}
            className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95"
          >
            {streaming ? (
              <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4 text-white -rotate-45" fill="currentColor" viewBox="0 0 24 24">
                <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" />
              </svg>
            )}
          </button>
        </div>
        <p className="text-xs text-slate-600 mt-2 text-center">
          Shift+Enter yeni satır • Enter gönder
        </p>
      </div>
    </div>
  );
}
