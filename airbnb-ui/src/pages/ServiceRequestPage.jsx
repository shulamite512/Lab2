import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import servicesData from "../services/services.data.js";
import { BACKEND_URL } from "../lib/api";

export default function ServiceRequestPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const service = servicesData.find(s => s.id === id) || { title: "Service" };

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    try {
      // Try posting to backend; if backend doesn't have this endpoint, we'll show the error
      const res = await fetch(`${BACKEND_URL}/services/requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service_id: id, name, email, message }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || res.statusText);
      }

      setStatus("success");
      setName("");
      setEmail("");
      setMessage("");
      // redirect back to services after a short delay
      setTimeout(() => navigate("/services"), 1200);
    } catch (err) {
      setStatus(err.message ? String(err.message) : "Error sending request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h2 className="text-2xl font-semibold mb-2">Request a quote</h2>
      <p className="text-gray-600 mb-4">Service: <span className="font-medium">{service.title}</span></p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Your name</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            required
            className="border rounded px-3 py-2 w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="border rounded px-3 py-2 w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Message / details</label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            required
            className="border rounded px-3 py-2 w-full"
            rows={6}
          />
        </div>

        <div className="flex items-center gap-3">
          <button className="btn-brand" disabled={loading}>{loading ? "Sending..." : "Send request"}</button>
          <button type="button" className="btn-outline" onClick={() => navigate('/services')}>Cancel</button>
        </div>

        {status === "success" && <div className="text-green-600">Request sent — redirecting to services...</div>}
        {status && status !== "success" && <div className="text-red-600">Error: {status}</div>}
      </form>
    </div>
  );
}
