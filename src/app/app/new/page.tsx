import type { Metadata } from "next";
import { Suspense } from "react";
import NewCheck from "@/components/NewCheck";

export const metadata: Metadata = { title: "New check" };

export default function Page() {
  return <Suspense><NewCheck /></Suspense>;
}
