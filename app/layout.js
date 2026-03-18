import "./globals.css";

export const metadata = {
  title: "AIoT FaceAI",
  description: "YoloHome ",
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}