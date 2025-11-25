-- Seed Data for Airbnb Clone
USE airbnb_clone;

-- Add more properties for testing
INSERT INTO properties (owner_id, property_name, property_type, location, street_address, city, state, zip_code, description, price_per_night, bedrooms, bathrooms, max_guests, amenities, is_active)
VALUES 
  (1, 'Cozy Beach House', 'House', 'San Francisco', '123 Ocean Drive', 'San Francisco', 'CA', '94102', 'Beautiful beachfront property with stunning ocean views', 250.00, 3, 2, 6, '["WiFi", "Kitchen", "Parking", "Beach Access"]', TRUE),
  (1, 'Downtown Loft', 'Apartment', 'San Francisco', '456 Market St', 'San Francisco', 'CA', '94103', 'Modern loft in the heart of downtown', 200.00, 2, 1, 4, '["WiFi", "Kitchen", "Gym Access"]', TRUE),
  (1, 'Mountain Cabin', 'House', 'Lake Tahoe', '789 Mountain Rd', 'Lake Tahoe', 'CA', '96150', 'Rustic cabin with fireplace and mountain views', 300.00, 4, 3, 8, '["WiFi", "Kitchen", "Fireplace", "Hot Tub"]', TRUE),
  (1, 'City Studio', 'Apartment', 'New York', '321 Broadway', 'New York', 'NY', '10001', 'Compact studio perfect for solo travelers', 150.00, 1, 1, 2, '["WiFi", "Kitchenette"]', TRUE),
  (1, 'Luxury Penthouse', 'Apartment', 'Los Angeles', '999 Sunset Blvd', 'Los Angeles', 'CA', '90069', 'Stunning penthouse with panoramic city views', 500.00, 3, 3, 6, '["WiFi", "Kitchen", "Pool", "Gym", "Concierge"]', TRUE),
  (1, 'Garden Cottage', 'House', 'Portland', '555 Garden Ave', 'Portland', 'OR', '97201', 'Charming cottage with beautiful garden', 180.00, 2, 1, 4, '["WiFi", "Kitchen", "Garden"]', TRUE),
  (1, 'Modern Condo', 'Apartment', 'Seattle', '777 Pike St', 'Seattle', 'WA', '98101', 'Contemporary condo with city views', 220.00, 2, 2, 4, '["WiFi", "Kitchen", "Balcony"]', TRUE),
  (1, 'Desert Oasis', 'House', 'Phoenix', '888 Desert Way', 'Phoenix', 'AZ', '85001', 'Beautiful desert home with pool', 280.00, 3, 2, 6, '["WiFi", "Kitchen", "Pool", "BBQ"]', TRUE);

-- Add some bookings for testing (using existing users)
INSERT INTO bookings (property_id, traveler_id, owner_id, start_date, end_date, number_of_guests, total_price, status)
VALUES 
  (1, 2, 1, DATE_ADD(CURDATE(), INTERVAL 7 DAY), DATE_ADD(CURDATE(), INTERVAL 10 DAY), 2, 750.00, 'ACCEPTED'),
  (2, 2, 1, DATE_ADD(CURDATE(), INTERVAL 14 DAY), DATE_ADD(CURDATE(), INTERVAL 17 DAY), 2, 600.00, 'PENDING'),
  (3, 2, 1, DATE_ADD(CURDATE(), INTERVAL 21 DAY), DATE_ADD(CURDATE(), INTERVAL 24 DAY), 4, 900.00, 'ACCEPTED');

-- Add some favorites
INSERT INTO favorites (traveler_id, property_id)
VALUES 
  (2, 1),
  (2, 3),
  (2, 5);

-- Add some blocked dates (for accepted bookings)
INSERT INTO blocked_dates (property_id, booking_id, start_date, end_date)
SELECT property_id, id, start_date, end_date 
FROM bookings 
WHERE status = 'ACCEPTED';

