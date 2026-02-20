import type { Metadata } from "next";
import { Geist, Geist_Mono, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Web3Provider } from "@/config/Web3Provider";
import Header from "@/components/Header";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-sans",
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DARX - Crypto Dark Pool",
  description:
    "Private Trading, Powered by Zero-Knowledge Proofs. Trade any token in size with zero price impact with crypto's first decentralized crossing network. Live today on Arbitrum Ecosystem.",
  openGraph: {
    title: "DARX - Crypto Dark Pool",
    description:
      "Private Trading, Powered by Zero-Knowledge Proofs. Trade any token in size with zero price impact with crypto's first decentralized crossing network. Live today on Arbitrum Ecosystem.",
    url: "https://www.darxcrypto.xyz",
    type: "website",
    images: [
      {
        url: "https://tovxnutbetroznalrzzp.supabase.co/storage/v1/object/public/media/logo2.png", // URL gambar untuk Open Graph
        alt: "DARX - Crypto Dark Pool",
        width: 1200,
        height: 630,
      },
    ],
  },
  authors: [
    {
      name: "Zaky Irsyad Rais",
      url: "https://www.darxcrypto.xyz",
    },
  ],

  keywords:
    "crypto payment gateway, web3, blockchain, cryptocurrency, payment gateway, crypto payment, crypto payment gateway, web3 payment gateway, blockchain payment gateway, cryptocurrency payment gateway, crypto payment gateway, web3 payment gateway, blockchain payment gateway, cryptocurrency payment gateway",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={jetbrainsMono.variable}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Web3Provider>
          <Header />
          {children}
        </Web3Provider>
      </body>
    </html >
  );
}
