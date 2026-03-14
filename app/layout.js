import "./globals.css";

export const metadata = {
  title: "AIoT FaceAI Dashboard",
  description: "YoloHome Smart Door Dashboard",
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}