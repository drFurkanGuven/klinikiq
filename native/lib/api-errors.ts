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
    if (error.response.status === 422) {
      return "E-posta veya şifre geçersiz. Lütfen her iki alanı da doldurun.";
    }
    if (error.response.status === 401) {
      return "Hatalı e-posta veya şifre.";
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

function createTimeoutSignal(ms: number): { signal: AbortSignal; cancel: () => void } {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ms);
  return {
    signal: controller.signal,
    cancel: () => clearTimeout(timeoutId),
  };
}

/** Sunucuya ulaşılabildi mi? (ağ yok / DNS / SSL hatası → false) */
export async function checkApiReachable(baseUrl: string): Promise<boolean> {
  const apiRoot = baseUrl.replace(/\/$/, "");
  const { signal, cancel } = createTimeoutSignal(8000);
  try {
    const res = await fetch(`${apiRoot}/auth/login`, {
      method: "GET",
      signal,
    });
    // 405 Method Not Allowed vb. — API yanıt veriyor demektir
    return res.status > 0;
  } catch {
    return false;
  } finally {
    cancel();
  }
}
