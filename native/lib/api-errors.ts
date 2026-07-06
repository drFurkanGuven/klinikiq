import axios from "axios";

export function getApiErrorMessage(
  error: unknown,
  fallback = "Bir hata oluştu."
): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === "string" && detail.trim()) return detail;
    if (Array.isArray(detail)) {
      const msg = detail
        .map((item) =>
          typeof item === "object" && item && "msg" in item
            ? String((item as { msg?: string }).msg)
            : String(item)
        )
        .filter(Boolean)
        .join(" ");
      if (msg) return msg;
    }
    if (error.code === "ECONNABORTED") {
      return "İstek zaman aşımına uğradı. Lütfen tekrar deneyin.";
    }
    if (!error.response) {
      return "İnternet bağlantınızı kontrol edin ve tekrar deneyin.";
    }
    if (error.response.status >= 500) {
      return "Sunucu hatası. Lütfen daha sonra tekrar deneyin.";
    }
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
}

export async function checkApiReachable(baseUrl: string): Promise<boolean> {
  const origin = baseUrl.replace(/\/api\/?$/, "");
  try {
    const res = await fetch(`${origin}/health`, {
      method: "GET",
      signal: AbortSignal.timeout(8000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
