import React from "react";
import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader, SiteFooter } from "@/components/site-layout";

export const metadata: Metadata = {
  title: "OpenGameHub — Universal Open-Source Browser Game Platform",
  description:
    "Discover, play, and contribute open-source browser games built with Three.js, Phaser, PixiJS, Babylon.js, PlayCanvas, React, Vue, Svelte, and Vanilla HTML5. One game = one folder inside /games."
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="flex min-h-screen flex-col antialiased">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
