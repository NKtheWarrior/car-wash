import type { Metadata, Viewport } from "next";
import "./globals.css";
import { fontVars } from "./fonts";

export const metadata: Metadata = {
  title: "Car Wash",
  description: "Scan, pay and wash.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fontVars}>
      <body>
        <main className="shell">{children}</main>
      </body>
    </html>
  );
}
