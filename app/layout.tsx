import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Fila Bar — pedidos sem fila",
  description: "Menu e pedidos para eventos e bares",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt" className={outfit.variable}>
      <body
        className={`${outfit.className} min-h-screen bg-[#07090d] antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
