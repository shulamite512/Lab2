const CATEGORIES = [
  "All", "Airbnb Setup", "Co-hosting", "Cleaning",
  "Photography", "Staging", "Maintenance", "Smart locks"
];

export default function ServicesFilters({ q, onQ, category, onCategory, city, onCity }) {
  return (
    <div className="grid md:grid-cols-4 gap-3">
      <input
        placeholder="Search services (e.g., deep clean, photos)"
        value={q}
        onChange={e => onQ(e.target.value)}
        className="border rounded-lg px-4 py-2 md:col-span-2"
      />
      <select
        value={category}
        onChange={e => onCategory(e.target.value)}
        className="border rounded-lg px-4 py-2"
      >
        {CATEGORIES.map(c => <option key={c}>{c}</option>)}
      </select>
      <select
        value={city}
        onChange={e => onCity(e.target.value)}
        className="border rounded-lg px-4 py-2"
      >
        {["San Jose, USA","San Francisco, USA","Fremont, USA","Mountain View, USA"].map(c => (
          <option key={c}>{c}</option>
        ))}
      </select>
    </div>
  );
}
