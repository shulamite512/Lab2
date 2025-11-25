import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { bookingsApi, resolveImageUrl } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { format, differenceInDays } from 'date-fns';

export default function TripDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated || user?.user_type !== 'traveler') {
      navigate('/auth');
      return;
    }
    fetchBookingDetails();
  }, [id, isAuthenticated, user, isLoading]);

  const fetchBookingDetails = async () => {
    try {
      const data = await bookingsApi.getById(id);
      setBooking(data.booking);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const cancelBooking = async () => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) {
      return;
    }

    setCancelling(true);
    try {
      await bookingsApi.cancel(id);
      await fetchBookingDetails();
    } catch (err) {
      alert('Failed to cancel booking: ' + err.message);
    } finally {
      setCancelling(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      ACCEPTED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-4 py-2 rounded-full text-sm font-semibold ${styles[status]}`}>
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-10 flex justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="text-center">
          <p className="text-red-500 mb-4">Error: {error || 'Booking not found'}</p>
          <button
            onClick={() => navigate('/trips')}
            className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg font-semibold"
          >
            Back to Trips
          </button>
        </div>
      </div>
    );
  }

  const photos = Array.isArray(booking.photos)
    ? booking.photos
    : typeof booking.photos === 'string'
    ? JSON.parse(booking.photos)
    : [];
  const normalizedPhotos = photos.map((p) => resolveImageUrl(p));

  const startDate = new Date(booking.start_date);
  const endDate = new Date(booking.end_date);
  const nights = differenceInDays(endDate, startDate);
  const daysUntilTrip = differenceInDays(startDate, new Date());
  const isUpcoming = booking.status === 'ACCEPTED' && daysUntilTrip > 0;
  const isPast = booking.status === 'ACCEPTED' && new Date(booking.end_date) < new Date();

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Back Button */}
      <button
        onClick={() => navigate('/trips')}
        className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900"
      >
        ← Back to all trips
      </button>

      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-4xl font-bold mb-2">{booking.property_name}</h1>
            <p className="text-lg text-gray-600">{booking.location}</p>
          </div>
          {getStatusBadge(booking.status)}
        </div>

        {isUpcoming && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800 font-semibold">
              Your trip is in {daysUntilTrip} day{daysUntilTrip !== 1 ? 's' : ''}!
            </p>
          </div>
        )}

        {booking.status === 'PENDING' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800 font-semibold">
              Your booking request is pending approval from the host
            </p>
          </div>
        )}
      </div>

      {/* Photos Grid */}
      {normalizedPhotos.length > 0 && (
        <div className="grid grid-cols-4 gap-2 mb-8 rounded-2xl overflow-hidden h-96">
          {normalizedPhotos.slice(0, 5).map((photo, index) => (
            <img
              key={index}
              src={photo}
              alt={`${booking.property_name} ${index + 1}`}
              className={`w-full h-full object-cover ${index === 0 ? 'col-span-2 row-span-2' : ''}`}
            />
          ))}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Column - Trip Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Reservation Summary */}
          <div className="border rounded-2xl p-6">
            <h2 className="text-2xl font-semibold mb-6">Reservation Details</h2>

            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <p className="text-gray-500 text-sm mb-1">Check-in</p>
                <p className="font-semibold text-lg">{format(startDate, 'EEEE, MMMM d, yyyy')}</p>
                <p className="text-gray-600">{booking.check_in_time ? new Date('2000-01-01T' + booking.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '3:00 PM'}</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm mb-1">Check-out</p>
                <p className="font-semibold text-lg">{format(endDate, 'EEEE, MMMM d, yyyy')}</p>
                <p className="text-gray-600">{booking.check_out_time ? new Date('2000-01-01T' + booking.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '11:00 AM'}</p>
              </div>
            </div>

            <div className="border-t pt-4 space-y-3">
              <div className="flex justify-between">
                <p className="text-gray-600">Duration</p>
                <p className="font-semibold">{nights} night{nights !== 1 ? 's' : ''}</p>
              </div>
              <div className="flex justify-between">
                <p className="text-gray-600">Number of guests</p>
                <p className="font-semibold">{booking.number_of_guests} guest{booking.number_of_guests > 1 ? 's' : ''}</p>
              </div>
              <div className="flex justify-between">
                <p className="text-gray-600">Booking ID</p>
                <p className="font-semibold">#{booking.id}</p>
              </div>
              <div className="flex justify-between">
                <p className="text-gray-600">Booked on</p>
                <p className="font-semibold">{format(new Date(booking.created_at), 'MMM d, yyyy')}</p>
              </div>
            </div>
          </div>

          {/* Host Information */}
          <div className="border rounded-2xl p-6">
            <h2 className="text-2xl font-semibold mb-4">Your Host</h2>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-2xl">
                {booking.owner_name?.[0]?.toUpperCase() || '👤'}
              </div>
              <div>
                <p className="font-semibold text-lg">{booking.owner_name}</p>
                <p className="text-gray-600">{booking.owner_email}</p>
              </div>
            </div>
          </div>

          {/* Property Details */}
          {booking.amenities && (
            <div className="border rounded-2xl p-6">
              <h2 className="text-2xl font-semibold mb-4">What this place offers</h2>
              <div className="grid grid-cols-2 gap-3">
                {booking.amenities.split(',').map((amenity, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    <span>{amenity.trim()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Address */}
          {booking.street_address && (
            <div className="border rounded-2xl p-6">
              <h2 className="text-2xl font-semibold mb-4">Where you'll be</h2>
              <p className="text-gray-700">
                {booking.street_address}<br />
                {booking.city}, {booking.state} {booking.zip_code}
              </p>
            </div>
          )}
        </div>

        {/* Right Column - Price & Actions */}
        <div className="lg:col-span-1">
          <div className="border rounded-2xl p-6 shadow-lg sticky top-4">
            <h3 className="text-xl font-semibold mb-4">Price Details</h3>

            <div className="space-y-3 mb-4 pb-4 border-b">
              <div className="flex justify-between">
                <span className="text-gray-600">${(booking.total_price / nights).toFixed(2)} × {nights} night{nights !== 1 ? 's' : ''}</span>
                <span className="font-semibold">${booking.total_price.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex justify-between mb-6">
              <span className="text-lg font-semibold">Total</span>
              <span className="text-2xl font-bold">${booking.total_price.toFixed(2)}</span>
            </div>

            {booking.status === 'ACCEPTED' && !isPast && (
              <button
                onClick={cancelBooking}
                disabled={cancelling}
                className="w-full px-4 py-3 border-2 border-red-500 text-red-500 rounded-lg font-semibold hover:bg-red-50 disabled:opacity-50 mb-3"
              >
                {cancelling ? 'Cancelling...' : 'Cancel Reservation'}
              </button>
            )}

            {booking.status === 'PENDING' && (
              <button
                onClick={cancelBooking}
                disabled={cancelling}
                className="w-full px-4 py-3 border-2 border-gray-500 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 disabled:opacity-50 mb-3"
              >
                {cancelling ? 'Withdrawing...' : 'Withdraw Request'}
              </button>
            )}

            <button
              onClick={() => navigate(`/property/${booking.property_id}`)}
              className="w-full px-4 py-3 bg-gray-100 rounded-lg font-semibold hover:bg-gray-200"
            >
              View Property
            </button>

            {isPast && booking.status === 'ACCEPTED' && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 text-center">
                  Hope you enjoyed your stay! Consider leaving a review.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
