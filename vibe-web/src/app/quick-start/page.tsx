import QuickStartSection from "../../components/quick-start-section";

/**
 * Quick Start Page
 * Extracted from landing page onboarding accordion + progress.
 * Purely presentational; reuses existing QuickStartSection component.
 */

export default function QuickStartPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 pt-12 md:pt-16 space-y-12">
      <header className="text-center">
        <h1 className="font-headline font-semibold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-primary text-[2.6rem] md:text-[3.2rem]">
          Quick Start
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
          Complete the onboarding steps below to reach 100% and begin using the Vibe CLI with confidence.
        </p>
      </header>

      <QuickStartSection />
    </div>
  );
}