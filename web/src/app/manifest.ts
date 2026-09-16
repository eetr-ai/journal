import type { MetadataRoute } from "next";
import { BACKGROUND_LIGHT } from "@/theme/config";

/**
 * What an installed copy of the app is.
 *
 * `start_url` carries no locale on purpose: a bare path is redirected to one
 * from the cookie, so the installed app follows the language that was chosen
 * rather than freezing in whichever was current at install.
 *
 * There is no service worker and no offline entry here. The app is a
 * conversation with an agent, so a cached shell would have nothing to say.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Eetr Journal",
    short_name: "Journal",
    description: "A quiet place to think out loud.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: BACKGROUND_LIGHT,
    theme_color: BACKGROUND_LIGHT,
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
