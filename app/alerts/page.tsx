import AlertSignup from "@/components/AlertSignup";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import StructuredData from "@/components/StructuredData";
import { ALERT_TOPICS, defaultTopicsFor } from "@/lib/email-alerts";
import { pageMetadata } from "@/lib/seo";
import { breadcrumbs } from "@/lib/structured-data";

export const metadata = pageMetadata({
  title: "Kosher travel updates | White Glove Itineraries",
  description:
    "Choose what you want to hear about — new destinations, verified listings, seasonal programmes or one place in particular.",
  path: "/alerts",
});

/**
 * The signup's own address.
 *
 * IT DID NOT HAVE ONE. The form existed and worked, and the only place it
 * appeared was two thirds of the way down a destination page — so somebody who
 * wanted to be told when we published somewhere new had nowhere to go and no
 * way to find it, and the list barely grew. A page you cannot link to is a page
 * that gets no traffic.
 *
 * ALL THE TOPICS, RATHER THAN A CONTEXTUAL FEW. On a destination page the form
 * pre-ticks the two things that page is about, which is right there. Somebody
 * who came here came to choose.
 */
export default function AlertsPage() {
  return (
    <main className="min-h-screen bg-[var(--cream)] text-[var(--ink)]">
      <StructuredData
        data={breadcrumbs([
          { name: "Home", path: "/" },
          { name: "Travel updates", path: "/alerts" },
        ])}
      />
      <Navbar />

      <section className="border-b border-[var(--gold-light)] bg-white px-5 py-14 sm:px-8 sm:py-16">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--gold-ink)]">Stay in touch</p>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl text-[var(--navy)] sm:text-5xl">
            Kosher travel updates
          </h1>
          <p className="mt-4 text-base leading-7 text-stone-600">
            Tell us what is worth an email and we will write when there is something real to say — a destination
            published, a listing checked, a Pesach or Sukkos programme worth knowing about. Nothing else, and you can
            stop at any time from the bottom of any message.
          </p>
        </div>
      </section>

      <section className="px-5 py-14 sm:px-8 sm:py-16">
        <div className="mx-auto max-w-3xl">
          <AlertSignup
            kind="general"
            sourcePage="/alerts"
            // Every topic offered, but only the two the general form already
            // defaults to are ticked. A page of checkboxes all ticked on
            // arrival is not a choice anybody made, and consent to a list you
            // did not knowingly join is the thing this whole feature is
            // careful about.
            topics={[...ALERT_TOPICS]}
            preselect={defaultTopicsFor("general")}
          />
        </div>
      </section>

      <Footer />
    </main>
  );
}
