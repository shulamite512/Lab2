



CREATE DATABASE IF NOT EXISTS airbnb_clone;
USE airbnb_clone;

-- USERS TABLE

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  user_type ENUM('traveler', 'owner') NOT NULL,
  location VARCHAR(255),
  phone_number VARCHAR(20),
  about_me TEXT,
  city VARCHAR(100),
  country VARCHAR(100),
  languages VARCHAR(255),
  gender VARCHAR(50),
  profile_picture VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- PROPERTIES TABLE

CREATE TABLE IF NOT EXISTS properties (
  id INT AUTO_INCREMENT PRIMARY KEY,
  owner_id INT NOT NULL,
  property_name VARCHAR(255) NOT NULL,
  property_type VARCHAR(100),
  location VARCHAR(255),
  street_address VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(100),
  zip_code VARCHAR(20),
  description TEXT,
  price_per_night DECIMAL(10,2) NOT NULL,
  bedrooms INT DEFAULT 1,
  bathrooms INT DEFAULT 1,
  max_guests INT DEFAULT 2,
  check_in_time TIME DEFAULT '15:00:00',
  check_out_time TIME DEFAULT '11:00:00',
  amenities TEXT,
  photos JSON,
  availability_start DATE,
  availability_end DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);


-- BOOKINGS TABLE

CREATE TABLE IF NOT EXISTS bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  property_id INT NOT NULL,
  traveler_id INT NOT NULL,
  owner_id INT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  number_of_guests INT NOT NULL,
  total_price DECIMAL(10,2),
  status ENUM('PENDING','ACCEPTED','CANCELLED') DEFAULT 'PENDING',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (traveler_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);


-- BLOCKED DATES TABLE

CREATE TABLE IF NOT EXISTS blocked_dates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  property_id INT NOT NULL,
  booking_id INT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);


-- FAVORITES TABLE

CREATE TABLE IF NOT EXISTS favorites (
  traveler_id INT NOT NULL,
  property_id INT NOT NULL,
  PRIMARY KEY (traveler_id, property_id),
  FOREIGN KEY (traveler_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
);


CREATE INDEX idx_properties_location ON properties(location);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_owner_id ON bookings(owner_id);
CREATE INDEX idx_bookings_traveler_id ON bookings(traveler_id);
CREATE INDEX idx_blocked_dates_property_id ON blocked_dates(property_id);

INSERT INTO users (name, email, password, user_type, location)
VALUES ('Test Owner', 'owner@test.com', 'hashed_pw', 'owner', 'New York'),
       ('Test Traveler', 'traveler@test.com', 'hashed_pw', 'traveler', 'San Jose');

INSERT INTO properties (owner_id, property_name, property_type, location, description, price_per_night, bedrooms, bathrooms, max_guests)
VALUES (1, 'Modern Loft NYC', 'Apartment', 'New York', 'A cozy modern apartment', 180.00, 2, 1, 4);

-- =========================================================
-- SERVICES REQUESTS TABLE

CREATE TABLE IF NOT EXISTS services_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  service_id VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
