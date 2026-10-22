// Shared Terminal Ember fonts for the whole app: Funnel Display (headings),
// DM Sans (body), IBM Plex Mono (labels / buttons / numbers). Exposed as CSS
// variables and applied on <body> so both globals.css (customer) and admin.css
// can reference them.

import { Funnel_Display, DM_Sans, IBM_Plex_Mono } from "next/font/google";

const display = Funnel_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--cw-font-display",
  display: "swap",
});

const sans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--cw-font-sans",
  display: "swap",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--cw-font-mono",
  display: "swap",
});

/** Class string that wires the three font CSS variables onto an element. */
export const fontVars = `${display.variable} ${sans.variable} ${mono.variable}`;
