/** Abstract activity art, never a photograph of a venue or a claim about conditions. */
export default function SportArtwork({ sport }: { sport: string }) {
  const court = /tennis|padel|badminton|volley|basket|football|soccer/i.test(sport);
  const climb = /climb|boulder|hik/i.test(sport);
  return <svg viewBox="0 0 600 460" fill="none" aria-hidden="true" focusable="false">
    {court ? <g stroke="currentColor" strokeWidth="3">
      <path d="M100 65H500V395H100Z M140 65V395 M460 65V395 M100 230H500 M140 145H460 M140 315H460 M300 145V315" />
      <circle cx="408" cy="161" r="56" fill="currentColor" stroke="none" />
      <path d="M372 117C415 151 403 186 437 209" stroke="var(--poster-color)" strokeWidth="3" />
      <path d="M200 310L295 214 M175 310L270 214 M150 310L245 214" opacity=".5" />
    </g> : climb ? <g stroke="currentColor" strokeWidth="3">
      <path d="M-30 440L210 75L365 310L430 190L650 460 M-20 460L210 120L365 355L430 235L610 460 M40 460L210 165L365 400L430 280L570 460" />
      <circle cx="431" cy="95" r="48" fill="currentColor" stroke="none" />
    </g> : <g stroke="currentColor" strokeWidth="3" transform="rotate(-28 300 230)">
      {[0, 1, 2, 3, 4].map((n) => <rect key={n} x={55 + n * 23} y={50 + n * 23} width={490 - n * 46} height={360 - n * 46} rx={180 - n * 23} />)}
      <circle cx="435" cy="132" r="54" fill="currentColor" stroke="none" />
    </g>}
  </svg>;
}
