
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { propertiesApi, resolveImageUrl } from '../lib/api';
import AIChatbot from '../components/AIChatbot';

export default function HomePage() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchParams] = useSearchParams();

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        setLoading(true);
        // If search params exist, call the search endpoint; otherwise fetch all
        const paramsObj = Object.fromEntries([...searchParams]);

        // Remove empty values
        Object.keys(paramsObj).forEach((k) => {
          if (paramsObj[k] === '' || paramsObj[k] === undefined || paramsObj[k] === null) delete paramsObj[k];
        });

        let data;
        if (Object.keys(paramsObj).length > 0) {
          // Map query params directly to backend search API
          data = await propertiesApi.search(paramsObj);
          // backend returns { properties: [...] }
          setProperties(data.properties || []);
        } else {
          data = await propertiesApi.getAll();
          setProperties(data.properties || []);
        }
      } catch (err) {
        console.error('[HomePage] Error fetching properties:', err);
        setError(err.message || 'Failed to load properties');
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
    // Re-run whenever the URL query params change
  }, [searchParams]);

  return (
    <section>
      {/* hero */}
      <div className="bg-gradient-to-r from-pink-300 via-purple-300 to-indigo-400">
        <div className="max-w-7xl mx-auto px-4 py-20 text-white">
          <h1 className="text-4xl md:text-6xl font-extrabold drop-shadow">Find your next stay</h1>
          <p className="mt-2 md:text-lg text-white/90">Explore homes, cabins, and unique places.</p>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="max-w-7xl mx-auto px-4 py-10 flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 py-10 text-center text-red-500">
          <p>Error loading properties: {error}</p>
        </div>
      )}

      {/* Properties Grid */}
      {!loading && !error && (
        <div className="max-w-7xl mx-auto px-4 py-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {properties.map((property) => {
            // Handle photos - check if it's a JSON string or already parsed
              let photoUrl;
            try {
              console.log(`[HomePage] Processing property ${property.id}, photos:`, property.photos);
                if (property.photos) {
                // Try to parse if it's a JSON string
                const photos = typeof property.photos === 'string'
                  ? JSON.parse(property.photos)
                  : property.photos;
                const first = Array.isArray(photos) ? photos[0] : photos;
                photoUrl = resolveImageUrl(first);
                console.log(`[HomePage] Property ${property.id} photoUrl:`, photoUrl);
              } else {
                // Fallback to default Pexels image
                photoUrl = resolveImageUrl(null);
                console.log(`[HomePage] Property ${property.id} using fallback`);
              }
            } catch (err) {
              // If parsing fails, assume it's a direct URL string
              console.warn('[HomePage] Failed to parse photos for property', property.id, err);
              photoUrl = property.photos || 'https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=600';
            }

            return (
              <article key={property.id} className="rounded-2xl overflow-hidden border hover:shadow-md transition cursor-pointer" onClick={() => window.location.href = `/property/${property.id}`}>
                <img
                  src={photoUrl}
                  alt={property.property_name}
                  className="h-48 w-full object-cover"
                />
              <div className="p-3">
                <div className="flex justify-between">
                  <h3 className="font-semibold truncate">{property.property_name}</h3>
                  <span className="text-sm">★ 4.5</span>
                </div>
                <p className="text-sm text-gray-600">{property.location}</p>
                <p className="mt-1">
                  <span className="font-semibold">${property.price_per_night}</span> night
                </p>
              </div>
            </article>
            );
          })}
        </div>
      )}

      {/* AI Chatbot */}
      <AIChatbot />
    </section>
  );
}
