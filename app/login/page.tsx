import Footer from "@/components/Footer";
import LoginForm from "@/components/LoginForm";
import Navbar from "@/components/Navbar";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <Navbar />
      <section className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[var(--gold)]">Your White Glove account</p>
          <h1 className="mt-5 font-[family-name:var(--font-display)] text-4xl leading-tight text-[var(--navy)] sm:text-5xl lg:text-6xl">Keep every journey in one place.</h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-stone-600">Save kevarim, keep your travel notes together, and return to a personalized itinerary whenever you are ready to plan.</p>
          <div className="mt-10 space-y-4 border-t border-[var(--gold-light)] pt-7 text-stone-700">
            <p>Save destinations and map links.</p>
            <p>Keep hotel, driver, and food notes in one private place.</p>
            <p>Build a trip without starting from scratch each time.</p>
          </div>
        </div>
        <div className="wg-card border border-[var(--gold-light)] bg-[#fcfaf6] p-6 sm:p-10">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold)]">Sign in or create an account</p>
          <h2 className="mt-4 font-[family-name:var(--font-display)] text-4xl text-[var(--navy)]">Your personal travel book.</h2>
          <LoginForm />
        </div>
      </section>
      <Footer />
    </main>
  );
}
