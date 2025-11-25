import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authApi } from '../../lib/api';

// Async thunks for auth operations
export const initAuth = createAsyncThunk('auth/initAuth', async (_, { rejectWithValue }) => {
  try {
    const resp = await authApi.getCurrentUser();
    const user = resp?.user ? resp.user : resp;
    return user;
  } catch (error) {
    // 401 is expected when not logged in - don't treat as error
    if (error.message.includes('Unauthorized') || error.message.includes('401')) {
      return rejectWithValue(null);
    }
    return rejectWithValue(error.message);
  }
});

export const login = createAsyncThunk('auth/login', async (credentials) => {
  const data = await authApi.login(credentials);
  return data.user;
});

export const signup = createAsyncThunk('auth/signup', async (userData) => {
  const data = await authApi.signup(userData);
  return data.user;
});

export const logout = createAsyncThunk('auth/logout', async () => {
  await authApi.logout();
});

// Auth slice
const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    isAuthenticated: false,
    // Start idle so the auth form submit button is clickable; requests set this true when pending
    isLoading: false,
    error: null,
  },
  reducers: {
    updateUser: (state, action) => {
      state.user = { ...state.user, ...action.payload };
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Init auth
    builder
      .addCase(initAuth.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(initAuth.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isAuthenticated = !!action.payload;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(initAuth.rejected, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.isLoading = false;
      });

    // Login
    builder
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isAuthenticated = true;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message;
      });

    // Signup
    builder
      .addCase(signup.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(signup.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isAuthenticated = true;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(signup.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message;
      });

    // Logout
    builder
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.error = null;
      });
  },
});

// Selectors
export const selectUser = (state) => state.auth.user;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectIsLoading = (state) => state.auth.isLoading;
export const selectAuthError = (state) => state.auth.error;
export const selectIsOwner = (state) => state.auth.user?.user_type === 'owner';
export const selectIsTraveler = (state) => state.auth.user?.user_type === 'traveler';

export const { updateUser, clearError } = authSlice.actions;
export default authSlice.reducer;
