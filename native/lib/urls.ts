/** Web app origin (Next.js frontend). */
export const WEB_ORIGIN =
  process.env.EXPO_PUBLIC_WEB_URL ?? "https://klinikiq.furkanguven.space";

export const PRIVACY_URL = `${WEB_ORIGIN}/privacy`;
export const TERMS_URL = `${WEB_ORIGIN}/terms`;
export const SUPPORT_URL = `${WEB_ORIGIN}/destek`;
export const DELETE_ACCOUNT_URL = `${WEB_ORIGIN}/delete-account`;
