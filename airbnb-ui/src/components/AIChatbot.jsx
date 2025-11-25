import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { bookingsApi, BACKEND_URL } from '../lib/api';

export default function AIChatbot({ booking: propBooking }) {
  const { user, isAuthenticated } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState(null);
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([]);
  const [booking, setBooking] = useState(propBooking || null);
  const [preferences, setPreferences] = useState({
    budget: 'moderate',
    interests: '',
    mobility_needs: '',
    dietary_filters: '',
  });

  // Fetch user's current/upcoming booking if not provided
  useEffect(() => {
    const fetchBooking = async () => {
      if (!propBooking && isAuthenticated && user?.user_type === 'traveler') {
        try {
          const data = await bookingsApi.getAll();
          // Get the most recent upcoming booking (sort by created_at descending)
          const upcomingBookings = data.bookings?.filter(b =>
            b.status === 'ACCEPTED' && new Date(b.start_date) >= new Date()
          ).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

          if (upcomingBookings && upcomingBookings.length > 0) {
            setBooking(upcomingBookings[0]); // Get the most recently created booking
          }
        } catch (error) {
          console.error('Failed to fetch booking:', error);
        }
      }
    };
    fetchBooking();
  }, [propBooking, isAuthenticated, user]);

  const handleGeneratePlan = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/ai/plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_context: {
            booking_id: booking?.id || 0,
            location: booking?.location || 'San Francisco',
            start_date: booking?.start_date || new Date().toISOString().split('T')[0],
            end_date: booking?.end_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            party_type: 'solo',
            number_of_guests: booking?.number_of_guests || 1,
          },
          preferences: {
            budget: preferences.budget,
            interests: preferences.interests ? preferences.interests.split(',').map(i => i.trim()) : [],
            mobility_needs: preferences.mobility_needs || null,
            dietary_filters: preferences.dietary_filters ? preferences.dietary_filters.split(',').map(d => d.trim()) : [],
          },
          user_id: user?.id || null,
        }),
      });

      if (!response.ok) throw new Error('Failed to generate plan');

      const data = await response.json();
      setPlan(data);
      setMessages([
        ...messages,
        { type: 'user', text: 'Generate my trip plan' },
        { type: 'ai', text: data.summary, plan: data },
      ]);
    } catch (error) {
      setMessages([
        ...messages,
        { type: 'error', text: 'Failed to generate plan. Please try again later.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuery = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setMessages([...messages, { type: 'user', text: query }]);
    setLoading(true);

    try {
      const requestBody = {
        booking_context: {
          booking_id: booking?.id || 0,
          location: booking?.location || 'San Francisco',
          start_date: booking?.start_date || new Date().toISOString().split('T')[0],
          end_date: booking?.end_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          party_type: 'solo',
          number_of_guests: 1,
        },
        preferences: {
          budget: preferences.budget,
          interests: [],
          dietary_filters: [],
        },
        custom_query: query,
        user_id: user?.id || null,
        user_type: user?.user_type || 'guest',
        user_name: user?.name || 'Guest',
      };

      console.log('Sending to AI agent:', requestBody);
      console.log('User object:', user);

      const response = await fetch(`${BACKEND_URL}/ai/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      setMessages([...messages, { type: 'user', text: query }, { type: 'ai', text: data.response }]);
      setQuery('');
    } catch (error) {
      setMessages([...messages, { type: 'error', text: 'Failed to process query' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Chatbot Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-full shadow-lg hover:shadow-xl flex items-center justify-center text-2xl z-50"
      >
        {isOpen ? '✕' : '🤖'}
      </button>

      {/* Chatbot Panel - Responsive */}
      {isOpen && (
        <div
          className="fixed inset-0 md:inset-auto md:bottom-24 md:right-6 md:w-96 md:h-[600px] w-full h-full bg-white md:rounded-2xl shadow-2xl flex flex-col z-50 md:border opaque-surface"
        >
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-pink-500 to-purple-500 text-white md:rounded-t-2xl flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold">AI Travel Concierge</h3>
              <p className="text-sm opacity-90">
                {booking ? `Trip to ${booking.location}` : user?.user_type === 'owner' ? 'Owner Assistant' : 'Plan your perfect trip!'}
              </p>
            </div>
            <div className="flex gap-2">
              {/* Clear chat button */}
              {messages.length > 0 && (
                <button
                  onClick={() => setMessages([])}
                  className="text-white text-sm hover:bg-white/20 px-2 py-1 rounded"
                  title="Clear chat history"
                >
                  🗑️
                </button>
              )}
              {/* Close button for mobile */}
              <button
                onClick={() => setIsOpen(false)}
                className="md:hidden text-white text-2xl"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white opaque-surface">
            {messages.length === 0 && (
              <div className="text-center text-gray-500 mt-4">
                <p className="mb-4">👋 Hi! I'm your AI travel assistant!</p>
                {booking ? (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-left mb-4">
                    <p className="text-sm font-semibold text-blue-800 mb-1">Your Current Trip:</p>
                    <p className="text-xs text-blue-700">📍 {booking.location}</p>
                    <p className="text-xs text-blue-700">📅 {new Date(booking.start_date).toLocaleDateString()} - {new Date(booking.end_date).toLocaleDateString()}</p>
                    <p className="text-xs text-blue-700">👥 {booking.number_of_guests} guest{booking.number_of_guests > 1 ? 's' : ''}</p>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 mb-4">No upcoming trip found. I can still help plan your next adventure!</p>
                )}
                <p className="text-sm">Set your preferences below and I'll create a personalized trip plan for you.</p>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] p-3 rounded-lg ${
                    msg.type === 'user'
                      ? 'bg-purple-500 text-white'
                      : msg.type === 'error'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                  style={{
                    backgroundColor:
                      msg.type === 'user'
                        ? '#a855f7'
                        : msg.type === 'error'
                        ? '#fee2e2'
                        : '#f3f4f6',
                    opacity: 1,
                  }}
                >
                  <p className="text-sm">{msg.text}</p>

                  {/* Display Plan */}
                  {msg.plan && (
                    <div className="mt-3 space-y-2">
                      <div className="bg-white p-2 rounded text-gray-800 opaque-surface">
                        <p className="font-semibold text-xs mb-1">Day-by-Day Plan:</p>
                        {msg.plan.day_plans?.map((day, i) => (
                          <div key={i} className="text-xs mb-2 border-b pb-1">
                            <p className="font-bold text-purple-600">Day {day.day}:</p>
                            {day.morning && day.morning[0] && (
                              <p className="ml-2">☀️ Morning: {day.morning[0].title}</p>
                            )}
                            {day.afternoon && day.afternoon[0] && (
                              <p className="ml-2">🌤️ Afternoon: {day.afternoon[0].title}</p>
                            )}
                            {day.evening && day.evening[0] && (
                              <p className="ml-2">🌙 Evening: {day.evening[0].title}</p>
                            )}
                          </div>
                        ))}
                      </div>

                      {msg.plan.restaurant_recommendations && msg.plan.restaurant_recommendations.length > 0 && (
                        <div className="bg-white p-2 rounded text-gray-800 opaque-surface">
                          <p className="font-semibold text-xs mb-1">Restaurants:</p>
                          {msg.plan.restaurant_recommendations.slice(0, 3).map((rest, i) => (
                            <p key={i} className="text-xs">🍽️ {rest.name} - {rest.cuisine}</p>
                          ))}
                        </div>
                      )}

                      <div className="bg-white p-2 rounded text-gray-800 opaque-surface">
                        <p className="font-semibold text-xs mb-1">Packing List:</p>
                        <p className="text-xs">{msg.plan.packing_checklist?.slice(0, 5).join(', ')}...</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 p-3 rounded-lg">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Preferences & Input */}
          <div className="p-4 border-t bg-white space-y-3 opaque-surface">
            {/* Preferences */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <select
                value={preferences.budget}
                onChange={(e) => setPreferences({ ...preferences, budget: e.target.value })}
                className="px-2 py-1 border rounded bg-white opaque-surface"
              >
                <option value="budget">Budget</option>
                <option value="moderate">Moderate</option>
                <option value="luxury">Luxury</option>
              </select>

              <input
                type="text"
                placeholder="Interests (hiking, food)"
                value={preferences.interests}
                onChange={(e) => setPreferences({ ...preferences, interests: e.target.value })}
                className="px-2 py-1 border rounded text-xs bg-white opaque-surface"
              />

              <input
                type="text"
                placeholder="Dietary (vegan, halal)"
                value={preferences.dietary_filters}
                onChange={(e) => setPreferences({ ...preferences, dietary_filters: e.target.value })}
                className="px-2 py-1 border rounded text-xs bg-white opaque-surface"
              />

              <button
                onClick={handleGeneratePlan}
                disabled={loading}
                className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 text-xs"
              >
                Generate Plan
              </button>
            </div>

            {/* Query Input */}
            <form onSubmit={handleQuery} className="flex gap-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask me anything about your trip..."
                className="flex-1 px-3 py-2 border rounded-lg text-sm bg-white opaque-surface"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
