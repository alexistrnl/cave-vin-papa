"use client";

import { useEffect } from "react";

export default function PWALinks() {
  useEffect(() => {
    // Ajouter le lien manifest s'il n'existe pas déjà
    if (!document.querySelector('link[rel="manifest"]')) {
      const link = document.createElement("link");
      link.rel = "manifest";
      link.href = "/manifest.webmanifest";
      document.head.appendChild(link);
    }

    // Ajouter meta theme-color s'il n'existe pas déjà (sera généralement défini par viewport export)
    if (!document.querySelector('meta[name="theme-color"]')) {
      const meta = document.createElement("meta");
      meta.name = "theme-color";
      meta.content = "#d4af37";
      document.head.appendChild(meta);
    }

    // Ajouter apple-touch-icon s'il n'existe pas déjà
    if (!document.querySelector('link[rel="apple-touch-icon"]')) {
      const appleIcon = document.createElement("link");
      appleIcon.rel = "apple-touch-icon";
      appleIcon.href = "/icon-192.png";
      document.head.appendChild(appleIcon);
    }
  }, []);

  return null;
}

