import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PersonaMotion Web | AI Video Synthesis & Character Retargeting",
  description:
    "Production-ready cloud-native studio for character-consistent video diffusion and SAM2/LivePortrait motion retargeting.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-zinc-950 text-zinc-100 antialiased selection:bg-violet-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
