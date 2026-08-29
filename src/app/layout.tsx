import type { Metadata } from "next";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";
import { Toaster } from "react-hot-toast";
import Script from "next/script";

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
        url: "/og-image.png",
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
    images: ["/og-image.png"],
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
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
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
      <body>
        <AuthProvider>
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
        </AuthProvider>
      </body>
    </html>
  );
}
