import { Suspense } from "react";
import MapDetail from "./MapDetail";

// Statik export (output: 'export') için bilinen harita id'leri.
// Yeni curated harita eklenince buraya id'sini de ekleyin.
export function generateStaticParams() {
  return [{ id: "autonomic_ns" }];
}

export const dynamicParams = false;

export default function Page({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={null}>
      <MapDetail id={params.id} />
    </Suspense>
  );
}
