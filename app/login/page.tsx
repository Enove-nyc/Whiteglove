import { describeProblem, googleConfig } from "@/lib/google-signin";
import Footer from "@/components/Footer";
import LoginForm from "@/components/LoginForm";
import { smsConfigured } from "@/lib/sms";
import Navbar from "@/components/Navbar";
import { pageMetadata } from "@/lib/seo";

// Noindexed: a sign-in form is of no use in a search result, and having one
// rank for the brand name puts a login page where the homepage should be.
export const metadata = pageMetadata({
  title: "Sign in to White Glove Kosher Travel",
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
      {/*
        THE FORM COMES FIRST, and on a phone that is the whole point.
        Side by side on a wide screen the order does not matter — the pitch is
        on the left and the form is beside it, both in view. Stacked on a phone
        it mattered a great deal: the pitch is a headline, a paragraph and
        three more lines, so the first field of the actual sign-in sat 1150px
        down a 720px screen. Somebody arriving to sign in saw an advertisement
        for signing in and no way to do it, and had to scroll a screen and a
        half on faith to find out there was a form at all.

        So the form is first in the markup — which is the reading order, the
        tab order and the order a screen reader announces — and `lg:col-start`
        puts the pitch back on the left on a wide screen, where the two-column
        layout is unchanged.
      */}
      <section className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
        <div className="wg-card border border-[var(--gold-light)] bg-[#fcfaf6] p-6 sm:p-10 lg:col-start-2 lg:row-start-1">
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
        <div className="lg:col-start-1 lg:row-start-1">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[var(--gold-ink)]">Your White Glove account</p>
          {/* h2, not a second h1. The page has one heading — the sign-in box's
              "Your personal travel book.", which the form is labelled by. This
              column is the pitch beside it; two h1s gave the page two titles
              and made a screen reader announce a second start of document. */}
          <h2 className="mt-5 font-[family-name:var(--font-display)] text-4xl leading-tight text-[var(--navy)] sm:text-5xl lg:text-6xl">Keep every journey in one place.</h2>
          <p className="mt-7 max-w-xl text-lg leading-8 text-stone-600">Save kevarim, keep your travel notes together, and return to a personalized itinerary whenever you are ready to plan.</p>
          <div className="mt-10 space-y-4 border-t border-[var(--gold-light)] pt-7 text-stone-700">
            <p>Save destinations and map links.</p>
            <p>Keep hotel, driver, and food notes in one private place.</p>
            <p>Build a trip without starting from scratch each time.</p>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
