import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MedWira AI - Medicine Assistant",
  description: "AI-powered medicine identification and chat assistant with SEA language support",
  keywords: "medicine identification, AI chat, pill scanner, Southeast Asia, pharmacy, drug identification, conversational AI",
  authors: [{ name: "MedWira AI Team" }],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "MedWira AI",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#00A3B5",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#00A3B5" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="MedWira AI" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        
        {/* Screenshot and media capture permissions */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="msapplication-tap-highlight" content="no" />
        
        {/* Allow screenshots and screen recording */}
        <meta name="screen-capture" content="allowed" />
        <meta name="screenshot" content="allowed" />
        
        {/* Prevent screenshot blocking */}
        <style dangerouslySetInnerHTML={{
          __html: `
            * {
              -webkit-user-select: text !important;
              -moz-user-select: text !important;
              -ms-user-select: text !important;
              user-select: text !important;
            }
            
            /* Ensure content is screenshot-friendly */
            body, html {
              -webkit-touch-callout: default !important;
              -webkit-user-select: text !important;
              -khtml-user-select: text !important;
              -moz-user-select: text !important;
              -ms-user-select: text !important;
              user-select: text !important;
            }
            
            /* Remove any screenshot blocking styles */
            .no-screenshot, .no-capture, .screenshot-blocked {
              display: none !important;
            }
          `
        }} />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(registration) {
                      console.log('SW registered: ', registration);
                    })
                    .catch(function(registrationError) {
                      console.log('SW registration failed: ', registrationError);
                    });
                });
              }
            `,
          }}
        />
      </head>
      <body
        className={`${inter.variable} antialiased`}
      >
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
