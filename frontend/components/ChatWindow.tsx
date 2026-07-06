"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { getBaseUrl } from "@/lib/api";
import { storage } from "@/lib/storage";
import { WifiOff, Wifi, RefreshCw, Send } from "lucide-react";

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

  const statusBarStyle =
    connectionStatus === "offline"
      ? { background: "var(--destructive-muted)", color: "var(--destructive)", borderColor: "var(--destructive)" }
      : connectionStatus === "error"
      ? { background: "var(--surface-2)", color: "var(--text)", borderColor: "var(--border)" }
      : { background: "var(--surface-2)", color: "var(--text)", borderColor: "var(--border)" };

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg)", color: "var(--text)" }}>
      {connectionStatus && (
        <div
          onClick={connectionStatus === "reconnected" && retryMessage ? handleRetry : undefined}
          className={`flex items-center justify-center gap-2 py-2 px-4 text-xs font-medium border-b transition-all ${
            retryMessage && connectionStatus === "reconnected" ? "cursor-pointer" : ""
          }`}
          style={statusBarStyle}
        >
          {connectionStatus === "reconnected" ? (
            <Wifi className="w-3 h-3" />
          ) : (
            <WifiOff className="w-3 h-3" />
          )}
          {connectionStatus === "offline"
            ? "Çevrimdışı"
            : connectionStatus === "error"
            ? "Bağlantı koptu"
            : retryMessage
            ? "Bağlandı · Mesajı tekrar göndermek için dokun"
            : "Bağlandı"}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-12" style={{ color: "var(--text-muted)" }}>
            <p className="text-3xl mb-3">👨‍⚕️</p>
            <p className="text-sm">Hastaya bir şey sorun veya muayene başlatın.</p>
            <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
              Örnek: &quot;Ağrınız ne zamandan beri var?&quot;
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className="max-w-[75%] rounded-lg px-4 py-3 text-sm leading-relaxed border"
              style={{
                borderColor: msg.isError ? "var(--destructive)" : "var(--border)",
                background:
                  msg.role === "user"
                    ? "var(--surface-2)"
                    : msg.isError
                    ? "var(--destructive-muted)"
                    : "var(--surface)",
                color: msg.isError ? "var(--destructive)" : "var(--text)",
              }}
            >
              {msg.role === "assistant" && (
                <span className="text-[10px] font-medium block mb-1" style={{ color: "var(--muted)" }}>
                  Asistan
                </span>
              )}
              {msg.role === "user" && (
                <span className="text-[10px] font-medium block mb-1" style={{ color: "var(--muted)" }}>
                  Siz
                </span>
              )}
              {msg.content}
              {msg.streaming && msg.content.length > 0 && (
                <span
                  className="inline-block w-0.5 h-4 ml-1 animate-pulse align-middle"
                  style={{ background: "var(--foreground)" }}
                />
              )}
              {msg.streaming && msg.content.length === 0 && (
                <span className="flex gap-1 items-center h-4 mt-1">
                  <span className="w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:0ms]" style={{ background: "var(--muted)" }} />
                  <span className="w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:150ms]" style={{ background: "var(--muted)" }} />
                  <span className="w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:300ms]" style={{ background: "var(--muted)" }} />
                </span>
              )}
            </div>
          </div>
        ))}

        {retryMessage && !streaming && (
          <div className="flex justify-center pt-1">
            <button
              onClick={handleRetry}
              disabled={isOffline}
              className="btn-secondary flex items-center gap-2 px-4 py-2 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <RefreshCw className="w-3 h-3" />
              Son mesajı tekrar gönder
            </button>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="p-4 border-t" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <div
          className="flex items-end gap-2 rounded-lg border px-3 py-2 focus-within:border-[var(--foreground)] transition-colors"
          style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
        >
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
            className="flex-1 bg-transparent text-sm resize-none outline-none max-h-30 disabled:opacity-50"
            style={{ color: "var(--text)" }}
          />
          <button
            id="send-message"
            onClick={sendMessage}
            disabled={!input.trim() || streaming || isOffline}
            className="btn-primary shrink-0 w-9 h-9 rounded-lg flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Gönder"
          >
            {streaming ? (
              <span
                className="w-3.5 h-3.5 border-2 rounded-full animate-spin"
                style={{ borderColor: "var(--accent-foreground)", borderTopColor: "transparent" }}
              />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
        <p className="text-xs mt-2 text-center" style={{ color: "var(--muted)" }}>
          Shift+Enter yeni satır · Enter gönder
        </p>
      </div>
    </div>
  );
}
