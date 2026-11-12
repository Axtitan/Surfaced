/* Skeleton while an app page loads (§16.2: skeletons, not spinners, for content). */
export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-8 sm:pt-12" aria-busy="true" aria-label="Loading">
      <div className="h-10 w-56 animate-pulse rounded-lg bg-[#eceef1]" />
      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => <div key={i} className="card h-24 animate-pulse bg-[#f4f5f7]" />)}
      </div>
    </div>
  );
}
