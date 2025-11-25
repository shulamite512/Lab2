-- Seed Data for Airbnb Clone
-- This file runs automatically when MySQL container starts for the first time
-- It's placed in /docker-entrypoint-initdb.d/ directory

USE airbnb_clone;

-- Add more properties for testing (only if they don't exist)
INSERT INTO properties (owner_id, property_name, property_type, location, street_address, city, state, zip_code, description, price_per_night, bedrooms, bathrooms, max_guests, amenities, is_active)
SELECT * FROM (
  SELECT 1 as owner_id, 'Cozy Beach House' as property_name, 'House' as property_type, 'San Francisco' as location, '123 Ocean Drive' as street_address, 'San Francisco' as city, 'CA' as state, '94102' as zip_code, 'Beautiful beachfront property with stunning ocean views' as description, 250.00 as price_per_night, 3 as bedrooms, 2 as bathrooms, 6 as max_guests, '["WiFi", "Kitchen", "Parking", "Beach Access"]' as amenities, TRUE as is_active
  UNION ALL SELECT 1, 'Downtown Loft', 'Apartment', 'San Francisco', '456 Market St', 'San Francisco', 'CA', '94103', 'Modern loft in the heart of downtown', 200.00, 2, 1, 4, '["WiFi", "Kitchen", "Gym Access"]', TRUE
  UNION ALL SELECT 1, 'Mountain Cabin', 'House', 'Lake Tahoe', '789 Mountain Rd', 'Lake Tahoe', 'CA', '96150', 'Rustic cabin with fireplace and mountain views', 300.00, 4, 3, 8, '["WiFi", "Kitchen", "Fireplace", "Hot Tub"]', TRUE
  UNION ALL SELECT 1, 'City Studio', 'Apartment', 'New York', '321 Broadway', 'New York', 'NY', '10001', 'Compact studio perfect for solo travelers', 150.00, 1, 1, 2, '["WiFi", "Kitchenette"]', TRUE
  UNION ALL SELECT 1, 'Luxury Penthouse', 'Apartment', 'Los Angeles', '999 Sunset Blvd', 'Los Angeles', 'CA', '90069', 'Stunning penthouse with panoramic city views', 500.00, 3, 3, 6, '["WiFi", "Kitchen", "Pool", "Gym", "Concierge"]', TRUE
  UNION ALL SELECT 1, 'Garden Cottage', 'House', 'Portland', '555 Garden Ave', 'Portland', 'OR', '97201', 'Charming cottage with beautiful garden', 180.00, 2, 1, 4, '["WiFi", "Kitchen", "Garden"]', TRUE
  UNION ALL SELECT 1, 'Modern Condo', 'Apartment', 'Seattle', '777 Pike St', 'Seattle', 'WA', '98101', 'Contemporary condo with city views', 220.00, 2, 2, 4, '["WiFi", "Kitchen", "Balcony"]', TRUE
  UNION ALL SELECT 1, 'Desert Oasis', 'House', 'Phoenix', '888 Desert Way', 'Phoenix', 'AZ', '85001', 'Beautiful desert home with pool', 280.00, 3, 2, 6, '["WiFi", "Kitchen", "Pool", "BBQ"]', TRUE
) AS new_properties
WHERE NOT EXISTS (
  SELECT 1 FROM properties WHERE property_name = new_properties.property_name
);

-- Add some bookings for testing (only if they don't exist)
INSERT INTO bookings (property_id, traveler_id, owner_id, start_date, end_date, number_of_guests, total_price, status)
SELECT * FROM (
  SELECT 1 as property_id, 2 as traveler_id, 1 as owner_id, DATE_ADD(CURDATE(), INTERVAL 7 DAY) as start_date, DATE_ADD(CURDATE(), INTERVAL 10 DAY) as end_date, 2 as number_of_guests, 750.00 as total_price, 'ACCEPTED' as status
  UNION ALL SELECT 2, 2, 1, DATE_ADD(CURDATE(), INTERVAL 14 DAY), DATE_ADD(CURDATE(), INTERVAL 17 DAY), 2, 600.00, 'PENDING'
  UNION ALL SELECT 3, 2, 1, DATE_ADD(CURDATE(), INTERVAL 21 DAY), DATE_ADD(CURDATE(), INTERVAL 24 DAY), 4, 900.00, 'ACCEPTED'
) AS new_bookings
WHERE NOT EXISTS (
  SELECT 1 FROM bookings 
  WHERE property_id = new_bookings.property_id 
    AND traveler_id = new_bookings.traveler_id 
    AND start_date = new_bookings.start_date
);

-- Add some favorites (only if they don't exist)
INSERT IGNORE INTO favorites (traveler_id, property_id)
VALUES 
  (2, 1),
  (2, 3),
  (2, 5);

-- Add blocked dates for accepted bookings (only if they don't exist)
INSERT INTO blocked_dates (property_id, booking_id, start_date, end_date)
SELECT b.property_id, b.id, b.start_date, b.end_date 
FROM bookings b
WHERE b.status = 'ACCEPTED'
  AND NOT EXISTS (
    SELECT 1 FROM blocked_dates bd 
    WHERE bd.property_id = b.property_id 
      AND bd.booking_id = b.id
  );

