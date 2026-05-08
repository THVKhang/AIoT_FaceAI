import "./globals.css";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata = {
  title: "YoloHome — Smart AIoT Dashboard",
  description:
    "YoloHome FaceAI — Hệ thống giám sát IoT thông minh với nhận diện khuôn mặt AI, điều khiển thiết bị từ xa, và phân tích dữ liệu thời gian thực.",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi" className={inter.variable}>
      <body>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}