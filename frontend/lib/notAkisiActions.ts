import type { Dispatch, SetStateAction } from "react";
import { communityApi, type CommunityNoteItem } from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";

type RouterLike = { push: (href: string) => void };

export async function handleNoteLike(
  note: CommunityNoteItem,
  setNotes: Dispatch<SetStateAction<CommunityNoteItem[]>>,
  router: RouterLike,
  loginReturnPath: string
): Promise<void> {
  if (!isAuthenticated()) {
    router.push(`/login?next=${encodeURIComponent(loginReturnPath)}`);
    return;
  }
  if (note.is_mine) return;
  try {
    const r = await communityApi.toggleLike(note.id);
    setNotes((prev) =>
      prev.map((n) =>
        n.id === note.id
          ? { ...n, likes: r.data.likes, liked_by_me: r.data.liked }
          : n
      )
    );
  } catch {
    /* sessiz */
  }
}

export async function handleNoteSave(
  note: CommunityNoteItem,
  setNotes: Dispatch<SetStateAction<CommunityNoteItem[]>>,
  router: RouterLike,
  loginReturnPath: string,
  options?: { removeWhenUnsaved?: boolean }
): Promise<void> {
  if (!isAuthenticated()) {
    router.push(`/login?next=${encodeURIComponent(loginReturnPath)}`);
    return;
  }
  try {
    const r = await communityApi.toggleSave(note.id);
    setNotes((prev) => {
      if (options?.removeWhenUnsaved && !r.data.saved) {
        return prev.filter((n) => n.id !== note.id);
      }
      return prev.map((n) =>
        n.id === note.id ? { ...n, saved_by_me: r.data.saved } : n
      );
    });
  } catch {
    /* sessiz */
  }
}
