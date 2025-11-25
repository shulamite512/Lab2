import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { travelerApi, resolveImageUrl } from '../lib/api';
import { useAuthStore } from '../store/authStore';

export default function FavoritesPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated || user?.user_type !== 'traveler') {
      navigate('/auth');
      return;
    }
    fetchFavorites();
  }, [isAuthenticated, user, isLoading]);

  const fetchFavorites = async () => {
    try {
      const data = await travelerApi.getFavorites();
      setFavorites(data.favorites || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const removeFavorite = async (propertyId) => {
    try {
      await travelerApi.removeFavorite(propertyId);
      setFavorites(favorites.filter(fav => fav.id !== propertyId));
    } catch (err) {
      console.error('Error removing favorite:', err);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-10 flex justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-10 text-center text-red-500">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Wishlists</h1>

      {favorites.length === 0 ? (
        <div className="text-center py-20">
          <h2 className="text-2xl font-semibold mb-4">No favorites yet</h2>
          <p className="text-gray-600 mb-6">
            Start exploring and save your favorite places
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg font-semibold hover:from-pink-600 hover:to-purple-600"
          >
            Explore properties
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {favorites.map((property) => {
            const photos = Array.isArray(property.photos)
              ? property.photos
              : typeof property.photos === 'string'
              ? JSON.parse(property.photos)
              : [];

            return (
              <article
                key={property.id}
                className="rounded-2xl overflow-hidden border hover:shadow-md transition cursor-pointer"
              >
                <div className="relative">
            <img
              src={photos[0] ? resolveImageUrl(photos[0]) : resolveImageUrl(null)}
                    alt={property.property_name}
                    className="h-48 w-full object-cover"
                    onClick={() => navigate(`/property/${property.id}`)}
                  />
                  <button
                    onClick={(e) => { e.stopPropagation(); removeFavorite(property.id); }}
                    className="absolute top-3 right-3 text-2xl hover:scale-110 transition"
                    aria-label="Remove favorite"
                  >
                    { /* Use emoji heart for simplicity; filled heart means favorite */ }
                    <span role="img" aria-hidden>{'❤️'}</span>
                  </button>
                </div>
                <div className="p-3" onClick={() => navigate(`/property/${property.id}`)}>
                  <div className="flex justify-between">
                    <h3 className="font-semibold truncate">{property.property_name}</h3>
                    <span className="text-sm">★ 4.5</span>
                  </div>
                  <p className="text-sm text-gray-600">{property.location}</p>
                  <p className="text-sm text-gray-500">Hosted by {property.owner_name}</p>
                  <p className="mt-1">
                    <span className="font-semibold">${property.price_per_night}</span> night
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
