import type { Metadata } from "next";
import Dashboard from "@/components/Dashboard";

export const metadata: Metadata = { title: "Your checks" };

export default function Page() {
  return <Dashboard />;
}
