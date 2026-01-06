import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "../src/components/Providers";

export const metadata: Metadata = {
  title: "Collabry - AI Collaborative Study Platform",
  description: "Study smarter together with AI-powered collaboration",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700&family=Fredoka:wght@400;500;600;700&family=Caveat:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
