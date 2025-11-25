import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000/api';
const PROPERTY_API_URL = BACKEND_URL;

// Async thunks for property operations
export const fetchProperties = createAsyncThunk(
  'properties/fetchProperties',
  async ({ location = '', checkIn = '', checkOut = '' } = {}) => {
    const params = new URLSearchParams();
    if (location) params.append('location', location);
    if (checkIn) params.append('checkIn', checkIn);
    if (checkOut) params.append('checkOut', checkOut);

    const response = await axios.get(`${PROPERTY_API_URL}/properties?${params}`);
    return response.data;
  }
);

export const fetchPropertyById = createAsyncThunk(
  'properties/fetchPropertyById',
  async (propertyId) => {
    const response = await axios.get(`${PROPERTY_API_URL}/properties/${propertyId}`);
    return response.data;
  }
);

export const createProperty = createAsyncThunk(
  'properties/createProperty',
  async (propertyData) => {
    const response = await axios.post(
      `${PROPERTY_API_URL}/properties`,
      propertyData,
      { withCredentials: true }
    );
    return response.data;
  }
);

export const updateProperty = createAsyncThunk(
  'properties/updateProperty',
  async ({ propertyId, propertyData }) => {
    const response = await axios.put(
      `${PROPERTY_API_URL}/properties/${propertyId}`,
      propertyData,
      { withCredentials: true }
    );
    return response.data;
  }
);

export const deleteProperty = createAsyncThunk(
  'properties/deleteProperty',
  async (propertyId) => {
    await axios.delete(`${PROPERTY_API_URL}/properties/${propertyId}`, {
      withCredentials: true,
    });
    return propertyId;
  }
);

// Properties slice
const propertiesSlice = createSlice({
  name: 'properties',
  initialState: {
    items: [],
    selectedProperty: null,
    isLoading: false,
    error: null,
    searchFilters: {
      location: '',
      checkIn: '',
      checkOut: '',
    },
  },
  reducers: {
    setSearchFilters: (state, action) => {
      state.searchFilters = { ...state.searchFilters, ...action.payload };
    },
    clearSelectedProperty: (state) => {
      state.selectedProperty = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch properties
    builder
      .addCase(fetchProperties.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchProperties.fulfilled, (state, action) => {
        state.items = action.payload;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(fetchProperties.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message;
      });

    // Fetch property by ID
    builder
      .addCase(fetchPropertyById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPropertyById.fulfilled, (state, action) => {
        state.selectedProperty = action.payload;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(fetchPropertyById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message;
      });

    // Create property
    builder
      .addCase(createProperty.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createProperty.fulfilled, (state, action) => {
        state.items.push(action.payload);
        state.isLoading = false;
        state.error = null;
      })
      .addCase(createProperty.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message;
      });

    // Update property
    builder
      .addCase(updateProperty.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateProperty.fulfilled, (state, action) => {
        const index = state.items.findIndex((p) => p.property_id === action.payload.property_id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        if (state.selectedProperty?.property_id === action.payload.property_id) {
          state.selectedProperty = action.payload;
        }
        state.isLoading = false;
        state.error = null;
      })
      .addCase(updateProperty.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message;
      });

    // Delete property
    builder
      .addCase(deleteProperty.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteProperty.fulfilled, (state, action) => {
        state.items = state.items.filter((p) => p.property_id !== action.payload);
        if (state.selectedProperty?.property_id === action.payload) {
          state.selectedProperty = null;
        }
        state.isLoading = false;
        state.error = null;
      })
      .addCase(deleteProperty.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message;
      });
  },
});

// Selectors
export const selectAllProperties = (state) => state.properties.items;
export const selectSelectedProperty = (state) => state.properties.selectedProperty;
export const selectPropertiesLoading = (state) => state.properties.isLoading;
export const selectPropertiesError = (state) => state.properties.error;
export const selectSearchFilters = (state) => state.properties.searchFilters;

export const { setSearchFilters, clearSelectedProperty, clearError } = propertiesSlice.actions;
export default propertiesSlice.reducer;
