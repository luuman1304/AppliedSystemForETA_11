import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RouteGuard · Bảng điều hành trạm",
  description: "Ưu tiên trạm cần kiểm tra, theo dõi và hành động trước khi cập nhật mô hình định tuyến.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className="antialiased">{children}</body>
    </html>
  );
}
