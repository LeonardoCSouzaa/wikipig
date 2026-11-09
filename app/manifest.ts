import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "WikiPig — consulta veterinária",
    short_name: "WikiPig",
    description:
      "Base de consulta de medicina veterinária de suínos, disponível offline.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f1f4f2",
    theme_color: "#0d6253",
    lang: "pt-BR",
    categories: ["medical", "education", "reference"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
