// Admin navigation model + inline line-icons (lucide-flavored, stroke=currentColor).
// Shared by the sidebar and the topbar title.

import type { ReactNode } from "react";

function Svg({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

const icons = {
  overview: (
    <Svg>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </Svg>
  ),
  live: (
    <Svg>
      <circle cx="12" cy="12" r="3" />
      <path d="M5.5 5.5a9 9 0 0 0 0 13M18.5 5.5a9 9 0 0 1 0 13M8 8a5 5 0 0 0 0 8M16 8a5 5 0 0 1 0 8" />
    </Svg>
  ),
  payments: (
    <Svg>
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <path d="M2.5 9.5h19" />
    </Svg>
  ),
  issues: (
    <Svg>
      <path d="M12 3 2.5 19.5h19L12 3Z" />
      <path d="M12 10v4" />
      <path d="M12 17.5h.01" />
    </Svg>
  ),
  plans: (
    <Svg>
      <path d="M4 7h16M4 12h16M4 17h10" />
    </Svg>
  ),
  insights: (
    <Svg>
      <path d="M4 20V4" />
      <path d="M4 20h16" />
      <path d="M8 16v-4M12.5 16V8M17 16v-6" />
    </Svg>
  ),
  devices: (
    <Svg>
      <rect x="7" y="2.5" width="10" height="19" rx="2.5" />
      <path d="M11 18.5h2" />
    </Svg>
  ),
  settings: (
    <Svg>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.5v3M12 18.5v3M21.5 12h-3M5.5 12h-3M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1M18.4 18.4l-2.1-2.1M7.7 7.7 5.6 5.6" />
    </Svg>
  ),
} as const;

export interface NavItem {
  href: string;
  label: string;
  title: string;
  icon: ReactNode;
}

export const NAV: NavItem[] = [
  { href: "/admin", label: "overview", title: "overview", icon: icons.overview },
  { href: "/admin/live", label: "live bays", title: "live bays", icon: icons.live },
  { href: "/admin/payments", label: "payments", title: "payments", icon: icons.payments },
  { href: "/admin/issues", label: "issues", title: "issues", icon: icons.issues },
  { href: "/admin/plans", label: "plans & prices", title: "plans & prices", icon: icons.plans },
  { href: "/admin/insights", label: "insights", title: "insights", icon: icons.insights },
  { href: "/admin/devices", label: "devices", title: "paired devices", icon: icons.devices },
  { href: "/admin/settings", label: "settings", title: "settings", icon: icons.settings },
];

/** Longest-prefix match so nested routes still highlight their nav item. */
export function titleFor(pathname: string): string {
  const match = [...NAV]
    .filter((n) => pathname === n.href || pathname.startsWith(n.href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0];
  return match?.title ?? "overview";
}
