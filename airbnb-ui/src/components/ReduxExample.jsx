import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchProperties,
  selectAllProperties,
  selectPropertiesLoading,
  selectPropertiesError,
  setSearchFilters,
  selectSearchFilters,
} from '../store/slices/propertiesSlice';
import {
  fetchUserBookings,
  selectAllBookings,
  selectBookingsLoading,
  selectBookingsError,
  setStatusFilter,
  selectFilteredBookings,
} from '../store/slices/bookingsSlice';
import {
  selectUser,
  selectIsAuthenticated,
  logout,
} from '../store/slices/authSlice';

/**
 * ReduxExample Component
 *
 * This component demonstrates Redux Toolkit integration for:
 * 1. Authentication state management
 * 2. Property listing with search filters
 * 3. Booking management with status filters
 *
 * Lab 2 Part 4: Redux Integration (5 points)
 */
export default function ReduxExample() {
  const dispatch = useDispatch();

  // Auth selectors
  const user = useSelector(selectUser);
  const isAuthenticated = useSelector(selectIsAuthenticated);

  // Properties selectors
  const properties = useSelector(selectAllProperties);
  const propertiesLoading = useSelector(selectPropertiesLoading);
  const propertiesError = useSelector(selectPropertiesError);
  const searchFilters = useSelector(selectSearchFilters);

  // Bookings selectors
  const bookings = useSelector(selectFilteredBookings);
  const bookingsLoading = useSelector(selectBookingsLoading);
  const bookingsError = useSelector(selectBookingsError);

  // Load properties on mount
  useEffect(() => {
    dispatch(fetchProperties());
  }, [dispatch]);

  // Load bookings if authenticated
  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchUserBookings());
    }
  }, [isAuthenticated, dispatch]);

  const handleSearch = () => {
    dispatch(fetchProperties(searchFilters));
  };

  const handleLogout = () => {
    dispatch(logout());
  };

  const handleFilterBookings = (status) => {
    dispatch(setStatusFilter(status));
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold">Redux Integration Example</h1>

      {/* Auth Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-semibold mb-4">Authentication State</h2>
        {isAuthenticated ? (
          <div className="space-y-2">
            <p><strong>User:</strong> {user?.name || 'N/A'}</p>
            <p><strong>Email:</strong> {user?.email || 'N/A'}</p>
            <p><strong>Type:</strong> {user?.user_type || 'N/A'}</p>
            <button
              onClick={handleLogout}
              className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Logout
            </button>
          </div>
        ) : (
          <p className="text-gray-600">Not authenticated</p>
        )}
      </div>

      {/* Properties Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-semibold mb-4">Properties (Redux)</h2>

        {/* Search Filters */}
        <div className="mb-4 flex gap-4">
          <input
            type="text"
            placeholder="Location"
            value={searchFilters.location}
            onChange={(e) =>
              dispatch(setSearchFilters({ location: e.target.value }))
            }
            className="px-3 py-2 border rounded"
          />
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Search
          </button>
        </div>

        {propertiesLoading && <p>Loading properties...</p>}
        {propertiesError && <p className="text-red-500">Error: {propertiesError}</p>}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {properties.slice(0, 6).map((property) => (
            <div key={property.property_id} className="border rounded p-4">
              <h3 className="font-semibold">{property.title || 'Property'}</h3>
              <p className="text-sm text-gray-600">{property.location}</p>
              <p className="text-lg font-bold">${property.price_per_night}/night</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-gray-600">
          Showing {Math.min(6, properties.length)} of {properties.length} properties
        </p>
      </div>

      {/* Bookings Section */}
      {isAuthenticated && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">My Bookings (Redux)</h2>

          {/* Status Filters */}
          <div className="mb-4 flex gap-2">
            {['all', 'pending', 'confirmed', 'cancelled', 'completed'].map((status) => (
              <button
                key={status}
                onClick={() => handleFilterBookings(status)}
                className="px-3 py-1 border rounded hover:bg-gray-100 capitalize"
              >
                {status}
              </button>
            ))}
          </div>

          {bookingsLoading && <p>Loading bookings...</p>}
          {bookingsError && <p className="text-red-500">Error: {bookingsError}</p>}

          <div className="space-y-4">
            {bookings.slice(0, 5).map((booking) => (
              <div key={booking.booking_id} className="border rounded p-4">
                <div className="flex justify-between">
                  <div>
                    <p className="font-semibold">Booking #{booking.booking_id}</p>
                    <p className="text-sm text-gray-600">
                      {new Date(booking.check_in).toLocaleDateString()} -
                      {new Date(booking.check_out).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded text-sm ${
                    booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                    booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {booking.status}
                  </span>
                </div>
                <p className="mt-2 text-lg font-bold">${booking.total_price}</p>
              </div>
            ))}
          </div>
          {bookings.length === 0 && <p className="text-gray-600">No bookings found</p>}
          {bookings.length > 5 && (
            <p className="mt-4 text-gray-600">
              Showing 5 of {bookings.length} bookings
            </p>
          )}
        </div>
      )}

      {/* Redux DevTools Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-2">Redux DevTools</h2>
        <p className="text-gray-700">
          Open your browser's Redux DevTools to inspect:
        </p>
        <ul className="list-disc list-inside mt-2 text-gray-700">
          <li>State tree (auth, properties, bookings)</li>
          <li>Action history (login, fetchProperties, etc.)</li>
          <li>Time-travel debugging</li>
          <li>State diffs between actions</li>
        </ul>
      </div>
    </div>
  );
}
