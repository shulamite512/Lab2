import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { propertiesApi, bookingsApi, travelerApi, resolveImageUrl } from '../lib/api';
import { useAuthStore } from '../store/authStore';

export default function PropertyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();

  const [property, setProperty] = useState(null);
  const [blockedDates, setBlockedDates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);

  // Booking form state
  const [bookingData, setBookingData] = useState({
    start_date: '',
    end_date: '',
    number_of_guests: 1,
  });
  const [bookingError, setBookingError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);

  useEffect(() => {
    fetchPropertyDetails();
    if (isAuthenticated && user?.user_type === 'traveler') {
      checkIfFavorite();
    }
  }, [id]);

  const fetchPropertyDetails = async () => {
    try {
      const data = await propertiesApi.getById(id);
      setProperty(data.property);
      setBlockedDates(data.blockedDates || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const checkIfFavorite = async () => {
    try {
      const data = await travelerApi.getFavorites();
      setIsFavorite(data.favorites?.some(fav => fav.id === parseInt(id)));
    } catch (err) {
      console.error('Error checking favorites:', err);
    }
  };

  const toggleFavorite = async () => {
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }

    try {
      if (isFavorite) {
        await travelerApi.removeFavorite(id);
        setIsFavorite(false);
      } else {
        await travelerApi.addFavorite(id);
        setIsFavorite(true);
      }
    } catch (err) {
      console.error('Error toggling favorite:', err);
    }
  };

  const handleBookingChange = (e) => {
    setBookingData({
      ...bookingData,
      [e.target.name]: e.target.value,
    });
  };

  const calculateNights = () => {
    if (!bookingData.start_date || !bookingData.end_date) return 0;
    const start = new Date(bookingData.start_date);
    const end = new Date(bookingData.end_date);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const calculateTotalPrice = () => {
    const nights = calculateNights();
    return nights * property.price_per_night;
  };

  const handleBooking = async (e) => {
    e.preventDefault();
    setBookingError('');
    setBookingSuccess(false);

    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }

    if (user?.user_type !== 'traveler') {
      setBookingError('Only travelers can book properties');
      return;
    }

    setBookingLoading(true);

    try {
      await bookingsApi.create({
        property_id: parseInt(id),
        ...bookingData,
      });
      setBookingSuccess(true);
      setBookingData({ start_date: '', end_date: '', number_of_guests: 1 });
    } catch (err) {
      setBookingError(err.message || 'Booking failed');
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-10 flex justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-10 text-center">
        <p className="text-red-500">Error: {error || 'Property not found'}</p>
      </div>
    );
  }

  const photos = Array.isArray(property.photos)
    ? property.photos
    : typeof property.photos === 'string'
    ? JSON.parse(property.photos)
    : [];
  const normalizedPhotos = photos.map((p) => resolveImageUrl(p));

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 min-h-screen bg-white text-gray-900" style={{ backgroundColor: '#ffffff', color: '#111827' }}>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">{property.property_name}</h1>
        <div className="flex items-center gap-4 mt-2 text-sm text-gray-700">
          <span className="font-medium">★ 4.5</span>
          <span className="text-gray-600">{property.location || 'Location not specified'}</span>
        </div>
      </div>

      {/* Photos Grid */}
      {normalizedPhotos.length > 0 ? (
        <div className="grid grid-cols-4 gap-2 mb-8 rounded-2xl overflow-hidden h-96">
          {normalizedPhotos.slice(0, 5).map((photo, index) => (
            <img
              key={index}
              src={photo}
              alt={`${property.property_name} ${index + 1}`}
              className={`w-full h-full object-cover ${index === 0 ? 'col-span-2 row-span-2' : ''}`}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          ))}
        </div>
      ) : (
        <div className="mb-8 rounded-2xl overflow-hidden h-96 bg-gray-200 flex items-center justify-center">
          <p className="text-gray-500">No photos available</p>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Column - Property Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="border-b pb-6">
            <h2 className="text-2xl font-semibold mb-2 text-gray-900">
              {property.property_type || 'Property'} hosted by {property.owner_name || 'Host'}
            </h2>
            <p className="text-gray-600 text-base">
              {property.max_guests || 0} guests · {property.bedrooms || 0} bedrooms · {property.bathrooms || 0} bathrooms
            </p>
          </div>

          <div className="border-b pb-6">
            <h3 className="text-xl font-semibold mb-3">Location</h3>
            <p className="text-gray-700">
              {property.street_address || property.location || 'Address not specified'}
              {(property.city || property.state || property.zip_code) && (
                <>
                  <br />
                  {[property.city, property.state, property.zip_code].filter(Boolean).join(', ')}
                </>
              )}
            </p>
          </div>

          <div className="border-b pb-6">
            <h3 className="text-xl font-semibold mb-3">Check-in & Check-out</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="font-medium">Check-in time</p>
                <p className="text-gray-600">
                  {property.check_in_time ? new Date('2000-01-01T' + property.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '3:00 PM'}
                </p>
              </div>
              <div>
                <p className="font-medium">Check-out time</p>
                <p className="text-gray-600">
                  {property.check_out_time ? new Date('2000-01-01T' + property.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '11:00 AM'}
                </p>
              </div>
            </div>
          </div>

          <div className="border-b pb-6">
            <h3 className="text-xl font-semibold mb-3">About this place</h3>
            <p className="text-gray-700 whitespace-pre-wrap">
              {property.description || 'No description available'}
            </p>
          </div>

          {property.amenities && (
            <div className="border-b pb-6">
              <h3 className="text-xl font-semibold mb-3">Amenities</h3>
              <div className="grid grid-cols-2 gap-3">
                {(() => {
                  let amenitiesList = [];
                  try {
                    if (typeof property.amenities === 'string') {
                      // Try parsing as JSON first
                      try {
                        const parsed = JSON.parse(property.amenities);
                        amenitiesList = Array.isArray(parsed) ? parsed : property.amenities.split(',');
                      } catch {
                        // If not JSON, split by comma
                        amenitiesList = property.amenities.split(',');
                      }
                    } else if (Array.isArray(property.amenities)) {
                      amenitiesList = property.amenities;
                    }
                  } catch (e) {
                    console.error('Error parsing amenities:', e);
                  }
                  return amenitiesList.length > 0 ? (
                    amenitiesList.map((amenity, index) => (
                      <div key={index} className="flex items-center gap-2 text-gray-700">
                        <span className="text-green-600">✓</span>
                        <span>{String(amenity).trim()}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500">No amenities listed</p>
                  );
                })()}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Booking Card */}
        <div className="lg:col-span-1">
          <div className="border border-gray-200 rounded-2xl p-6 shadow-lg sticky top-4 bg-white" style={{ backgroundColor: '#ffffff', color: '#111827' }}>
            <div className="flex justify-between items-center mb-4">
              <div>
                <span className="text-2xl font-bold">${property.price_per_night}</span>
                <span className="text-gray-600"> / night</span>
              </div>
              <button
                onClick={toggleFavorite}
                className="text-2xl hover:scale-110 transition"
              >
                {isFavorite ? '❤️' : '🤍'}
              </button>
            </div>

            {bookingSuccess && (
              <div className="mb-4 p-3 bg-green-50 text-green-800 rounded-md text-sm">
                Booking request sent successfully!
              </div>
            )}

            {bookingError && (
              <div className="mb-4 p-3 bg-red-50 text-red-800 rounded-md text-sm">
                {bookingError}
              </div>
            )}

            <form onSubmit={handleBooking} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Check-in</label>
                <input
                  type="date"
                  name="start_date"
                  value={bookingData.start_date}
                  onChange={handleBookingChange}
                  min={new Date().toISOString().split('T')[0]}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                  style={{ backgroundColor: '#ffffff', color: '#111827' }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Check-out</label>
                <input
                  type="date"
                  name="end_date"
                  value={bookingData.end_date}
                  onChange={handleBookingChange}
                  min={bookingData.start_date || new Date().toISOString().split('T')[0]}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                  style={{ backgroundColor: '#ffffff', color: '#111827' }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Guests</label>
                <input
                  type="number"
                  name="number_of_guests"
                  value={bookingData.number_of_guests}
                  onChange={handleBookingChange}
                  min="1"
                  max={property.max_guests}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                  style={{ backgroundColor: '#ffffff', color: '#111827' }}
                />
              </div>

              {bookingData.start_date && bookingData.end_date && (
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>${property.price_per_night} × {calculateNights()} nights</span>
                    <span>${calculateTotalPrice()}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Total</span>
                    <span>${calculateTotalPrice()}</span>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={bookingLoading}
                className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white py-3 rounded-lg font-semibold hover:from-pink-600 hover:to-purple-600 disabled:opacity-50"
              >
                {bookingLoading ? 'Processing...' : 'Reserve'}
              </button>
            </form>

            <p className="text-center text-sm text-gray-500 mt-4">
              You won't be charged yet
            </p>
          </div>

          {/* Host contact card */}
          <div className="mt-6 border border-gray-200 rounded-2xl p-5 shadow-sm bg-white">
            <h4 className="text-lg font-semibold text-gray-900 mb-3">Your host</h4>
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-lg">
                {property.owner_name?.[0]?.toUpperCase() || '?'}
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-base font-medium text-gray-900">{property.owner_name || 'Host'}</p>
                {property.owner_email && (
                  <p className="text-sm text-gray-700">Email: <span className="font-mono">{property.owner_email}</span></p>
                )}
                {property.owner_phone && (
                  <p className="text-sm text-gray-700">Phone: <span className="font-mono">{property.owner_phone}</span></p>
                )}
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              You will connect with the host after your booking is confirmed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
