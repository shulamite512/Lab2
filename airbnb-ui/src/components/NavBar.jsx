import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { useEffect, useState } from "react";
import SearchPill from "./SearchPill.jsx";
import { ownerApi, BACKEND_URL } from "../lib/api";

export default function NavBar() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading, logout, initAuth } = useAuthStore();
  const [showMenu, setShowMenu] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    // Initialize auth state - 401 is expected when not logged in
    const initializeAuth = async () => {
      try {
        await initAuth();
      } catch (error) {
        // Silently handle auth errors (user not logged in)
        // 401 is expected when user is not authenticated
      }
    };
    initializeAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // initAuth is stable from Zustand, safe to omit from deps

  // Fetch pending requests count for owners and poll periodically
  useEffect(() => {
    let mounted = true;
    let timer;
    let es;

    const fetchPending = async () => {
      try {
        if (user?.user_type === 'owner') {
          const data = await ownerApi.getDashboard();
          const count = (data.pendingRequests && Array.isArray(data.pendingRequests)) ? data.pendingRequests.length : 0;
          if (mounted) setPendingCount(count);
        } else {
          if (mounted) setPendingCount(0);
        }
      } catch (e) {
        // ignore network/auth errors
      }
    };

    // SSE subscription (real-time)
    const startSSE = () => {
      try {
        if (!(window.EventSource)) return;
        es = new EventSource(`${BACKEND_URL}/owner/notifications/stream`, { withCredentials: true });

        es.addEventListener('new_booking', (e) => {
          try {
            const payload = JSON.parse(e.data);
            // increment badge
            setPendingCount((c) => c + 1);
            // show toast
            const id = Date.now();
            setToasts((t) => [...t, { id, message: 'New booking request received', data: payload }] );
            // auto-dismiss
            setTimeout(() => setToasts((t) => t.filter(x => x.id !== id)), 6000);
          } catch (err) {
            // ignore
          }
        });

        es.onerror = () => {
          // close and fallback to polling; browser will auto-reconnect but we add a manual reconnect
          try { es.close(); } catch (e) {}
          // retry in 5s
          setTimeout(() => startSSE(), 5000);
        };
      } catch (e) {
        // ignore
      }
    };

    fetchPending();
    // Poll every 20s while owner is logged in as a fallback
    if (user?.user_type === 'owner') {
      timer = setInterval(fetchPending, 20000);
      startSSE();
    }

    return () => {
      mounted = false;
      if (timer) clearInterval(timer);
      try { if (es) es.close(); } catch (e) {}
    };
  }, [user]);

  const handleLogout = async () => {
    await logout();
    setShowMenu(false);
    navigate('/');
  };

  if (isLoading) {
    return (
      <header className="sticky top-0 z-50 bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link to="/" className="text-[var(--brand)] text-2xl font-extrabold">airbnb</Link>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
        <Link to="/" className="text-[var(--brand)] text-2xl font-extrabold">airbnb</Link>
        <div className="flex-1 flex justify-center">
          <SearchPill onSearch={(q) => navigate(`/?${new URLSearchParams(q)}`)} />
        </div>
        <nav className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm">
          {isAuthenticated ? (
            <>
              <Link to="/services" className="hover:underline">Services</Link>
              {user?.user_type === 'traveler' && (
                <>
                  <Link to="/favorites" className="hover:underline">Favourites</Link>
                  <Link to="/trips" className="hover:underline">Trips</Link>
                </>
              )}
              {user?.user_type === 'owner' && (
                <>
                  <Link to="/owner/dashboard" className="hover:underline flex items-center gap-2">
                    <span>Dashboard</span>
                    {pendingCount > 0 && (
                      <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-semibold rounded-full bg-red-500 text-white">
                        {pendingCount}
                      </span>
                    )}
                  </Link>
                  <Link to="/owner/properties" className="hover:underline">Properties</Link>
                </>
              )}
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="px-3 py-1.5 rounded-full border flex items-center gap-2 hover:shadow-md"
                >
                  <span>☰</span>
                  <span className="w-6 h-6 rounded-full bg-gray-700 text-white flex items-center justify-center text-xs">
                    {user?.name?.[0]?.toUpperCase()}
                  </span>
                </button>
                {showMenu && (
                  <div
                    className="absolute right-0 mt-2 w-48 rounded-lg shadow-lg py-2 border z-50 bg-white opaque-surface"
                  >
                    <div className="px-4 py-2 border-b opaque-surface">
                      <p className="font-semibold">{user?.name}</p>
                      <p className="text-xs text-gray-500">{user?.email}</p>
                    </div>
                    {user?.user_type === 'traveler' && (
                      <Link
                        to="/profile"
                        onClick={() => setShowMenu(false)}
                        className="block w-full text-left px-4 py-2 hover:bg-gray-100 opaque-surface"
                      >
                        Profile
                      </Link>
                    )}
                    {user?.user_type === 'owner' && (
                      <Link
                        to="/owner/profile"
                        onClick={() => setShowMenu(false)}
                        className="block w-full text-left px-4 py-2 hover:bg-gray-100 opaque-surface"
                      >
                        Profile
                      </Link>
                    )}
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 opaque-surface"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <Link to="/auth" className="px-3 py-1.5 rounded-full border hover:shadow-md">Log in</Link>
          )}
        </nav>
      </div>
      {/* Toasts */}
      <div className="fixed top-16 right-4 z-50 space-y-2">
        {toasts.map(t => (
          <div key={t.id} className="bg-white border shadow px-4 py-2 rounded-md text-sm">
            {t.message}
          </div>
        ))}
      </div>
    </header>
  );
}
