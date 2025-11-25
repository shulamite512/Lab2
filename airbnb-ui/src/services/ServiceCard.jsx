import { useNavigate } from "react-router-dom";

export default function ServiceCard({ service }) {
  const navigate = useNavigate();

  return (
    <article className="rounded-2xl overflow-hidden border hover:shadow-md transition flex flex-col">
      <img src={service.cover} alt={service.title} className="h-40 w-full object-cover" />
      <div className="p-4 flex-1 flex flex-col">
        <div className="text-xs text-gray-500">{service.category} • {service.city}</div>
        <h3 className="font-semibold text-lg mt-1">{service.title}</h3>
        <p className="text-sm text-gray-600 mt-1 overflow-hidden text-ellipsis whitespace-nowrap">
          {service.description}
        </p>
        <div className="mt-3 text-sm">⭐ {service.rating} • {service.reviews} reviews</div>
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm">
            <span className="font-semibold">
              {service.category === "Co-hosting" ? `${service.fromPrice}%` : `$${service.fromPrice}`}
            </span> starting
          </div>
          <button
            className="btn-brand"
            onClick={() => navigate(`/services/request/${service.id}`)}
          >
            Request a quote
          </button>
        </div>
      </div>
    </article>
  );
}
