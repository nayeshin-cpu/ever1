/** @type {import('next').NextConfig} */
const nextConfig = {
    // Vercel 배포 시 서버 전용 패키지가 클라이언트 번들에 포함되지 않도록 설정 (Next.js 14 문법)
    experimental: {
        serverComponentsExternalPackages: ["sharp"],
    },

    // 이미지 최적화 설정
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "*.r2.cloudflarestorage.com",
            },
            {
                protocol: "https",
                hostname: "*.cloudflare.com",
            },
        ],
    },

    // 빌드 시 ESLint 경고는 허용 (타입 오류는 여전히 차단)
    eslint: {
        ignoreDuringBuilds: false,
    },
};

export default nextConfig;
