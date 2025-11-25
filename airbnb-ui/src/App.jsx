import { Routes, Route } from "react-router-dom";
import NavBar from "./components/NavBar.jsx";
import HomePage from "./pages/HomePage.jsx";
import ServicesPage from "./pages/ServicesPage.jsx";
import ServiceRequestPage from "./pages/ServiceRequestPage.jsx";
import AuthPage from "./pages/AuthPage.jsx";
import PropertyDetailPage from "./pages/PropertyDetailPage.jsx";
import FavoritesPage from "./pages/FavoritesPage.jsx";
import TripsPage from "./pages/TripsPage.jsx";
import TripDetailPage from "./pages/TripDetailPage.jsx";
import OwnerDashboardPage from "./pages/OwnerDashboardPage.jsx";
import TravelerProfilePage from "./pages/TravelerProfilePage.jsx";
import OwnerPropertiesPage from "./pages/OwnerPropertiesPage.jsx";
import OwnerProfilePage from "./pages/OwnerProfilePage.jsx";

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-white text-gray-900" style={{ backgroundColor: '#ffffff', color: '#111827' }}>
      <NavBar />
      <main className="flex-1 bg-white" style={{ backgroundColor: '#ffffff', color: '#111827' }}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/services/request/:id" element={<ServiceRequestPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/property/:id" element={<PropertyDetailPage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
          <Route path="/trips" element={<TripsPage />} />
          <Route path="/trip/:id" element={<TripDetailPage />} />
          <Route path="/profile" element={<TravelerProfilePage />} />
          <Route path="/owner/dashboard" element={<OwnerDashboardPage />} />
          <Route path="/owner/properties" element={<OwnerPropertiesPage />} />
          <Route path="/owner/profile" element={<OwnerProfilePage />} />
        </Routes>
      </main>
    </div>
  );
}
