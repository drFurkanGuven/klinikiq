import ReportPageContent from "./ReportContent";

export function generateStaticParams() {
  return [{ id: "static" }];
}

export default function Page() {
  return <ReportPageContent />;
}
