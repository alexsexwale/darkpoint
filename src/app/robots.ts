import { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://darkpoint.co.za";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          // Account and auth pages
          "/account/",
          "/auth/",
          "/forgot-password/",
          "/reset-password/",
          // Checkout and cart
          "/checkout/",
          "/cart/",
          // Private pages
          "/wishlist/",
          "/rewards/",
          "/return-request/",
          "/track-order/",
          "/unsubscribe/",
          // API routes
          "/api/",
          // Admin/secret pages
          "/(secret)/",
          // Emulator pages (may have special content)
          "/(emulator)/",
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}

