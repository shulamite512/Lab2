import { useMemo, useState } from "react";
import ServicesHero from "../services/ServicesHero.jsx";
import ServicesFilters from "../services/ServicesFilters.jsx";
import ServiceCard from "../services/ServiceCard.jsx";
import servicesData from "../services/services.data.js";

export default function ServicesPage() {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("All");
  const [city, setCity] = useState("San Jose, USA");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return servicesData
      .filter(s => category === "All" || s.category === category)
      .filter(s => s.city === city)
      .filter(s => (needle ? (s.title + " " + s.description).toLowerCase().includes(needle) : true));
  }, [q, category, city]);

  return (
    <div>
      <ServicesHero />
      <section className="max-w-7xl mx-auto px-4 py-8">
        <ServicesFilters
          q={q} onQ={setQ}
          category={category} onCategory={setCategory}
          city={city} onCity={setCity}
        />

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {filtered.map(s => <ServiceCard key={s.id} service={s} />)}
        </div>

        <div className="mt-12 rounded-2xl bg-gray-100 p-6 flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
          <div>
            <h3 className="text-xl font-semibold">Offer services on Airbnb</h3>
            <p className="text-gray-600">Join as a Pro—get leads for setup, cleaning, photography, and more.</p>
          </div>
          <a href="#" className="btn-brand self-start md:self-auto">Become a Pro</a>
        </div>
      </section>
    </div>
  );
}
