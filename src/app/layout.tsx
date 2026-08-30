import type { Metadata } from "next";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";
import { Toaster } from "react-hot-toast";
import Script from "next/script";
import KeepAlive from "@/components/KeepAlive";
import CallProvider from "@/components/CallProvider";
import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: {
    default: "CampusConnect - KIIT University",
    template: "%s | CampusConnect",
  },
  description: "The private social network for KIIT University students. Connect with your campus community. Share posts, join groups, chat with friends, and stay updated on campus events.",
  keywords: ["KIIT", "campus", "social network", "university", "students", "college", "Bhubaneswar", "education", "student community"],
  authors: [{ name: "CampusConnect" }],
  creator: "CampusConnect",
  metadataBase: new URL("https://campusconnect-osm1.onrender.com"),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://campusconnect-osm1.onrender.com",
    siteName: "CampusConnect",
    title: "CampusConnect - KIIT University",
    description: "The private social network for KIIT University students. Connect with your campus community.",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "CampusConnect - KIIT University",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CampusConnect - KIIT University",
    description: "The private social network for KIIT University students. Connect with your campus community.",
    images: ["/og-image.svg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <Script
          id="json-ld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "CampusConnect",
              url: "https://campusconnect-osm1.onrender.com",
              description: "The private social network for KIIT University students.",
              applicationCategory: "SocialNetworkingApplication",
              operatingSystem: "Web",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
              },
              author: {
                "@type": "Organization",
                name: "CampusConnect",
                url: "https://campusconnect-osm1.onrender.com",
              },
            }),
          }}
        />
      </head>
      <body className="bg-white dark:bg-dark-900 text-gray-900 dark:text-white">
        <ThemeProvider>
          <KeepAlive />
          <AuthProvider>
            <CallProvider>
            <Toaster
              position="top-right"
              toastOptions={{
                style: {
                  background: '#1a1a1a',
                  color: '#fff',
                  border: '1px solid #333',
                },
              }}
            />
            {children}
            </CallProvider>
          </AuthProvider>
        </ThemeProvider>
      <script dangerouslySetInnerHTML={{ __html: `
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', function() {
          navigator.serviceWorker.register('/sw.js').then(function(reg) {
            console.log('Service Worker registered:', reg.scope);
          }).catch(function(err) {
            console.log('Service Worker registration failed:', err);
          });
        });
      }
    ` }} />
</body>
    </html>
  );
}
