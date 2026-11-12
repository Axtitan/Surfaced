/** Surfaced mark: a sun rising out of water. */
export function Logo({ className = "", withName = true }: { className?: string; withName?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 font-semibold tracking-tight ${className}`}>
      <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden>
        <rect width="32" height="32" rx="9" fill="currentColor" />
        <circle cx="16" cy="17" r="6.5" fill="#fff" />
        <rect x="0" y="18.5" width="32" height="13.5" fill="currentColor" />
        <path d="M7 22.2c3 0 3-1.6 6-1.6s3 1.6 6 1.6 3-1.6 6-1.6M10 26.4c2.4 0 2.4-1.3 4.8-1.3s2.4 1.3 4.8 1.3" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      </svg>
      {withName && <span className="text-[1.05rem]">Surfaced</span>}
    </span>
  );
}

export function ScoreRing({ score, size = 56 }: { score: number | null; size?: number }) {
  const deg = (score ?? 0) * 3.6;
  const tone = score == null ? "#c9cdd4" : score >= 60 ? "var(--color-good)" : score >= 25 ? "var(--color-warn)" : "var(--color-bad)";
  return (
    <div className="relative grid shrink-0 place-items-center rounded-full" style={{ width: size, height: size, background: `conic-gradient(${tone} ${deg}deg, #eceef1 0)` }}
      role="img" aria-label={score == null ? "No score yet" : `Score ${score} out of 100`}>
      <div className="grid place-items-center rounded-full bg-white font-semibold" style={{ width: size - 10, height: size - 10, fontSize: size / 3.6 }}>
        {score ?? "–"}
      </div>
    </div>
  );
}
