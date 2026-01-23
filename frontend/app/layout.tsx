import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../styles/globals.css";
import Header from "../_components/layout/Header";
import Sidebar from "../_components/layout/Sidebar";
import { AuthProvider } from "../hooks/useAuth";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hamburger-Collection",
  description: "브랜드별 햄버거 메뉴와 영양정보를 한 곳에서 탐색하세요",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <div className="flex min-h-screen flex-col">
            <Header />
            <div className="flex flex-1">
              <main className="flex-1">{children}</main>
              <Sidebar />
            </div>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
