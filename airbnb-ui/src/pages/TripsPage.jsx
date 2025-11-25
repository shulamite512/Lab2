import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { bookingsApi, resolveImageUrl } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { format } from 'date-fns';

export default function TripsPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated || user?.user_type !== 'traveler') {
      navigate('/auth');
      return;
    }
    fetchBookings();
  }, [isAuthenticated, user, isLoading]);

  const fetchBookings = async () => {
    try {
      const data = await bookingsApi.getAll();
      setBookings(data.bookings || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const cancelBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) {
      return;
    }

    setCancellingId(bookingId);
    try {
      await bookingsApi.cancel(bookingId);
      setBookings(bookings.map(b =>
        b.id === bookingId ? { ...b, status: 'CANCELLED' } : b
      ));
    } catch (err) {
      alert('Failed to cancel booking: ' + err.message);
    } finally {
      setCancellingId(null);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      ACCEPTED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[status]}`}>
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

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-10 text-center text-red-500">
        Error: {error}
      </div>
    );
  }

  const upcomingBookings = bookings.filter(
    b => b.status === 'ACCEPTED' && new Date(b.start_date) >= new Date()
  );
  const pendingBookings = bookings.filter(b => b.status === 'PENDING');
  const pastBookings = bookings.filter(
    b => (b.status === 'ACCEPTED' && new Date(b.end_date) < new Date()) || b.status === 'CANCELLED'
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Trips</h1>

      {/* Upcoming Trips */}
      {upcomingBookings.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Upcoming</h2>
          <div className="space-y-4">
            {upcomingBookings.map((booking) => {
              const photos = Array.isArray(booking.photos)
                ? booking.photos
                : typeof booking.photos === 'string'
                ? JSON.parse(booking.photos)
                : [];
              const photosResolved = photos.map((p) => resolveImageUrl(p));

              return (
                <div
                  key={booking.id}
                  className="border rounded-2xl p-4 hover:shadow-md transition flex gap-4 cursor-pointer"
                  onClick={() => navigate(`/trip/${booking.id}`)}
                >
                    <img
                    src={photosResolved[0] || resolveImageUrl(null)}
                    alt={booking.property_name}
                    className="w-32 h-32 rounded-lg object-cover"
                  />
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-xl font-semibold">{booking.property_name}</h3>
                      {getStatusBadge(booking.status)}
                    </div>
                    <p className="text-gray-600 mb-1">{booking.location}</p>
                    <p className="text-sm text-gray-500 mb-2">
                      {format(new Date(booking.start_date), 'MMM d')} - {format(new Date(booking.end_date), 'MMM d, yyyy')}
                    </p>
                    <p className="text-sm text-gray-500 mb-2">
                      {booking.number_of_guests} guest{booking.number_of_guests > 1 ? 's' : ''}
                    </p>
                    <p className="font-semibold">${booking.total_price}</p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/trip/${booking.id}`);
                      }}
                      className="mt-3 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm font-semibold"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pending Requests */}
      {pendingBookings.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Pending Requests</h2>
          <div className="space-y-4">
            {pendingBookings.map((booking) => {
              const photos = Array.isArray(booking.photos)
                ? booking.photos
                : typeof booking.photos === 'string'
                ? JSON.parse(booking.photos)
                : [];

              return (
                <div
                  key={booking.id}
                  className="border rounded-2xl p-4 hover:shadow-md transition flex gap-4 cursor-pointer"
                  onClick={() => navigate(`/trip/${booking.id}`)}
                >
                  <img
                    src={photos[0] ? resolveImageUrl(photos[0]) : resolveImageUrl(null)}
                    alt={booking.property_name}
                    className="w-32 h-32 rounded-lg object-cover"
                  />
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-xl font-semibold">{booking.property_name}</h3>
                      {getStatusBadge(booking.status)}
                    </div>
                    <p className="text-gray-600 mb-1">{booking.location}</p>
                    <p className="text-sm text-gray-500 mb-2">
                      {format(new Date(booking.start_date), 'MMM d')} - {format(new Date(booking.end_date), 'MMM d, yyyy')}
                    </p>
                    <p className="font-semibold">${booking.total_price}</p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/trip/${booking.id}`);
                      }}
                      className="mt-3 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm font-semibold"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Past Trips */}
      {pastBookings.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Where you've been</h2>
          <div className="space-y-4">
            {pastBookings.map((booking) => {
              const photos = Array.isArray(booking.photos)
                ? booking.photos
                : typeof booking.photos === 'string'
                ? JSON.parse(booking.photos)
                : [];

              return (
                <div
                  key={booking.id}
                  className="border rounded-2xl p-4 hover:shadow-md transition flex gap-4 opacity-75 cursor-pointer"
                  onClick={() => navigate(`/trip/${booking.id}`)}
                >
                  <img
                    src={photos[0] ? resolveImageUrl(photos[0]) : resolveImageUrl(null)}
                    alt={booking.property_name}
                    className="w-32 h-32 rounded-lg object-cover"
                  />
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-xl font-semibold">{booking.property_name}</h3>
                      {getStatusBadge(booking.status)}
                    </div>
                    <p className="text-gray-600 mb-1">{booking.location}</p>
                    <p className="text-sm text-gray-500 mb-2">
                      {format(new Date(booking.start_date), 'MMM d')} - {format(new Date(booking.end_date), 'MMM d, yyyy')}
                    </p>
                    <p className="font-semibold">${booking.total_price}</p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/trip/${booking.id}`);
                      }}
                      className="mt-3 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm font-semibold"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {bookings.length === 0 && (
        <div className="text-center py-20">
          <h2 className="text-2xl font-semibold mb-4">No trips yet</h2>
          <p className="text-gray-600 mb-6">
            Time to dust off your bags and start planning your next adventure
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg font-semibold hover:from-pink-600 hover:to-purple-600"
          >
            Start searching
          </button>
        </div>
      )}
    </div>
  );
}
