import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ownerApi, bookingsApi } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { format } from 'date-fns';

export default function OwnerDashboardPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const [dashboard, setDashboard] = useState({ pendingRequests: [], previousBookings: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated || user?.user_type !== 'owner') {
      navigate('/auth');
      return;
    }
    fetchDashboard();
  }, [isAuthenticated, user, isLoading]);

  const fetchDashboard = async () => {
    try {
      const data = await ownerApi.getDashboard();
      setDashboard(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const acceptBooking = async (bookingId) => {
    setProcessingId(bookingId);
    try {
      await bookingsApi.accept(bookingId);
      // Refresh dashboard
      await fetchDashboard();
    } catch (err) {
      alert('Failed to accept booking: ' + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const cancelBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) {
      return;
    }

    setProcessingId(bookingId);
    try {
      await bookingsApi.cancel(bookingId);
      await fetchDashboard();
    } catch (err) {
      alert('Failed to cancel booking: ' + err.message);
    } finally {
      setProcessingId(null);
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
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <button
          onClick={() => navigate('/owner/properties')}
          className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg font-semibold hover:from-pink-600 hover:to-purple-600"
        >
          Manage Properties
        </button>
      </div>

      {/* Pending Booking Requests */}
      {dashboard.pendingRequests && dashboard.pendingRequests.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">
            Pending Requests ({dashboard.pendingRequests.length})
          </h2>
          <div className="space-y-4">
            {dashboard.pendingRequests.map((booking) => (
              <div
                key={booking.id}
                className="border rounded-2xl p-6 hover:shadow-md transition"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold mb-1">{booking.property_name}</h3>
                    <p className="text-gray-600">Guest: {booking.traveler_name}</p>
                  </div>
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-semibold">
                    PENDING
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                  <div>
                    <p className="text-gray-500">Check-in</p>
                    <p className="font-semibold">{format(new Date(booking.start_date), 'MMM d, yyyy')}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Check-out</p>
                    <p className="font-semibold">{format(new Date(booking.end_date), 'MMM d, yyyy')}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Guests</p>
                    <p className="font-semibold">{booking.number_of_guests}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Total</p>
                    <p className="font-semibold">${booking.total_price}</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => acceptBooking(booking.id)}
                    disabled={processingId === booking.id}
                    className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
                  >
                    {processingId === booking.id ? 'Processing...' : 'Accept'}
                  </button>
                  <button
                    onClick={() => cancelBooking(booking.id)}
                    disabled={processingId === booking.id}
                    className="flex-1 px-4 py-2 border border-red-500 text-red-500 rounded-lg hover:bg-red-50 disabled:opacity-50"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Previous Bookings */}
      {dashboard.previousBookings && dashboard.previousBookings.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Previous Bookings</h2>
          <div className="space-y-4">
            {dashboard.previousBookings.map((booking) => (
              <div
                key={booking.id}
                className="border rounded-2xl p-6 opacity-75"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold mb-1">{booking.property_name}</h3>
                    <p className="text-gray-600">Guest: {booking.traveler_name}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    booking.status === 'ACCEPTED'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {booking.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Check-in</p>
                    <p className="font-semibold">{format(new Date(booking.start_date), 'MMM d, yyyy')}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Check-out</p>
                    <p className="font-semibold">{format(new Date(booking.end_date), 'MMM d, yyyy')}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Guests</p>
                    <p className="font-semibold">{booking.number_of_guests}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Total</p>
                    <p className="font-semibold">${booking.total_price}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {(!dashboard.pendingRequests || dashboard.pendingRequests.length === 0) &&
       (!dashboard.previousBookings || dashboard.previousBookings.length === 0) && (
        <div className="text-center py-20">
          <h2 className="text-2xl font-semibold mb-4">No bookings yet</h2>
          <p className="text-gray-600 mb-6">
            Your booking requests will appear here
          </p>
          <button
            onClick={() => navigate('/owner/properties')}
            className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg font-semibold hover:from-pink-600 hover:to-purple-600"
          >
            Manage your properties
          </button>
        </div>
      )}
    </div>
  );
}
