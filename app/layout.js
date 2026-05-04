import "./globals.css";

export const metadata = {
  title: "AIoT FaceAI",
  description: "YoloHome ",
};

import { Toaster } from 'sonner';

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <body>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}