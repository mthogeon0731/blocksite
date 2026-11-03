import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // cacheComponents는 끈다: 공개 페이지·편집기가 매 요청 DB를 읽어야 한다 (SPEC 5.2).
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
