import type { Metadata } from "next";
import ProjectViewClient from "@/components/ProjectViewClient";

export const metadata: Metadata = { title: "Check" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProjectViewClient id={decodeURIComponent(id)} />;
}
