import { describeProblem, googleConfig } from "@/lib/google-signin";
import Footer from "@/components/Footer";
import LoginForm from "@/components/LoginForm";
import { smsConfigured } from "@/lib/sms";
import Navbar from "@/components/Navbar";
import { pageMetadata } from "@/lib/seo";

// Noindexed: a sign-in form is of no use in a search result, and having one
// rank for the brand name puts a login page where the homepage should be.
export const metadata = pageMetadata({
  title: "Sign in to White Glove Itineraries",
  description: "Sign in to keep your route, saved destinations and itineraries on every device.",
  path: "/login",
  noIndex: true,
});

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; google?: string; googleSays?: string }> }) {
  const { next, google, googleSays } = await searchParams;
  // Only a path on this site. A full URL here would turn the sign-in page into
  // an open redirect somebody could point anywhere.
  const back = next && next.startsWith("/") && !next.startsWith("//") ? next : undefined;
  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <Navbar />
      {/* Above the route, but below the site-wide notice and banner. */}
      <section
        aria-labelledby="login-title"
        className="fixed inset-0 z-[var(--wg-z-auth)] flex min-h-dvh items-center justify-center overflow-x-hidden overflow-y-auto bg-[rgba(13,31,59,.58)] px-3 py-3 backdrop-blur-[2px] sm:px-6 sm:py-8"
      >
        <div
          className="wg-card max-h-[calc(100dvh-1.5rem)] min-w-0 w-full max-w-xl overflow-x-hidden overflow-y-auto overscroll-contain rounded-2xl border border-[var(--gold)] bg-[#fcfaf6] p-5 shadow-[0_24px_60px_rgba(13,31,59,.34)] outline-none sm:max-h-[calc(100dvh-4rem)] sm:p-8"
        >
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold-ink)]">Sign in or create an account</p>
          <h1 id="login-title" className="mt-3 font-[family-name:var(--font-display)] text-3xl leading-tight text-[var(--navy)] sm:text-4xl">Your personal travel book.</h1>
          <LoginForm
            phoneSignupAvailable={smsConfigured()}
            next={back}
            googleAvailable={Boolean(googleConfig({ GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET }))}
            // Two ways this can come back: a short code for the things that go
            // wrong in the flow, and a sentence for the things worth saying in
            // full — above all "Google has not verified that address".
            googleProblem={googleSays?.slice(0, 300) || describeProblem(google) || undefined}
          />
        </div>
      </section>
      <Footer />
    </main>
  );
}
