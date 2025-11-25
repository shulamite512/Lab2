// Single Backend URL (all routes are on the same backend)
// Use relative URL when running in Docker (nginx proxies /api to backend)
// Use absolute URL for local development
// Check if VITE_BACKEND_URL is set, otherwise use relative URL for production builds
export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '/api';

// Base host used for serving uploaded files (strip the /api suffix)
export const FILE_BASE_URL = BACKEND_URL.replace(/\/api\/?$/, '');

// Normalize image/file URLs returned from the backend. If the path is a
// relative upload path (e.g. "/uploads/xyz.jpg"), use it as-is (nginx will proxy it)
// or prefix with backend host if using absolute URLs
export function resolveImageUrl(path) {
    const fallback = 'https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=600';
    if (!path) return fallback;
    try {
        if (typeof path !== 'string') return fallback;
        const trimmed = path.trim();
        if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
        // If path starts with /, use it as-is (nginx will proxy /uploads to backend)
        if (trimmed.startsWith('/')) return trimmed;
        // otherwise treat as relative and prefix
        return FILE_BASE_URL ? `${FILE_BASE_URL}/${trimmed}` : `/${trimmed}`;
    } catch (e) {
        return fallback;
    }
}

// Utility function for API calls
async function fetchApi(endpoint, options = {}) {
    const response = await fetch(`${BACKEND_URL}${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
        credentials: 'include', // Important for session handling
    });

    if (!response.ok) {
        // Try to parse error response, but handle cases where response isn't JSON
        let error;
        try {
            error = await response.json();
        } catch {
            error = { error: response.statusText || `HTTP ${response.status}` };
        }
        const errorMessage = error.error || error.message || response.statusText || `HTTP ${response.status}`;
        const httpError = new Error(errorMessage);
        httpError.status = response.status;
        httpError.response = response;
        throw httpError;
    }

    return response.json();
}

// Authentication API
export const authApi = {
    signup: (userData) => fetchApi('/auth/signup', {
        method: 'POST',
        body: JSON.stringify(userData),
    }),

    login: (credentials) => fetchApi('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
    }),

    logout: () => fetchApi('/auth/logout', { method: 'POST' }),

    getCurrentUser: () => fetchApi('/auth/me'),
};

// Properties API
export const propertiesApi = {
    getAll: async (filters = {}) => {
        const queryString = new URLSearchParams(filters).toString();
        const response = await fetch(`${BACKEND_URL}/properties${queryString ? `?${queryString}` : ''}`, {
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: response.statusText }));
            throw new Error(error.error || response.statusText);
        }
        return response.json();
    },

    search: async (filters = {}) => {
        const queryString = new URLSearchParams(filters).toString();
        const response = await fetch(`${BACKEND_URL}/properties/search${queryString ? `?${queryString}` : ''}`, {
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: response.statusText }));
            throw new Error(error.error || response.statusText);
        }
        return response.json();
    },

    getById: async (id) => {
        const response = await fetch(`${BACKEND_URL}/properties/${id}`, {
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: response.statusText }));
            throw new Error(error.error || response.statusText);
        }
        return response.json();
    },
};

// Traveler API
export const travelerApi = {
    getProfile: () => fetchApi('/traveler/profile'),

    updateProfile: (profileData) => fetchApi('/traveler/profile', {
        method: 'PUT',
        body: JSON.stringify(profileData),
    }),

    getFavorites: () => fetchApi('/traveler/favorites'),

    addFavorite: (propertyId) => fetchApi(`/traveler/favorites/${propertyId}`, {
        method: 'POST',
    }),

    removeFavorite: (propertyId) => fetchApi(`/traveler/favorites/${propertyId}`, {
        method: 'DELETE',
    }),

    getHistory: () => fetchApi('/traveler/history'),
};

// Owner API
export const ownerApi = {
    getProfile: () => fetchApi('/owner/profile'),

    updateProfile: (profileData) => fetchApi('/owner/profile', {
        method: 'PUT',
        body: JSON.stringify(profileData),
    }),

    getProperties: () => fetchApi('/owner/properties'),

    createProperty: (propertyData) => fetchApi('/owner/properties', {
        method: 'POST',
        body: JSON.stringify(propertyData),
    }),

    updateProperty: (propertyId, propertyData) => fetchApi(`/owner/properties/${propertyId}`, {
        method: 'PUT',
        body: JSON.stringify(propertyData),
    }),

    deleteProperty: (propertyId) => fetchApi(`/owner/properties/${propertyId}`, {
        method: 'DELETE',
    }),

    getDashboard: () => fetchApi('/owner/dashboard'),
};

// Bookings API
export const bookingsApi = {
    create: async (bookingData) => {
        const response = await fetch(`${BACKEND_URL}/bookings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(bookingData),
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: response.statusText }));
            throw new Error(error.error || response.statusText);
        }
        return response.json();
    },

    getAll: async () => {
        const response = await fetch(`${BACKEND_URL}/bookings`, {
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: response.statusText }));
            throw new Error(error.error || response.statusText);
        }
        return response.json();
    },

    getById: async (bookingId) => {
        const response = await fetch(`${BACKEND_URL}/bookings/${bookingId}`, {
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: response.statusText }));
            throw new Error(error.error || response.statusText);
        }
        return response.json();
    },

    accept: async (bookingId) => {
        const response = await fetch(`${BACKEND_URL}/bookings/${bookingId}/accept`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: response.statusText }));
            throw new Error(error.error || response.statusText);
        }
        return response.json();
    },

    cancel: async (bookingId) => {
        const response = await fetch(`${BACKEND_URL}/bookings/${bookingId}/cancel`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: response.statusText }));
            throw new Error(error.error || response.statusText);
        }
        return response.json();
    },
};

// Upload API
export const uploadApi = {
    propertyPhoto: async (propertyId, file) => {
        const formData = new FormData();
        formData.append('photo', file);

        const response = await fetch(`${BACKEND_URL}/upload/property/${propertyId}`, {
            method: 'POST',
            body: formData,
            credentials: 'include',
        });

        if (!response.ok) {
            throw new Error('Upload failed');
        }

        return response.json();
    },

    profilePicture: async (file) => {
        const formData = new FormData();
        formData.append('photo', file);

        const response = await fetch(`${BACKEND_URL}/upload/profile`, {
            method: 'POST',
            body: formData,
            credentials: 'include',
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = 'Upload failed';
            try {
                const errorJson = JSON.parse(errorText);
                errorMessage = errorJson.error || errorMessage;
            } catch {
                errorMessage = errorText || errorMessage;
            }
            throw new Error(errorMessage);
        }

        return response.json();
    },
};
