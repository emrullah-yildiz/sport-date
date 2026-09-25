import type { Metadata } from "next";
import { notFound } from "next/navigation";
import WebsitePreview from "@/components/website-preview/WebsitePreview";

export const metadata: Metadata = {
  title: "KeepItUp — full website preview",
  description: "Local fictional preview of the complete Play Map website journey.",
  robots: { index: false, follow: false },
};
export default function PreviewPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <WebsitePreview />;
}
