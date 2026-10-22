"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import "../admin.css";
import { fontVars } from "../_lib/fonts";
import { NAV, titleFor } from "../_lib/nav";
import { clearToken, getToken } from "../../../lib/admin";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    if (!getToken()) router.replace("/admin/login");
    else setAuthed(true);
  }, [router]);

  if (!authed) return null;

  function isActive(href: string) {
    return href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <div className={`cw-admin ${fontVars}`}>
      <div className="cw-shell">
        <aside className="cw-sidebar">
          <div className="cw-brand">
            <span>~/</span>
            <b>carwash</b>
            <span className="cw-cursor">_</span>
          </div>

          <div className="cw-nav-group">
            <span className="cw-eyebrow">console</span>
          </div>
          <nav className="cw-nav">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className={isActive(n.href) ? "active" : ""}>
                {n.icon}
                <span>{n.label}</span>
              </Link>
            ))}
          </nav>

          <div className="cw-sidebar__foot">owner console · v0.1</div>
        </aside>

        <div className="cw-main">
          <header className="cw-topbar">
            <h1>
              {titleFor(pathname)}
              <span className="cw-cursor">_</span>
            </h1>
            <div className="cw-topbar__right">
              <span className="cw-live">live</span>
              <button
                className="cw-btn cw-btn--outline cw-btn--sm"
                onClick={() => {
                  clearToken();
                  router.replace("/admin/login");
                }}
              >
                sign out
              </button>
            </div>
          </header>

          <div className="cw-content">{children}</div>
        </div>
      </div>
    </div>
  );
}
