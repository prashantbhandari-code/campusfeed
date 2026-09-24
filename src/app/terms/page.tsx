"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { HiOutlineArrowLeft, HiOutlineDocumentText, HiOutlineChevronDown } from "react-icons/hi";

const SECTIONS: { title: string; body: string }[] = [
  {
    title: "1. Acceptance of Terms",
    body: "By creating a Campusfeed account or using the app, you agree to these Terms & Policies. If you do not agree, please do not use Campusfeed. Campusfeed is provided for members of the campus community; you must be a current student, faculty, or staff member to register.",
  },
  {
    title: "2. Your Account",
    body: "You are responsible for keeping your login credentials secure and for all activity that happens under your account. Provide accurate information when registering, and tell us right away if you suspect unauthorized access. One person per account — don't impersonate others or misrepresent your affiliation.",
  },
  {
    title: "3. Acceptable Use",
    body: "Campusfeed is a campus community space. You agree not to post content that is unlawful, harassing, hateful, sexually explicit, or that violates anyone's privacy or intellectual property rights. Don't spam, don't automate access to the service, and don't attempt to disrupt or probe the service's security. We may remove content and suspend accounts that break these rules.",
  },
  {
    title: "4. Your Content",
    body: "You keep ownership of the posts, photos, stories, and messages you create. By sharing them on Campusfeed, you grant other members of your campus the ability to view and interact with that content as part of the service. Stories automatically expire after 24 hours. You can delete your posts at any time.",
  },
  {
    title: "5. Privacy & Data",
    body: "We collect only what's needed to run the service: your name, username, profile details, and the content you share. Messages and calls are delivered between recipients; we store message history so you can revisit it. Push notification endpoints are stored only to deliver notifications you've enabled, and you can turn them off in Settings at any time. We don't sell your data.",
  },
  {
    title: "6. Blocking & Reporting",
    body: "You can block any account from the ⋮ menu on their posts and manage blocked accounts in Settings. Use Report a Problem to flag content or behavior that violates these terms. Reports are reviewed by the campus administrators.",
  },
  {
    title: "7. Termination",
    body: "You can stop using Campusfeed at any time. We may suspend or terminate accounts that violate these terms, endanger other members, or are inactive for an extended period. When an account is deleted, its posts and profile are removed from the service.",
  },
  {
    title: "8. Disclaimers & Changes",
    body: "Campusfeed is provided \"as is\" without warranties of any kind. We may update these terms as the service evolves — continued use after changes means you accept the updated terms. Questions? Contact support@campusconnect.com.",
  },
];

export default function TermsPoliciesPage() {
  const router = useRouter();
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-all">
          <HiOutlineArrowLeft className="text-xl text-gray-600 dark:text-gray-400" />
        </button>
        <HiOutlineDocumentText className="text-xl text-gray-900 dark:text-white" />
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Terms &amp; Policies</h1>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 px-1 mb-4">
        Last updated: September 2026. This includes our Terms of Service and Privacy Policy in one place.
      </p>

      <div className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-200 dark:border-white/[0.08] divide-y divide-gray-100 dark:divide-white/[0.04]">
        {SECTIONS.map((item, i) => (
          <div key={item.title}>
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-all"
              aria-expanded={open === i}
            >
              <span className="text-sm font-medium text-gray-900 dark:text-white">{item.title}</span>
              <HiOutlineChevronDown
                className={`shrink-0 text-gray-400 transition-transform ${open === i ? "rotate-180" : ""}`}
              />
            </button>
            {open === i && (
              <p className="px-4 pb-4 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{item.body}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
