import { useState } from "react";

export default function SearchPill({ onSearch }) {
  const [where, setWhere] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(1);

  // Map UI fields to backend-friendly query parameter names
  const submit = () => onSearch({ location: where, start_date: checkIn, end_date: checkOut, guests });

  return (
    <div className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center divide-x rounded-full border shadow-sm overflow-hidden">
      <input
        placeholder="Where?"
        className="px-4 py-2 outline-none"
        value={where}
        onChange={(e) => setWhere(e.target.value)}
      />
      <input type="date" className="px-4 py-2 outline-none" value={checkIn} onChange={(e)=>setCheckIn(e.target.value)} />
      <input type="date" className="px-4 py-2 outline-none" value={checkOut} onChange={(e)=>setCheckOut(e.target.value)} />
      <input type="number" min="1" className="w-20 px-4 py-2 outline-none" value={guests} onChange={(e)=>setGuests(e.target.value)} />
      <button onClick={submit} className="px-4 py-2 bg-[var(--brand)] text-white font-medium">Search</button>
    </div>
  );
}
