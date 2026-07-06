import { BASE_URL } from "./api";

export type SessionMessageStreamHandlers = {
  onChunk: (text: string) => void;
  onComplete: () => void;
  onError: (message: string) => void;
};

/**
 * POST /sessions/:id/message — SSE satırları (data: ...\\n).
 * RN'de fetch().body çoğu zaman null; XHR + responseText artımı kullanılır.
 */
export function streamSessionMessage(
  sessionId: string,
  token: string,
  content: string,
  handlers: SessionMessageStreamHandlers
): { abort: () => void } {
  const xhr = new XMLHttpRequest();
  let processedIndex = 0;
  let lineBuffer = "";
  let finished = false;
  let errored = false;
  let silentAbort = false;

  const completeOnce = () => {
    if (finished) return;
    finished = true;
    handlers.onComplete();
  };

  const handleLine = (line: string): boolean => {
    const trimmed = line.replace(/\r$/, "");
    if (!trimmed.startsWith("data: ")) return false;
    const payload = trimmed.slice(6).trim();
    if (payload === "[DONE]") {
      completeOnce();
      return true;
    }
    /** Backend: `data: {"content":"..."}` (sessions.py) — ham JSON stringini metne çevir */
    try {
      const parsed = JSON.parse(payload) as { content?: unknown };
      if (parsed && typeof parsed.content === "string") {
        handlers.onChunk(parsed.content);
        return false;
      }
    } catch {
      /* düz metin */
    }
    handlers.onChunk(payload);
    return false;
  };

  const pump = () => {
    if (finished || errored) return;
    const full = xhr.responseText;
    const chunk = full.slice(processedIndex);
    processedIndex = full.length;
    if (!chunk) return;
    lineBuffer += chunk;
    const parts = lineBuffer.split("\n");
    lineBuffer = parts.pop() ?? "";
    for (const p of parts) {
      if (handleLine(p)) return;
    }
  };

  const flushTail = () => {
    if (lineBuffer) {
      const line = lineBuffer;
      lineBuffer = "";
      handleLine(line);
    }
  };

  xhr.open(
    "POST",
    `${BASE_URL}/sessions/${encodeURIComponent(sessionId)}/message`
  );
  xhr.setRequestHeader("Content-Type", "application/json");
  xhr.setRequestHeader("Authorization", `Bearer ${token}`);
  xhr.timeout = 180_000;
  xhr.responseType = "text";

  xhr.onreadystatechange = () => {
    if (xhr.readyState === 3 || xhr.readyState === 4) {
      pump();
    }
  };

  xhr.onprogress = () => {
    pump();
  };

  xhr.onload = () => {
    if (errored) return;
    pump();
    flushTail();
    if (xhr.status < 200 || xhr.status >= 300) {
      if (!finished) {
        errored = true;
        handlers.onError(`HTTP ${xhr.status}`);
      }
      return;
    }
    if (!finished) {
      completeOnce();
    }
  };

  xhr.onerror = () => {
    if (finished || errored) return;
    errored = true;
    handlers.onError("Ağ hatası");
  };

  xhr.ontimeout = () => {
    if (finished || errored) return;
    errored = true;
    handlers.onError("Zaman aşımı");
  };

  xhr.onabort = () => {
    if (finished || errored) return;
    if (silentAbort) {
      completeOnce();
      return;
    }
    errored = true;
    handlers.onError("İptal edildi");
  };

  xhr.send(JSON.stringify({ content }));

  return {
    abort: () => {
      silentAbort = true;
      xhr.abort();
    },
  };
}
