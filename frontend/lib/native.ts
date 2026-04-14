import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { Share } from "@capacitor/share";
import { Capacitor } from "@capacitor/core";

export const nativeClient = {
  // ── Haptics ────────────────────────────────────────────────────────────────
  impact: async (style: ImpactStyle = ImpactStyle.Medium) => {
    if (Capacitor.isNativePlatform()) {
      try { await Haptics.impact({ style }); } catch {}
    }
  },
  
  notification: async (type: NotificationType = NotificationType.Success) => {
    if (Capacitor.isNativePlatform()) {
      try { await Haptics.notification({ type }); } catch {}
    }
  },
  
  vibrate: async () => {
    if (Capacitor.isNativePlatform()) {
      try { await Haptics.vibrate(); } catch {}
    }
  },

  // ── Share ──────────────────────────────────────────────────────────────────
  share: async (options: { title: string; text: string; url?: string; dialogTitle?: string }) => {
    if (Capacitor.isNativePlatform()) {
      try {
        const canShare = await Share.canShare();
        if (canShare.value) {
          await Share.share(options);
        }
      } catch (err) {
        console.error("Paylaşım hatası:", err);
      }
    } else {
        // Web fallback (Clipboard or Web Share API)
        if (navigator.share) {
            try { await navigator.share(options); } catch {}
        } else {
            console.log("Web Paylaşım desteklenmiyor, URL kopyalanabilir.");
        }
    }
  }
};
