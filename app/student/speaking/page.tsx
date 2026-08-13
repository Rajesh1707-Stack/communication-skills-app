import { Suspense } from "react";
import SpeakingPracticeClient from "./SpeakingPracticeClient";

export default function SpeakingPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="text-center">
            <div className="text-5xl mb-4">🎤</div>
            <p className="text-lg font-semibold text-gray-700">
              Loading speaking practice...
            </p>
          </div>
        </main>
      }
    >
      <SpeakingPracticeClient />
    </Suspense>
  );
}