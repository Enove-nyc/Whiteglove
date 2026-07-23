const destinations = [
  {
    name: "Lizhensk",
    country: "Poland",
    description: "Kever of Reb Elimelech זי״ע",
    status: "Featured",
  },
  {
    name: "Uman",
    country: "Ukraine",
    description: "Rebbe Nachman of Breslov",
    status: "Coming Soon",
  },
  {
    name: "Kraków",
    country: "Poland",
    description: "Jewish Heritage & Airport Hub",
    status: "Coming Soon",
  },
  {
    name: "Belz",
    country: "Ukraine",
    description: "Historic Belzer Chassidus",
    status: "Coming Soon",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-stone-50 text-gray-900">

      {/* Hero */}

      <section className="bg-[#1D2F6F] text-white">
        <div className="max-w-6xl mx-auto px-6 py-24 text-center">

          <h1 className="text-6xl font-bold">
            White Glove Itineraries
          </h1>

          <p className="mt-6 text-2xl text-gray-200">
            Luxury Kosher Travel & Jewish Heritage Journeys
          </p>

          <p className="mt-4 max-w-3xl mx-auto text-lg text-gray-300">
            Hotels • Drivers • Kosher Dining • Mikvaos • Minyanim •
            Kivrei Tzadikim
          </p>

          <div className="mt-12 max-w-2xl mx-auto bg-white rounded-xl p-3 shadow-xl flex">

            <input
              className="flex-1 p-4 text-black outline-none"
              placeholder="Search a destination..."
            />

            <button className="bg-[#A88945] px-8 rounded-lg font-semibold">
              Search
            </button>

          </div>

        </div>
      </section>

      {/* Featured */}

      <section className="max-w-6xl mx-auto px-6 py-16">

        <h2 className="text-4xl font-bold mb-8">
          Featured Destination
        </h2>

        <div className="rounded-2xl bg-white shadow-lg p-8 border">

          <div className="text-sm uppercase tracking-wide text-[#A88945] font-semibold">
            Now Building
          </div>

          <h3 className="text-4xl font-bold mt-2">
            Lizhensk, Poland
          </h3>

          <p className="mt-6 text-lg text-gray-600 leading-8">
            Plan your complete נסיעה to Reb Elimelech of Lizhensk with verified
            hotels, kosher food, mikvaos, minyanim, transportation,
            nearby kivrei tzaddikim, and practical travel guidance.
          </p>

          <button className="mt-8 bg-[#1D2F6F] text-white px-8 py-3 rounded-lg">
            View Guide (Coming Soon)
          </button>

        </div>

      </section>

      {/* Destinations */}

      <section className="max-w-6xl mx-auto px-6 pb-20">

        <h2 className="text-4xl font-bold mb-8">
          Popular Destinations
        </h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">

          {destinations.map((place) => (
            <div
              key={place.name}
              className="bg-white rounded-xl border shadow-sm p-6 hover:shadow-lg transition"
            >
              <div className="text-sm text-[#A88945] font-semibold">
                {place.status}
              </div>

              <h3 className="text-2xl font-bold mt-2">
                {place.name}
              </h3>

              <p className="text-gray-500">
                {place.country}
              </p>

              <p className="mt-4 text-gray-600">
                {place.description}
              </p>
            </div>
          ))}

        </div>

      </section>

    </main>
  );
}