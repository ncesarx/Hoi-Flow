import type { Metadata } from "next";

import "./globals.css";

import { platformBrand } from "@/lib/platform/brand";

export const metadata: Metadata = {
  title: {
    default: platformBrand.name,
    template: `%s | ${platformBrand.name}`,
  },

  description:
    platformBrand.description,

  applicationName:
    platformBrand.name,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
