import { Redirect } from "expo-router";

/** Eski /ogren stack girişi — Öğren artık alt sekme. */
export default function OgrenIndexRedirect() {
  return <Redirect href="/(tabs)/ogren" />;
}
