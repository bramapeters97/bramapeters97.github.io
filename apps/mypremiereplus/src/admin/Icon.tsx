export default function Icon({
  name,
  size = 22,
}: {
  name: string;
  size?: number;
}) {
  const paths: Record<string, React.ReactNode> = {
    home: (
      <>
        <path d="m3 10 9-7 9 7" />
        <path d="M5 9v12h14V9M9 21v-8h6v8" />
      </>
    ),
    video: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="m10 8 6 4-6 4ZM6 4v16M18 4v16M3 9h3M3 15h3M18 9h3M18 15h3" />
      </>
    ),
    cinema: (
      <>
        <path d="M3 9h18v12H3zM3 9l-1-5 18-3 1 5-18 3M6 3l4 4M13 2l4 4m-7 7 5 3-5 3z" />
      </>
    ),
    collection: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),
    image: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="m3 17 6-7 5 5 3-3 4 5" />
        <circle cx="16" cy="7" r="1" />
      </>
    ),
    family: (
      <>
        <circle cx="9" cy="7" r="4" />
        <path d="M2 21v-3a7 7 0 0 1 14 0v3ZM17 4a4 4 0 0 1 0 8m1 3c3 0 4 3 4 6" />
      </>
    ),
    storage: (
      <>
        <ellipse cx="12" cy="5" rx="9" ry="4" />
        <path d="M3 5v14c0 5 18 5 18 0V5M3 12c0 5 18 5 18 0" />
      </>
    ),
    billing: (
      <>
        <rect x="2" y="4" width="20" height="16" rx="3" />
        <path d="M2 9h20M6 15h4M16 15h2" />
      </>
    ),
    settings: (
      <>
        <path d="m10 2-1 3-3 1-3-1-1 4 2 2v3l-2 2 2 4 3-1 2 1 1 3h4l1-3 3-1 3 1 1-4-2-2v-3l2-2-2-4-3 1-2-1-1-3z" />
        <circle cx="12" cy="12" r="4" />
      </>
    ),
    arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
    external: (
      <>
        <path d="M14 3h7v7m0-7L10 14M11 3H3v18h18v-8" />
      </>
    ),
    plus: <path d="M12 4v16M4 12h16" />,
    search: (
      <>
        <circle cx="10" cy="10" r="7" />
        <path d="m15 15 6 6" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 6v7l4 2" />
      </>
    ),
    edit: (
      <>
        <path d="m4 16 12-12 4 4L8 20l-5 1zM13 7l4 4" />
      </>
    ),
    tv: (
      <>
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M12 17v4M7 21h10" />
      </>
    ),
    play: <path d="m7 3 14 9-14 9Z" />,
    close: <path d="m5 5 14 14M5 19 19 5" />,
    check: <path d="m4 12 5 5L20 6" />,
    menu: <path d="M3 5h18M3 12h18M3 19h18" />,
    lock: (
      <>
        <rect x="5" y="10" width="14" height="12" rx="2" />
        <path d="M8 10V6a4 4 0 0 1 8 0v4M12 15v3" />
      </>
    ),
    upload: (
      <>
        <path d="M12 16V2m-5 5 5-5 5 5M3 15v7h18v-7" />
      </>
    ),
    star: <path d="m12 2 3 6 7 1-5 5 1 8-6-4-6 4 1-8-5-5 7-1Z" />,
    sparkles: (
      <>
        <path d="m10 2 2 6 6 2-6 2-2 6-2-6-6-2 6-2ZM20 13l1 3 3 1-3 1-1 3-1-3-3-1 3-1Z" />
      </>
    ),
    mobile: (
      <>
        <rect x="6" y="1" width="12" height="22" rx="2" />
        <path d="M10 4h4M11 20h2" />
      </>
    ),
    list: <path d="M8 5h13M8 12h13M8 19h13M3 5h1M3 12h1M3 19h1" />,
    heart: <path d="M12 21 3 12C-3 5 7-1 12 6c5-7 15-1 9 6Z" />,
    trash: (
      <>
        <path d="M3 6h18M9 6V2h6v4M5 6l1 16h12l1-16M9 10v8M15 10v8" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] || paths.image}
    </svg>
  );
}
