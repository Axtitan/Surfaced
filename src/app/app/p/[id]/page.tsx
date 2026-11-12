import ProjectView from "@/components/ProjectView";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProjectView key={id} id={decodeURIComponent(id)} />;
}
