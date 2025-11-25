# Airbnb Clone - Full-Stack Application

A comprehensive full-stack Airbnb clone with AI-powered travel planning, built with Node.js, Express.js, MySQL, React, and Python FastAPI.

## Features

### Traveler Features
-  Signup/Login with secure password hashing (bcrypt)
-  Session-based authentication
-  Complete profile management (name, email, phone, about me, city, state, country, languages, gender)
-  Profile picture upload
-  Property search and browsing with auto-generated images (Pexels API)
-  Property details view with photo gallery
-  Create booking requests (PENDING status)
-  View all bookings (Pending, Accepted, Cancelled)
-  Cancel bookings
-  Add/remove favorites with heart icon
-  Booking history tracking
-  **AI Travel Concierge** - Personalized trip planning chatbot
-  Trip detail page with AI-generated itineraries

### Owner Features
-  Signup/Login with owner-specific dashboard
-  Complete profile management with profile picture
-  **Add/Edit/Delete properties** with full CRUD operations
-  Property management with detailed address fields (street, city, state, zip)
-  Auto-generated property photos via Pexels API
-  Upload custom property photos (multi-image support)
-  View booking requests with real-time notifications
-  Accept bookings (changes status to ACCEPTED, blocks dates automatically)
-  Cancel bookings (changes status to CANCELLED, releases dates)
-  **Real-time SSE notifications** for new booking requests
-  Dashboard with pending requests count badge
-  **AI Assistant** - Answer questions about properties and bookings

### AI-Powered Features
-  **Intelligent Travel Concierge Chatbot**:
  - Context-aware conversations with memory
  - Real-time web search via Tavily API
  - OpenAI GPT-4 powered responses
  - Automatic booking context detection
  - Owner property database integration

-  **Trip Planning**:
  - Day-by-day personalized itineraries
  - Morning, afternoon, and evening activity recommendations
  - Budget-aware suggestions (economical/moderate/luxury)
  - Interest-based filtering (hiking, food, museums, etc.)

-  **Smart Recommendations**:
  - Restaurant suggestions with dietary filters (vegan, halal, gluten-free)
  - Real-time web search for local attractions
  - Weather-aware packing checklists
  - Accessibility information (wheelchair-friendly, child-friendly)

### General Features
-  Responsive design with modern TailwindCSS
-  Pexels API integration for beautiful property images
-  CORS configured for local development
-  RESTful API architecture
- MySQL database with proper foreign key relationships
-  Comprehensive error handling and validation
-  Zustand for global state management

## Technology Stack

### Backend
- **Runtime**: Node.js v16+
- **Framework**: Express.js 5.1
- **Database**: MySQL 8.0 (XAMPP)
- **Authentication**: express-session + bcryptjs
- **File Upload**: Multer
- **Image API**: Pexels API
- **Real-time**: Server-Sent Events (SSE)

### Frontend
- **Framework**: React 19.1
- **Routing**: React Router DOM 7.9
- **State Management**: Zustand 5.0
- **Styling**: TailwindCSS 4.1
- **HTTP Client**: Fetch API
- **Build Tool**: Vite 7.1
- **Icons**: Unicode/Emoji

### AI Agent Service
- **Language**: Python 3.9+
- **Framework**: FastAPI + Uvicorn
- **AI**: LangChain + OpenAI GPT-4
- **Web Search**: Tavily API
- **Database**: MySQL Connector (connection pooling)
- **Environment**: python-dotenv
- **Features**:
  - Day-by-day trip planning
  - Restaurant recommendations
  - Packing checklists
  - Natural language conversation with memory
  - Real-time web search integration

## Prerequisites

