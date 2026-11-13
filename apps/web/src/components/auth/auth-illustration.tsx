export function AuthIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 480 640"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      role="img"
      aria-label="Illustration of a campus works officer repairing a sparking electrical pillar outside a campus building"
    >
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--sand)" />
          <stop offset="1" stopColor="var(--bg)" />
        </linearGradient>
      </defs>

      <rect width="480" height="640" fill="url(#sky)" />

      <g stroke="var(--fg)" strokeWidth="3" strokeLinecap="round">
        <line x1="386" y1="34" x2="386" y2="18" transform="rotate(0 386 92)" />
        <line x1="386" y1="34" x2="386" y2="18" transform="rotate(45 386 92)" />
        <line x1="386" y1="34" x2="386" y2="18" transform="rotate(90 386 92)" />
        <line x1="386" y1="34" x2="386" y2="18" transform="rotate(135 386 92)" />
        <line x1="386" y1="34" x2="386" y2="18" transform="rotate(180 386 92)" />
        <line x1="386" y1="34" x2="386" y2="18" transform="rotate(225 386 92)" />
        <line x1="386" y1="34" x2="386" y2="18" transform="rotate(270 386 92)" />
        <line x1="386" y1="34" x2="386" y2="18" transform="rotate(315 386 92)" />
      </g>
      <circle cx="386" cy="92" r="38" fill="var(--accent)" stroke="var(--fg)" strokeWidth="3" />

      <path d="M96 82 Q94 66 110 65 Q113 49 132 50 Q145 51 148 63 Q166 64 164 79 Q163 87 153 87 L104 87 Q96 87 96 82 Z" fill="var(--card)" stroke="var(--fg)" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M232 132 Q230 121 242 120 Q244 109 257 110 Q266 111 268 119 Q280 120 279 131 Q278 136 271 136 L240 136 Q232 136 232 132 Z" fill="var(--card)" stroke="var(--fg)" strokeWidth="2" strokeLinejoin="round" opacity="0.95" />
      <path d="M404 190 Q402 182 410 181 Q412 173 422 174 Q428 175 429 181 Q437 182 436 189 Q436 192 431 192 L408 192 Q404 192 404 190 Z" fill="var(--card)" stroke="var(--fg)" strokeWidth="1.6" strokeLinejoin="round" opacity="0.9" />

      <g stroke="var(--fg)" strokeWidth="2.2" fill="none" strokeLinecap="round">
        <path d="M120 148 Q127 141 134 148 Q141 141 148 148" />
        <path d="M176 104 Q182 99 188 104 Q194 99 200 104" />
      </g>

      <path d="M0 520 V470 H20 V446 H40 V482 H52 V520 Z" fill="var(--sand-deep)" />
      <path d="M232 520 V448 H258 V428 H282 V458 H306 V520 Z" fill="var(--sand-deep)" />

      <rect x="0" y="520" width="480" height="120" fill="var(--bg-2)" />
      <line x1="0" y1="520" x2="480" y2="520" stroke="var(--fg)" strokeWidth="3" />

      <path d="M240 352 C 264 428 278 416 301 422" fill="none" stroke="var(--fg)" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="0.1 8" opacity="0.85" />

      <g strokeLinejoin="round">
        <rect x="30" y="508" width="224" height="14" rx="2" fill="var(--sand-deep)" stroke="var(--fg)" strokeWidth="3" />
        <rect x="44" y="300" width="196" height="210" fill="var(--card)" stroke="var(--fg)" strokeWidth="3" />
        <path d="M28 302 L142 218 L256 302 Z" fill="var(--sand)" stroke="var(--fg)" strokeWidth="3" />
        <rect x="28" y="302" width="228" height="16" fill="var(--bg-2)" stroke="var(--fg)" strokeWidth="3" />

        <line x1="142" y1="218" x2="142" y2="172" stroke="var(--fg)" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M143 174 L181 181.5 L143 190 Z" fill="var(--accent)" stroke="var(--fg)" strokeWidth="2" />

        <circle cx="142" cy="281" r="10.5" fill="var(--bg)" stroke="var(--fg)" strokeWidth="2.5" />
        <path d="M142 281 V274.5 M142 281 L147.5 284" stroke="var(--fg)" strokeWidth="2" strokeLinecap="round" />

        <path d="M110 510 V446 A32 30 0 0 1 174 446 V510 Z" fill="var(--bg-2)" stroke="var(--fg)" strokeWidth="3" />
        <path d="M123 510 V453 A19 18 0 0 1 161 453 V510" fill="none" stroke="var(--fg)" strokeWidth="2" opacity="0.7" />
        <circle cx="158" cy="484" r="2.4" fill="var(--fg)" />

        <path d="M60 446 V402 A20 19 0 0 1 100 402 V446 Z" fill="var(--blue-soft)" stroke="var(--fg)" strokeWidth="2.5" />
        <path d="M80 385 V446 M60 421 H100" stroke="var(--fg)" strokeWidth="2" opacity="0.75" />
        <path d="M184 446 V402 A20 19 0 0 1 224 402 V446 Z" fill="var(--blue-soft)" stroke="var(--fg)" strokeWidth="2.5" />
        <path d="M204 385 V446 M184 421 H224" stroke="var(--fg)" strokeWidth="2" opacity="0.75" />
      </g>

      <g strokeLinejoin="round">
        <rect x="290" y="394" width="74" height="13" rx="6" fill="var(--sand-deep)" stroke="var(--fg)" strokeWidth="3" />
        <rect x="298" y="404" width="58" height="116" rx="10" fill="var(--card)" stroke="var(--fg)" strokeWidth="3" />
        <rect x="308" y="434" width="38" height="66" rx="6" fill="var(--cta)" stroke="var(--fg)" strokeWidth="2.5" />
        <path d="M330 444 L320 470 H330 L322 492 L342 462 H332 L340 444 Z" fill="var(--card)" stroke="var(--fg)" strokeWidth="2" />
      </g>

      <g stroke="var(--accent)" strokeWidth="4.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M342 388 L322 356 L338 352 L318 322" />
        <path d="M358 386 L364 348 L350 344 L352 314" />
      </g>
      <g stroke="var(--accent)" strokeWidth="3.5" strokeLinecap="round">
        <line x1="306" y1="352" x2="292" y2="340" />
        <line x1="318" y1="322" x2="312" y2="304" />
        <line x1="352" y1="314" x2="352" y2="294" />
        <line x1="392" y1="330" x2="400" y2="314" />
        <line x1="372" y1="352" x2="388" y2="342" />
      </g>
      <g stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round">
        <path d="M292 380 L300 380 M296 376 L296 384" />
        <path d="M368 322 L376 322 M372 318 L372 326" />
      </g>

      <g strokeLinejoin="round">
        <rect x="232" y="492" width="74" height="28" rx="5" fill="var(--accent)" stroke="var(--fg)" strokeWidth="2.5" />
        <line x1="232" y1="504" x2="306" y2="504" stroke="var(--fg)" strokeWidth="2" />
        <path d="M252 492 A17 11 0 0 1 288 492" fill="none" stroke="var(--fg)" strokeWidth="2.5" />
        <rect x="261" y="500" width="10" height="6" fill="var(--card)" stroke="var(--fg)" strokeWidth="1.5" />
      </g>

      <g strokeLinejoin="round">
        <path d="M394 452 H434 L438 520 H420 L414 484 L406 520 H388 Z" fill="var(--sand-deep)" stroke="var(--fg)" strokeWidth="2.5" />
        <rect x="382" y="512" width="24" height="9" rx="4" fill="var(--fg)" />
        <rect x="416" y="512" width="24" height="9" rx="4" fill="var(--fg)" />

        <path d="M388 452 L392 382 Q414 374 436 382 L440 452 Z" fill="var(--blue-soft)" stroke="var(--fg)" strokeWidth="2.5" />
        <line x1="390" y1="409" x2="438" y2="409" stroke="var(--fg)" strokeWidth="2.5" opacity="0.6" />
        <line x1="389" y1="429" x2="439" y2="429" stroke="var(--fg)" strokeWidth="2.5" opacity="0.6" />

        <path d="M438 392 L452 440 L441 445 L428 398 Z" fill="var(--blue-soft)" stroke="var(--fg)" strokeWidth="2.5" />
        <circle cx="447" cy="445" r="5.5" fill="var(--bg)" stroke="var(--fg)" strokeWidth="2" />

        <path d="M394 392 L352 414 L356 428 L398 405 Z" fill="var(--blue-soft)" stroke="var(--fg)" strokeWidth="2.5" />
        <circle cx="350" cy="421" r="6.5" fill="var(--card)" stroke="var(--fg)" strokeWidth="2.5" />
        <line x1="346" y1="425" x2="328" y2="436" stroke="var(--fg)" strokeWidth="3.5" strokeLinecap="round" />
        <line x1="352" y1="418" x2="361" y2="411" stroke="var(--cta)" strokeWidth="5" strokeLinecap="round" />

        <circle cx="414" cy="356" r="12.5" fill="var(--bg)" stroke="var(--fg)" strokeWidth="2.5" />
        <path d="M398 352 A16.5 13 0 0 1 430 352 Z" fill="var(--accent)" stroke="var(--fg)" strokeWidth="2.5" />
        <line x1="395" y1="352" x2="433" y2="352" stroke="var(--fg)" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="408.5" cy="357" r="1.5" fill="var(--fg)" />
        <circle cx="420.5" cy="357" r="1.5" fill="var(--fg)" />
        <path d="M408 364 Q414 368.5 421 364" stroke="var(--fg)" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      </g>

      <g stroke="var(--fg)" strokeWidth="2" fill="none" strokeLinecap="round">
        <path d="M58 566 C 57 560 55 557 52 553 M58 566 C 58 559 59 556 58 551 M58 566 C 60 560 62 557 65 553" />
        <path d="M108 596 C 107 590 105 587 102 583 M108 596 C 108 589 109 586 108 581 M108 596 C 110 590 112 587 115 583" />
        <path d="M172 576 C 171 570 169 567 166 563 M172 576 C 172 569 173 566 172 561 M172 576 C 174 570 176 567 179 563" />
        <path d="M262 592 C 261 586 259 583 256 579 M262 592 C 262 585 263 582 262 577 M262 592 C 264 586 266 583 269 579" />
        <path d="M378 566 C 377 560 375 557 372 553 M378 566 C 378 559 379 556 378 551 M378 566 C 380 560 382 557 385 553" />
        <path d="M452 600 C 451 594 449 591 446 587 M452 600 C 452 593 453 590 452 585 M452 600 C 454 594 456 591 459 587" />
      </g>
      <g stroke="var(--fg)" strokeWidth="2" fill="none" opacity="0.8">
        <ellipse cx="138" cy="604" rx="5" ry="2.4" />
        <ellipse cx="316" cy="614" rx="6" ry="2.6" />
        <ellipse cx="430" cy="586" rx="4" ry="2" />
      </g>
    </svg>
  );
}
