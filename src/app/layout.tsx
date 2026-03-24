import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/providers/ToastProvider";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "EverPet — 우리 아이를 다시 만나보세요",
  description: "단 한 장의 사진으로 소중한 반려동물과 다시 만나는 AI 추모 영상 서비스",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        {children}
        <ToastProvider />
      </body>
    </html>
  );
}
