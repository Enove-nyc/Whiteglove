export default function Home() {
  return (
    <main className="min-h-screen bg-blue-50">
      <section className="bg-blue-700 text-white py-20 px-6 text-center">
        <h1 className="text-5xl font-bold mb-4">
          White Glove Itineraries
        </h1>

        <p className="text-xl">
          Premium travel planning with personalized itineraries and unforgettable experiences.
        </p>
      </section>

      <section className="max-w-4xl mx-auto mt-10 bg-white rounded-xl shadow p-8">
        <h2 className="text-2xl font-bold mb-6">
          Search Flights
        </h2>

        <div className="grid md:grid-cols-3 gap-4">
          <input
            className="border rounded p-3"
            placeholder="From"
          />

          <input
            className="border rounded p-3"
            placeholder="To"
          />

          <input
            className="border rounded p-3"
            placeholder="Departure date"
          />
        </div>

        <button className="mt-6 bg-blue-700 text-white px-6 py-3 rounded-lg">
          Search Flights
        </button>
      </section>
    </main>
  );
}