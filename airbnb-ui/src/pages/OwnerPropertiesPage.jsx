import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ownerApi, resolveImageUrl } from '../lib/api';
import { useAuthStore } from '../store/authStore';

export default function OwnerPropertiesPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPropertyId, setEditingPropertyId] = useState(null);
  const [formData, setFormData] = useState({
    property_name: '',
    property_type: 'Apartment',
    location: '',
    street_address: '',
    city: '',
    state: '',
    zip_code: '',
    description: '',
    price_per_night: '',
    bedrooms: 1,
    bathrooms: 1,
    max_guests: 2,
    check_in_time: '15:00',
    check_out_time: '11:00',
    amenities: '',
  });

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated || user?.user_type !== 'owner') {
      navigate('/auth');
      return;
    }
    fetchProperties();
  }, [isAuthenticated, user, isLoading]);

  const fetchProperties = async () => {
    try {
      const data = await ownerApi.getProperties();
      setProperties(data.properties || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      if (editingPropertyId) {
        // Update existing property
        await ownerApi.updateProperty(editingPropertyId, formData);
        setSuccess('Property updated successfully!');
      } else {
        // Create new property
        await ownerApi.createProperty(formData);
        setSuccess('Property created successfully!');
      }
      setShowAddForm(false);
      setEditingPropertyId(null);
      setFormData({
        property_name: '',
        property_type: 'Apartment',
        location: '',
        street_address: '',
        city: '',
        state: '',
        zip_code: '',
        description: '',
        price_per_night: '',
        bedrooms: 1,
        bathrooms: 1,
        max_guests: 2,
        check_in_time: '15:00',
        check_out_time: '11:00',
        amenities: '',
      });
      await fetchProperties();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = (property) => {
    setEditingPropertyId(property.id);
    setFormData({
      property_name: property.property_name || '',
      property_type: property.property_type || 'Apartment',
      location: property.location || '',
      street_address: property.street_address || '',
      city: property.city || '',
      state: property.state || '',
      zip_code: property.zip_code || '',
      description: property.description || '',
      price_per_night: property.price_per_night || '',
      bedrooms: property.bedrooms || 1,
      bathrooms: property.bathrooms || 1,
      max_guests: property.max_guests || 2,
      check_in_time: property.check_in_time || '15:00',
      check_out_time: property.check_out_time || '11:00',
      amenities: property.amenities || '',
    });
    setShowAddForm(true);
    setError('');
    setSuccess('');
  };

  const handleDelete = async (propertyId, propertyName) => {
    if (!window.confirm(`Are you sure you want to delete "${propertyName}"? This action cannot be undone.`)) {
      return;
    }

    setError('');
    setSuccess('');
    try {
      await ownerApi.deleteProperty(propertyId);
      setSuccess('Property deleted successfully!');
      await fetchProperties();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCancelEdit = () => {
    setShowAddForm(false);
    setEditingPropertyId(null);
    setFormData({
      property_name: '',
      property_type: 'Apartment',
      location: '',
      street_address: '',
      city: '',
      state: '',
      zip_code: '',
      description: '',
      price_per_night: '',
      bedrooms: 1,
      bathrooms: 1,
      max_guests: 2,
      check_in_time: '15:00',
      check_out_time: '11:00',
      amenities: '',
    });
    setError('');
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-10 flex justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">My Properties</h1>
        <button
          onClick={() => {
            if (showAddForm) {
              handleCancelEdit();
            } else {
              setShowAddForm(true);
            }
          }}
          className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg font-semibold hover:from-pink-600 hover:to-purple-600"
        >
          {showAddForm ? 'Cancel' : '+ Add Property'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-800 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 text-green-800 rounded-lg">
          {success}
        </div>
      )}

      {/* Add/Edit Property Form */}
      {showAddForm && (
        <div className="mb-8 p-6 border rounded-2xl bg-gray-50">
          <h2 className="text-2xl font-semibold mb-6">
            {editingPropertyId ? 'Edit Property' : 'Add New Property'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Property Name *</label>
                <input
                  type="text"
                  name="property_name"
                  value={formData.property_name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="Modern Downtown Loft"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Property Type *</label>
                <select
                  name="property_type"
                  value={formData.property_type}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  <option value="Apartment">Apartment</option>
                  <option value="House">House</option>
                  <option value="Villa">Villa</option>
                  <option value="Cabin">Cabin</option>
                  <option value="Condo">Condo</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Location *</label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="New York, NY"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Street Address</label>
                <input
                  type="text"
                  name="street_address"
                  value={formData.street_address}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="123 Main Street"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">City</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="New York"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">State</label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="NY"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Zip Code</label>
                <input
                  type="text"
                  name="zip_code"
                  value={formData.zip_code}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="10001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Price per Night ($) *</label>
                <input
                  type="number"
                  name="price_per_night"
                  value={formData.price_per_night}
                  onChange={handleChange}
                  required
                  min="0"
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Bedrooms</label>
                <input
                  type="number"
                  name="bedrooms"
                  value={formData.bedrooms}
                  onChange={handleChange}
                  min="1"
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Bathrooms</label>
                <input
                  type="number"
                  name="bathrooms"
                  value={formData.bathrooms}
                  onChange={handleChange}
                  min="1"
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Max Guests</label>
                <input
                  type="number"
                  name="max_guests"
                  value={formData.max_guests}
                  onChange={handleChange}
                  min="1"
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Check-in Time</label>
                <input
                  type="time"
                  name="check_in_time"
                  value={formData.check_in_time}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Check-out Time</label>
                <input
                  type="time"
                  name="check_out_time"
                  value={formData.check_out_time}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description *</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                rows="3"
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="Describe your property..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Amenities (comma-separated)</label>
              <input
                type="text"
                name="amenities"
                value={formData.amenities}
                onChange={handleChange}
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="WiFi, Kitchen, Pool, Parking"
              />
            </div>

            <button
              type="submit"
              className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600"
            >
              {editingPropertyId ? 'Update Property' : 'Create Property'}
            </button>
          </form>
        </div>
      )}

      {/* Properties List */}
      {properties.length === 0 ? (
        <div className="text-center py-20">
          <h2 className="text-2xl font-semibold mb-4">No properties yet</h2>
          <p className="text-gray-600 mb-6">Start by adding your first property</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((property) => {
            const photos = Array.isArray(property.photos)
              ? property.photos
              : typeof property.photos === 'string'
              ? JSON.parse(property.photos)
              : [];

            return (
              <div key={property.id} className="border rounded-2xl overflow-hidden hover:shadow-md transition">
                <img
                  src={photos[0] ? resolveImageUrl(photos[0]) : resolveImageUrl(null)}
                  alt={property.property_name}
                  className="h-48 w-full object-cover"
                />
                <div className="p-4">
                  <h3 className="text-xl font-semibold mb-2">{property.property_name}</h3>
                  <p className="text-gray-600 mb-2">{property.location}</p>
                  <p className="text-sm text-gray-500 mb-3 line-clamp-2">{property.description}</p>
                  <div className="flex justify-between items-center text-sm text-gray-600 mb-3">
                    <span>{property.bedrooms} bed · {property.bathrooms} bath</span>
                    <span>{property.max_guests} guests</span>
                  </div>
                  <p className="font-bold text-lg mb-3">${property.price_per_night}/night</p>

                  {/* Edit and Delete buttons */}
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => handleEdit(property)}
                      className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(property.id, property.property_name)}
                      className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
