import Link from "next/link";
import { readWords } from "@/lib/site-words-store";
import { pageMetadata } from "@/lib/seo";
import ContactForm from "@/components/ContactForm";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import PageBlocks from "@/components/PageBlocks";
import PlanningRequestForm from "@/components/PlanningRequestForm";
import SectionHeading from "@/components/SectionHeading";
import { CONTACT_REASONS, readReason } from "@/lib/contact-reasons";
import { resolvePage } from "@/lib/pages";
import { TRIP_KINDS, type TripKind } from "@/lib/trip-plan";

export async function generateMetadata() {
  const page = await resolvePage("contact");
  // The owner writes the title and description in the admin; the
  // canonical URL and the share card come from the page it is.
  return pageMetadata({
    title: page?.seoTitle ?? "White Glove Itineraries",
    description:
      page?.seoDescription ??
      "Ask us to plan or book a trip, tell us something on the site is wrong, ask about advertising, or ask a question.",
    path: "/contact",
  });
}

/**
 * Four errands, and only the questions that belong to the one you picked.
 *
 * THE PAGE OPENED ON A TRIP FORM, whoever you were. Somebody writing to say a
 * shul's address had changed met eleven questions about their dates and their
 * kosher standards, and somebody asking about advertising met the same. Both
 * wrote in the message box instead, and both cost a reply asking for the one
 * fact the form should have asked for.
 *
 * THE REASONS ARE LINKS, NOT A JAVASCRIPT TOGGLE. Three things follow, and all
 * three matter more than the extra render: /contact?reason=advertise can be
 * linked to from the footer and from an advertising page, the choice survives
 * a refresh and a shared address, and the page works with scripts blocked.
 *
 * AND THIS IS WHERE PERSONAL ASSISTANCE LIVES. Arranging a trip for somebody
 * is a real thing this business does, and it is the one offer that changes how
 * every other page reads — on a hotel result, "we can arrange this for you"
 * turns a usable tool into a sales funnel. Behind a reason on this page it is
 * what it actually is: something you can ask for, once you have decided to ask
 * for something.
 */
export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string; trip?: string; destination?: string; from?: string }>;
}) {
  const { reason: reasonParam, trip, destination } = await searchParams;
  const reason = readReason(reasonParam);
  const [page, words] = await Promise.all([resolvePage("contact"), readWords()]);
  const initialKind = (TRIP_KINDS.find((entry) => entry.value === trip)?.value ?? "") as TripKind | "";
  // Trimmed and capped rather than printed as given: it lands in a text field
  // as though the visitor had typed it, and a link is not a trustworthy author.
  const initialDestination = typeof destination === "string" ? destination.replace(/\s+/g, " ").trim().slice(0, 80) : "";

  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <Navbar />
      <PageBlocks blocks={page!.blocks} />

      <section className="mx-auto max-w-5xl px-5 pb-16 sm:px-8">
        <SectionHeading
          eyebrow="Reason for writing"
          title="Reason for writing"
          description="Pick one and the form asks only what that needs."
        />
        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          {CONTACT_REASONS.map((entry) => {
            const chosen = entry.value === reason;
            return (
              <li key={entry.value}>
                <Link
                  href={`/contact?reason=${entry.value}`}
                  aria-current={chosen ? "true" : undefined}
                  scroll={false}
                  className={`flex h-full min-h-11 flex-col justify-center rounded-xl border p-5 transition ${
                    chosen
                      ? "border-[var(--navy)] bg-[var(--navy)] text-white"
                      : "border-[var(--gold-light)] bg-[var(--surface)] hover:border-[var(--gold)]"
                  }`}
                >
                  <span
                    className={`font-[family-name:var(--font-display)] text-xl leading-tight ${
                      chosen ? "text-white" : "text-[var(--navy)]"
                    }`}
                  >
                    {entry.label}
                  </span>
                  <span className={`mt-1 text-sm leading-6 ${chosen ? "text-slate-200" : "text-stone-600"}`}>
                    {entry.blurb}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="mt-10">
          {reason === "" ? (
            // Not a form and not an apology: the four above are the page, and
            // the address is here for somebody who would rather just write.
            <p className="rounded-xl border border-[var(--gold-light)] bg-[var(--surface)] p-6 leading-7 text-stone-600">
              Or write to us at{" "}
              <a
                href={`mailto:${words.contactEmail}`}
                className="font-semibold text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4"
              >
                {words.contactEmail}
              </a>
              . {words.replyPromise}
            </p>
          ) : reason === "trip" ? (
            <PlanningRequestForm words={words} initialKind={initialKind} initialDestination={initialDestination} />
          ) : (
            <ContactForm reason={reason} words={words} />
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}
