import { UserProfile } from "@clerk/nextjs";
import type { Metadata } from "next";

import { PreferencesSection } from "../preferences";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div className="flex min-h-full flex-col items-center gap-6 p-6">
      <PreferencesSection />
      <UserProfile
        routing="path"
        path="/settings"
        appearance={{
          elements: {
            rootBox: "w-full max-w-4xl",
            card: "shadow-none border border-border rounded-xl",
          },
        }}
      />
    </div>
  );
}