- **Node.js** (v16 or higher)
- **Python** (v3.9 or higher)
- **XAMPP** (for MySQL database)
- **Git**
- **OpenAI API Key** (for AI agent) - [Get one here](https://platform.openai.com/api-keys)
- **Tavily API Key** (for web search) - [Get free key here](https://tavily.com)
- **Pexels API Key** (optional, for custom property images)

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd Lab1
```

### 2. Database Setup

**Docker Compose (Recommended)**:
```bash
docker compose up -d
# Schema and seed data run automatically on first startup
```

**Manual Setup (XAMPP)**:
1. Start XAMPP MySQL on port 3306
2. Create database `airbnb_clone`
3. Import schema: `mysql -u root -p airbnb_clone < db/db_schema.sql`
4. Seed data: `./db/seed-database.sh` or `docker exec -i airbnb-mysql mysql -u root -prootpassword airbnb_clone < db/seed_data.sql`

**Reset Database**: `docker compose down -v && docker compose up -d`

### 3. Environment Configuration

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` and add your API keys:

```env
# OpenAI API Key (required for AI features)
OPENAI_API_KEY=sk-proj-your_key_here

# Tavily API Key (required for web search)
TAVILY_API_KEY=tvly-your_key_here

# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=airbnb_clone
```

### 4. Backend Setup

```bash
cd backend1

# Install dependencies
npm install

# Start the backend server
node server.js
```

The backend will run on **http://localhost:3001**

### 5. Frontend Setup

```bash
cd airbnb-ui

# Install dependencies
npm install

# Start the development server
npm run dev
```

The frontend will run on **http://localhost:5173**

### 6. AI Agent Setup

```bash
# Install Python dependencies
pip install fastapi uvicorn langchain langchain-openai langchain-community tavily-python mysql-connector-python python-dotenv pydantic

# Start the AI agent service
python ai_agent.py
```

The AI agent will run on **http://localhost:8000**

**Verify AI Service:**
```bash
curl http://localhost:8000/api/agent/health
# Should return: {"status":"OK","tavily_configured":true,"llm_configured":true,"database_configured":true}
```

### 7. Access the Application

Open your browser and navigate to:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **AI Agent API**: http://localhost:8000
- **phpMyAdmin**: http://localhost/phpmyadmin

## Project Structure

```
Lab1/
├── backend1/                      # Backend (Node.js + Express)
│   ├── routes/
│   │   ├── auth.js               # Authentication routes
│   │   ├── traveler.js           # Traveler-specific routes
│   │   ├── owner.js              # Owner routes + DELETE property
│   │   ├── property.js           # Public property routes
│   │   ├── booking.js            # Booking routes
│   │   ├── upload.js             # File upload (profile + property)
│   │   ├── gallery.js            # Gallery management
│   │   └── services.js           # Services marketplace
│   ├── services/
│   │   ├── pexelsService.js      # Pexels API integration
│   │   └── notificationService.js # SSE notifications
│   ├── middleware/
│   │   └── authMiddleware.js     # Authentication middleware
│   ├── uploads/                  # Uploaded files storage
│   ├── server.js                 # Main server file
│   └── package.json
│
├── airbnb-ui/                    # Frontend (React + Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── NavBar.jsx        # Navigation with notifications
│   │   │   ├── SearchPill.jsx    # Search component
│   │   │   ├── PropertyCard.jsx  # Property card component
│   │   │   └── AIChatbot.jsx     # AI Travel Concierge UI
│   │   ├── pages/
│   │   │   ├── HomePage.jsx              # Property listing
│   │   │   ├── AuthPage.jsx              # Login/Signup
│   │   │   ├── PropertyDetailPage.jsx    # Property details + booking
│   │   │   ├── FavoritesPage.jsx         # Favorites list
│   │   │   ├── TripsPage.jsx             # Traveler bookings
│   │   │   ├── TripDetailPage.jsx        # Trip details with AI
│   │   │   ├── TravelerProfilePage.jsx   # Traveler profile
│   │   │   ├── OwnerDashboardPage.jsx    # Owner dashboard + SSE
│   │   │   ├── OwnerPropertiesPage.jsx   # CRUD properties
│   │   │   ├── OwnerProfilePage.jsx      # Owner profile
│   │   │   ├── ServicesPage.jsx          # Services marketplace
│   │   │   └── ServiceRequestPage.jsx    # Service requests
│   │   ├── services/
│   │   │   ├── ServicesHero.jsx
│   │   │   ├── ServicesFilters.jsx
│   │   │   └── ServiceCard.jsx
│   │   ├── lib/
│   │   │   └── api.js            # API client with all endpoints
│   │   ├── store/
│   │   │   └── authStore.js      # Zustand auth state
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
│
├── ai_agent.py                   # AI Agent Service (FastAPI)
├── db_schema.sql                 # Database schema
├── migration_add_property_columns.sql  # Migration script
├── .env                          # Environment variables
├── .env.example                  # Example environment file
└── README.md                     # This file
```

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user

### Traveler Routes
- `GET /api/traveler/profile` - Get traveler profile
- `PUT /api/traveler/profile` - Update profile
- `GET /api/traveler/favorites` - Get favorites
- `POST /api/traveler/favorites/:propertyId` - Add favorite
- `DELETE /api/traveler/favorites/:propertyId` - Remove favorite
- `GET /api/traveler/history` - Get booking history

### Owner Routes
- `GET /api/owner/profile` - Get owner profile
- `PUT /api/owner/profile` - Update profile
- `GET /api/owner/properties` - Get all properties
- `POST /api/owner/properties` - Create property
- `PUT /api/owner/properties/:id` - Update property
- `DELETE /api/owner/properties/:id` - **Delete property** 
- `GET /api/owner/dashboard` - Get dashboard data
- `GET /api/owner/notifications/stream` - SSE notifications

### Property Routes
- `GET /api/properties` - Get all properties
- `GET /api/properties/search` - Search properties
- `GET /api/properties/:id` - Get property details

### Booking Routes
- `POST /api/bookings` - Create booking
- `GET /api/bookings` - Get user bookings
- `GET /api/bookings/:id` - Get booking details
- `PUT /api/bookings/:id/accept` - Accept booking (owner)
- `PUT /api/bookings/:id/cancel` - Cancel booking

### Upload Routes
- `POST /api/upload/property/:id` - Upload property photo
- `POST /api/upload/profile` - Upload profile picture

### AI Agent Routes
- `POST /api/agent/plan` - Generate trip plan
- `POST /api/agent/query` - Natural language query
- `GET /api/agent/health` - Health check

## Usage Guide

### For Travelers

1. **Sign Up**:
   - Click "Log in" in the navbar
   - Switch to "Create a new account"
   - Select "Book places (Traveler)"
   - Fill in your details and sign up

2. **Browse Properties**:
   - View properties on the homepage with auto-generated images
   - Use search filters for location, dates, and guests
   - Click any property card to see full details

3. **Make a Booking**:
   - On property details page, select dates and number of guests
   - Click "Reserve" to create a booking request (PENDING status)
   - View your bookings in the "Trips" page
   - Wait for owner to accept your request

4. **Use AI Travel Concierge**:
   - Click the purple chatbot button in bottom-right corner
   - Your latest booking will auto-load
   - Set preferences (budget, interests, dietary needs)
   - Click "Generate Plan" for AI-powered itinerary
   - Ask questions like "What are the best restaurants in [city]?"

5. **Manage Profile**:
   - Click on profile menu → "Profile"
   - Update information, upload profile picture
   - Add city, state, country, languages, etc.

6. **Save Favorites**:
   - Click the heart icon on any property
   - View all favorites in "Favourites" page

### For Owners

1. **Sign Up**:
   - Create account with "List my property (Owner)"
   - Complete your owner profile

2. **Add Property**:
   - Navigate to "Properties" in navbar
   - Click "+ Add Property"
   - Fill in all details:
     - Basic info (name, type, location)
     - Address (street, city, state, zip code)
     - Pricing and capacity
     - Check-in/check-out times
     - Amenities
   - Photos auto-generate from Pexels
   - Click "Create Property"

3. **Edit Property**:
   - Click blue "Edit" button on any property card
   - Modify details in the form
   - Click "Update Property"

4. **Delete Property**:
   - Click red "Delete" button on any property card
   - Confirm deletion in the popup
   - Property and all related bookings will be removed

5. **Manage Bookings**:
   - Go to "Dashboard"
   - See pending requests count badge (🔴 2)
   - View all booking requests with traveler details
   - Click "Accept" or "Decline"
   - Real-time notifications for new requests (SSE)

6. **Ask AI Questions**:
   - Open AI chatbot
   - Ask about your properties: "Do I have a property in Boston?"
   - Get specific answers based on your actual listings

## Database Schema

### Users Table
```sql
CREATE TABLE users (
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
```

### Properties Table
```sql
CREATE TABLE properties (
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
```

### Bookings Table
```sql
CREATE TABLE bookings (
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
```

### AI Conversations Table
```sql
CREATE TABLE ai_conversations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  message TEXT NOT NULL,
  role ENUM('user', 'assistant') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id)
);
```

## AI Features Deep Dive

### Travel Concierge Capabilities

**Context Awareness**:
- Automatically detects user type (traveler/owner)
- Loads latest booking for travelers
- Fetches owner properties from database
- Maintains conversation history per user

**For Travelers**:
- Generates personalized day-by-day itineraries
- Searches web for real-time restaurant data
- Provides weather forecasts for destination
- Creates packing lists based on weather and activities
- Answers questions about bookings and trips

**For Owners**:
- Answers questions about specific properties
- Provides property management advice
- Suggests pricing strategies
- Helps with booking request decisions

**Technology**:
- OpenAI GPT-4 for intelligent responses
- Tavily API for real-time web search
- LangChain for conversation memory
- FastAPI for high-performance API
- MySQL for conversation persistence

## Troubleshooting

### Backend won't start
-  Ensure XAMPP MySQL is running on port 3306
-  Check if port 3001 is available: `netstat -ano | findstr :3001`
-  Verify database `airbnb_clone` exists in phpMyAdmin
-  Check `server.js` database credentials

### Frontend won't start
-  Delete `node_modules` and `package-lock.json`
-  Run `npm install` again
-  Check if port 5173 is available
-  Clear Vite cache: `npm run dev -- --force`

### AI Agent errors
-  Verify `.env` file exists with API keys
-  Check Python version: `python --version` (3.9+)
-  Install missing packages: `pip install -r requirements.txt`
-  Test health endpoint: `curl http://localhost:8000/api/agent/health`

### "Unknown column" errors
-  Run migration script: `node run-migration.js` (from backend1 folder)
-  Or manually run SQL in phpMyAdmin:
```sql
ALTER TABLE properties ADD COLUMN street_address VARCHAR(255) AFTER location;
ALTER TABLE properties ADD COLUMN city VARCHAR(100) AFTER street_address;
ALTER TABLE properties ADD COLUMN state VARCHAR(100) AFTER city;
ALTER TABLE properties ADD COLUMN zip_code VARCHAR(20) AFTER state;
ALTER TABLE properties ADD COLUMN check_in_time TIME DEFAULT '15:00:00' AFTER max_guests;
ALTER TABLE properties ADD COLUMN check_out_time TIME DEFAULT '11:00:00' AFTER check_in_time;
```

### CORS errors
-  Ensure backend is running on port 3001
-  Frontend must be on port 5173 or 5174-5176
-  Check CORS configuration in `backend1/server.js`

### AI not responding
-  Check if AI service is running: `http://localhost:8000/api/agent/health`
-  Verify OpenAI API key is valid and has credits
-  Check Tavily API key if using web search
-  Look at AI service logs for errors

### Property images not showing
-  Check if Pexels service is running
-  Verify internet connection (images are fetched live)
-  Check browser console for image load errors

## New Features Implemented 

1. **Owner Profile Page** - Complete profile management for owners
2. **Property CRUD Operations** - Edit and delete properties with UI
3. **Extended Property Fields** - Street address, city, state, zip code, check-in/check-out times
4. **AI Conversation Memory** - Chatbot remembers context across messages
5. **Owner Property Integration** - AI can answer questions about specific properties
6. **Tavily Web Search** - Real-time web search for restaurants, activities, weather
7. **Smart Booking Selection** - Shows most recent booking, not first one
8. **Database Migration System** - Easy schema updates
9. **python-dotenv Integration** - Clean environment variable management
10. **Enhanced Error Handling** - Better error messages throughout


## Performance Notes

- **Backend**: Handles 100+ concurrent requests with connection pooling
- **Frontend**: Optimized with Vite HMR (Hot Module Replacement)
- **AI Agent**: Async processing with FastAPI for non-blocking requests
- **Database**: Indexed fields for fast queries
- **Images**: Lazy-loaded from Pexels CDN

## Security Features

-  Password hashing with bcryptjs (10 salt rounds)
-  Session-based authentication with httpOnly cookies
-  CORS protection with whitelist
-  SQL injection prevention with parameterized queries
-  File upload validation (size, type)
-  Owner verification for property modifications
-  Environment variables for sensitive data

## License

This project is for educational purposes as part of a lab assignment.

## Submission Checklist

### Core Requirements
-  Backend (Node.js + Express + MySQL)
-  Frontend (React + TailwindCSS + Vite)
-  Authentication (session-based with bcrypt)
-  Traveler features (profile, favorites, trips, booking)
-  Owner features (dashboard, properties management, booking requests)
-  Booking system (PENDING → ACCEPTED → CANCELLED states)
-  Profile management (complete with all fields + photo upload)
-  Responsive design (TailwindCSS)
-  README with complete setup instructions

### Advanced Features
-  **AI Agent Service** (Python + FastAPI + LangChain + Tavily)
  -  Chatbot UI (bottom-right button)
  -  Day-by-day trip planning
  -  Restaurant recommendations
  -  Packing checklist
  -  Natural language queries
  -  Conversation memory
  -  Real-time web search
  -  Owner property integration

### Additional Implementations
-  Owner profile page
-  Property Edit/Delete functionality
-  Real-time SSE notifications
-  Extended property fields (address, check-in times)
-  Database migration system
-  Pexels API integration
-  File upload system

#   L a b 2 _ D S 
 
 