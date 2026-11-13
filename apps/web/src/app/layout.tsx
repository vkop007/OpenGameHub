import React from "react";
import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader, SiteFooter } from "@/components/site-layout";

export const metadata: Metadata = {
  title: "OpenGameHub — Universal Open-Source Browser Gaming Platform",
  description:
    "Discover, play, and contribute open-source browser games built with Three.js, Phaser, PixiJS, Babylon.js, PlayCanvas, React, Vue, Svelte, and Vanilla HTML5. One game = one folder inside /games."
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-surface-base text-slate-100 min-h-screen font-sans antialiased relative overflow-x-hidden flex flex-col">
        <SiteHeader />
        <main className="relative z-10 flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
