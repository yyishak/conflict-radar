import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { InitialLoader } from "@/components/InitialLoader";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Conflict Radar - Unified Intelligence Dashboard",
  description: "Zeldit Conflict and Hazard Intelligence for Ethiopia",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const originalError = console.error;
                const originalWarn = console.warn;
                const silence = (...args) => {
                  if (args[0] && typeof args[0] === 'string' && (args[0].includes('MetaMask') || args[0].includes('inpage.js'))) {
                    return true;
                  }
                  return false;
                };
                console.error = (...args) => { if (silence(...args)) return; originalError.apply(console, args); };
                console.warn = (...args) => { if (silence(...args)) return; originalWarn.apply(console, args); };
                window.addEventListener('error', (e) => {
                  if (e.message && (e.message.includes('MetaMask') || e.filename.includes('inpage.js'))) {
                    e.stopImmediatePropagation();
                  }
                }, true);
              })();
            `
          }}
        />
      </head>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans selection:bg-radar-red selection:text-white antialiased`}
      >
        <ThemeProvider>
          <InitialLoader>{children}</InitialLoader>
        </ThemeProvider>
      </body>
    </html>
  );
}
