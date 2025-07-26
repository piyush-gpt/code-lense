import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Code Lense ",
  description: "Code Lens",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
