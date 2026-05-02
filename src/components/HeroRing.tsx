export function HeroRing({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 600 600"
      className={className}
      aria-hidden
    >
      <defs>
        {/* iridescent chrome rim — oil-slick rainbow */}
        <linearGradient id="iri" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFE7F1" />
          <stop offset="20%" stopColor="#B5E4FF" />
          <stop offset="40%" stopColor="#D7B3FF" />
          <stop offset="60%" stopColor="#FFB3D9" />
          <stop offset="80%" stopColor="#FFE9A8" />
          <stop offset="100%" stopColor="#B8FFE0" />
        </linearGradient>

        {/* main body — magenta gloss */}
        <radialGradient id="body" cx="38%" cy="32%" r="78%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
          <stop offset="18%" stopColor="#FFD3E6" />
          <stop offset="48%" stopColor="#F4338F" />
          <stop offset="78%" stopColor="#7E1F58" />
          <stop offset="100%" stopColor="#2A0A1E" />
        </radialGradient>

        {/* inner hole — deep plum */}
        <radialGradient id="hole" cx="50%" cy="55%" r="60%">
          <stop offset="0%" stopColor="#3B214F" />
          <stop offset="55%" stopColor="#5A3F8C" />
          <stop offset="100%" stopColor="#9A82C9" />
        </radialGradient>

        {/* pearl cabochon stone */}
        <radialGradient id="pearl" cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="25%" stopColor="#FFE3F0" />
          <stop offset="65%" stopColor="#FF8AC8" />
          <stop offset="100%" stopColor="#A6256B" />
        </radialGradient>

        {/* soft top sheen */}
        <linearGradient id="sheen" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>

        {/* halo aura */}
        <radialGradient id="halo" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFB3D9" stopOpacity="0.7" />
          <stop offset="55%" stopColor="#D7B3FF" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#D7B3FF" stopOpacity="0" />
        </radialGradient>

        {/* coiled cord stroke pattern */}
        <linearGradient id="cord" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#3B0F2A" />
          <stop offset="50%" stopColor="#F4338F" />
          <stop offset="100%" stopColor="#3B0F2A" />
        </linearGradient>

        <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
        <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
      </defs>

      {/* halo */}
      <circle cx="300" cy="320" r="280" fill="url(#halo)" filter="url(#glow)" />

      {/* iridescent rim ring (slightly behind body for chromatic edge) */}
      <ellipse cx="300" cy="320" rx="252" ry="240" fill="url(#iri)" />

      {/* main body */}
      <ellipse cx="300" cy="320" rx="240" ry="228" fill="url(#body)" />

      {/* coiled phone cord wrapping the lower half — twin spirals */}
      <g
        fill="none"
        stroke="url(#cord)"
        strokeWidth="9"
        strokeLinecap="round"
        opacity="0.85"
      >
        <path d="M120 360 q30 30 60 0 t60 0 t60 0 t60 0 t60 0 t60 0" />
        <path
          d="M120 388 q30 30 60 0 t60 0 t60 0 t60 0 t60 0 t60 0"
          opacity="0.55"
        />
      </g>

      {/* inner hole */}
      <ellipse cx="300" cy="335" rx="118" ry="106" fill="url(#hole)" />

      {/* inner-hole inner shadow */}
      <ellipse
        cx="300"
        cy="370"
        rx="100"
        ry="70"
        fill="#2A0A1E"
        opacity="0.45"
        filter="url(#soft)"
      />

      {/* top sheen — long horizontal */}
      <ellipse
        cx="260"
        cy="160"
        rx="170"
        ry="42"
        fill="url(#sheen)"
        filter="url(#soft)"
      />

      {/* slim chrome highlight on bottom-right rim */}
      <path
        d="M460 360 a 180 170 0 0 1 -90 150"
        stroke="#FFFFFF"
        strokeOpacity="0.55"
        strokeWidth="6"
        fill="none"
        strokeLinecap="round"
      />

      {/* tiny channel gems flanking the stone */}
      {[-110, -75, 75, 110].map((dx) => (
        <g key={dx} transform={`translate(${300 + dx} 110)`}>
          <circle r="9" fill="url(#pearl)" />
          <circle r="3" cx="-2" cy="-3" fill="#FFFFFF" opacity="0.9" />
        </g>
      ))}

      {/* off-center pearl cabochon stone */}
      <g transform="translate(308 95)">
        <circle r="56" fill="url(#pearl)" />
        {/* main highlight */}
        <ellipse
          cx="-16"
          cy="-22"
          rx="20"
          ry="11"
          fill="#FFFFFF"
          opacity="0.85"
        />
        {/* sub highlight */}
        <circle cx="14" cy="18" r="7" fill="#FFFFFF" opacity="0.55" />
        {/* starburst sparkle */}
        <g stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" opacity="0.95">
          <line x1="-22" y1="-22" x2="-10" y2="-22" />
          <line x1="-16" y1="-28" x2="-16" y2="-16" />
        </g>
      </g>
    </svg>
  );
}
