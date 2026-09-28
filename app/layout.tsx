import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ECWC · Weekly Project Reports",
  description: "Ethiopian Construction Works Corporation (ECWC) — Track weekly project progress, planned vs actual metrics, and department updates.",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
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
