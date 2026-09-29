import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ECWC · Weekly Project Reports",
  description: "Ethiopian Construction Works Corporation (ECWC) — Track weekly project progress, planned vs actual metrics, and department updates.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png" },
      { url: "/ecwc-logo.png", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <body>
        <div className="bg-orbs" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}
