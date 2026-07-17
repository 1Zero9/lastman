import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Last Man Standing",
    short_name: "Last Man",
    description: "A fundraising Last Man Standing competition.",
    start_url: "/",
    display: "standalone",
    background_color: "#0D1B2A",
    theme_color: "#0D1B2A",
    orientation: "portrait",
    icons: [
      { src: "/lms-logo.png", sizes: "1254x1254", type: "image/png", purpose: "any" },
      { src: "/lms-logo.png", sizes: "1254x1254", type: "image/png", purpose: "maskable" },
    ],
  };
}
