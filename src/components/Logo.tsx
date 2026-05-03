export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <svg
        viewBox="0 0 48 48"
        className="size-9 shrink-0"
        aria-label="ring"
        role="img"
      >
        <defs>
          <linearGradient id="lg-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#3D6BFF" />
            <stop offset="100%" stopColor="#6CF0FF" />
          </linearGradient>
        </defs>

        <path
          d="
            M 27 13.3
            A 14 14 0 1 1 21 13.3
            C 18 11, 17.5 7, 20 5.5
            C 22 4.5, 23.5 6, 24 7.5
            C 24.5 6, 26 4.5, 28 5.5
            C 30.5 7, 30 11, 27 13.3
            Z
          "
          fill="none"
          stroke="url(#lg-grad)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="font-display font-bold tracking-tight text-2xl leading-none text-white">
        ring
      </span>
    </div>
  );
}
