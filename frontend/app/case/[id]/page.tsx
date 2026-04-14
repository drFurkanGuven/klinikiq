import CasePageContent from "./CaseContent";

export function generateStaticParams() {
  return [{ id: "static" }];
}

export default function Page() {
  return <CasePageContent />;
}
