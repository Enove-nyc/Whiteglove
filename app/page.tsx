export default function Home() {
  return (
    <main className="min-h-screen bg-stone-50 text-gray-900">

      <section className="max-w-5xl mx-auto px-6 py-20 text-center">

        <h1 className="text-5xl font-bold mb-4">
          White Glove Itineraries
        </h1>

        <p className="text-2xl mb-2">
          Travel with Confidence.
        </p>

        <p className="text-xl text-gray-600 mb-10">
          Daven with Peace of Mind.
        </p>

        <div className="bg-white shadow-lg rounded-xl p-6">

          <h2 className="text-2xl font-semibold mb-4">
            Where is your next Nesiah Tovah?
          </h2>

          <input
            className="w-full border rounded-lg p-4"
            placeholder="Search by city, tzaddik, country or airport..."
          />

          <button className="mt-5 w-full bg-green-700 text-white py-4 rounded-lg">
            Explore Destinations
          </button>

        </div>

      </section>

      <section className="max-w-5xl mx-auto px-6 pb-16">

        <h2 className="text-3xl font-bold mb-6">
          Featured Destination
        </h2>

        <div className="bg-white rounded-xl shadow-lg p-8">

          <h3 className="text-2xl font-bold">
            Lizensk
          </h3>

          <p className="mt-4 text-gray-600">
            Everything you need for a meaningful visit to Reb Elimelech of Lizensk, including travel information, accommodations, minyanim, mikvaos, kosher food, and nearby Kivrei Tzadikim.
          </p>

          <button className="mt-6 bg-black text-white px-6 py-3 rounded-lg">
            Coming Soon
          </button>

        </div>

      </section>

    </main>
  );
}