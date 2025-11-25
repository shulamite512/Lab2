import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000/api';
const BOOKING_API_URL = BACKEND_URL;

// Async thunks for booking operations
export const fetchUserBookings = createAsyncThunk(
  'bookings/fetchUserBookings',
  async () => {
    const response = await axios.get(`${BOOKING_API_URL}/bookings/user`, {
      withCredentials: true,
    });
    return response.data;
  }
);

export const fetchBookingById = createAsyncThunk(
  'bookings/fetchBookingById',
  async (bookingId) => {
    const response = await axios.get(`${BOOKING_API_URL}/bookings/${bookingId}`, {
      withCredentials: true,
    });
    return response.data;
  }
);

export const createBooking = createAsyncThunk(
  'bookings/createBooking',
  async (bookingData) => {
    const response = await axios.post(
      `${BOOKING_API_URL}/bookings`,
      bookingData,
      { withCredentials: true }
    );
    return response.data;
  }
);

export const updateBookingStatus = createAsyncThunk(
  'bookings/updateBookingStatus',
  async ({ bookingId, status }) => {
    const response = await axios.patch(
      `${BOOKING_API_URL}/bookings/${bookingId}/status`,
      { status },
      { withCredentials: true }
    );
    return response.data;
  }
);

export const cancelBooking = createAsyncThunk(
  'bookings/cancelBooking',
  async (bookingId) => {
    const response = await axios.patch(
      `${BOOKING_API_URL}/bookings/${bookingId}/status`,
      { status: 'cancelled' },
      { withCredentials: true }
    );
    return response.data;
  }
);

// Bookings slice
const bookingsSlice = createSlice({
  name: 'bookings',
  initialState: {
    items: [],
    selectedBooking: null,
    isLoading: false,
    error: null,
    filters: {
      status: 'all', // all, pending, confirmed, cancelled, completed
    },
  },
  reducers: {
    setStatusFilter: (state, action) => {
      state.filters.status = action.payload;
    },
    clearSelectedBooking: (state) => {
      state.selectedBooking = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch user bookings
    builder
      .addCase(fetchUserBookings.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchUserBookings.fulfilled, (state, action) => {
        state.items = action.payload;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(fetchUserBookings.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message;
      });

    // Fetch booking by ID
    builder
      .addCase(fetchBookingById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchBookingById.fulfilled, (state, action) => {
        state.selectedBooking = action.payload;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(fetchBookingById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message;
      });

    // Create booking
    builder
      .addCase(createBooking.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createBooking.fulfilled, (state, action) => {
        state.items.push(action.payload);
        state.isLoading = false;
        state.error = null;
      })
      .addCase(createBooking.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message;
      });

    // Update booking status
    builder
      .addCase(updateBookingStatus.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateBookingStatus.fulfilled, (state, action) => {
        const index = state.items.findIndex((b) => b.booking_id === action.payload.booking_id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        if (state.selectedBooking?.booking_id === action.payload.booking_id) {
          state.selectedBooking = action.payload;
        }
        state.isLoading = false;
        state.error = null;
      })
      .addCase(updateBookingStatus.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message;
      });

    // Cancel booking
    builder
      .addCase(cancelBooking.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(cancelBooking.fulfilled, (state, action) => {
        const index = state.items.findIndex((b) => b.booking_id === action.payload.booking_id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        if (state.selectedBooking?.booking_id === action.payload.booking_id) {
          state.selectedBooking = action.payload;
        }
        state.isLoading = false;
        state.error = null;
      })
      .addCase(cancelBooking.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message;
      });
  },
});

// Selectors
export const selectAllBookings = (state) => state.bookings.items;
export const selectFilteredBookings = (state) => {
  const { items, filters } = state.bookings;
  if (filters.status === 'all') {
    return items;
  }
  return items.filter((booking) => booking.status === filters.status);
};
export const selectSelectedBooking = (state) => state.bookings.selectedBooking;
export const selectBookingsLoading = (state) => state.bookings.isLoading;
export const selectBookingsError = (state) => state.bookings.error;
export const selectStatusFilter = (state) => state.bookings.filters.status;

export const { setStatusFilter, clearSelectedBooking, clearError } = bookingsSlice.actions;
export default bookingsSlice.reducer;
