# ai_agent_service.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
from datetime import datetime
import time
import warnings
warnings.filterwarnings("ignore", category=DeprecationWarning)

# Load environment variables from .env file
from dotenv import load_dotenv
load_dotenv()

# Try to import optional AI dependencies
ChatOpenAI = None
TavilySearchResults = None

try:
    from langchain_openai import ChatOpenAI
except Exception as e:
    print(f"Warning: Could not import ChatOpenAI: {e}")
    ChatOpenAI = None

try:
    from langchain_community.tools.tavily_search import TavilySearchResults
except Exception as e:
    print(f"Warning: Could not import TavilySearchResults: {e}")
    TavilySearchResults = None

import mysql.connector
from mysql.connector import pooling

app = FastAPI()

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5000",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:5176"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database connection pool
db_config = {
    "host": os.getenv("DB_HOST", "localhost"),
    "user": os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASSWORD", ""),
    "database": os.getenv("DB_NAME", "airbnb_clone"),
    "pool_name": "mypool",
    "pool_size": 5
}

try:
    connection_pool = pooling.MySQLConnectionPool(**db_config)
except Exception as e:
    print(f"Error creating connection pool: {e}")
    connection_pool = None

# Request Models
class PreferencesModel(BaseModel):
    budget: Optional[str] = "moderate"
    interests: Optional[List[str]] = []
    mobility_needs: Optional[str] = None
    dietary_filters: Optional[List[str]] = []

class BookingContextModel(BaseModel):
    booking_id: int
    location: str
    start_date: str
    end_date: str
    party_type: Optional[str] = "solo"
    number_of_guests: int

class AgentRequestModel(BaseModel):
    booking_context: BookingContextModel
    preferences: PreferencesModel
    custom_query: Optional[str] = None
    user_id: Optional[int] = None  # Add user_id for conversation memory
    user_type: Optional[str] = None  # Add user_type (traveler, owner, etc.)
    user_name: Optional[str] = None  # Add user_name for personalization

# Response Models
class ActivityCard(BaseModel):
    title: str
    address: str
    price_tier: str
    duration: str
    tags: List[str]
    wheelchair_friendly: bool
    child_friendly: bool

class RestaurantRec(BaseModel):
    name: str
    cuisine: str
    address: str
    price_tier: str
    dietary_tags: List[str]

class DayPlan(BaseModel):
    day: int
    date: str
    morning: List[ActivityCard]
    afternoon: List[ActivityCard]
    evening: List[ActivityCard]

class AgentResponse(BaseModel):
    day_plans: List[DayPlan]
    restaurant_recommendations: List[RestaurantRec]
    packing_checklist: List[str]
    summary: str

# Initialize Tavily Search Tool
tavily_api_key = os.getenv("TAVILY_API_KEY")
if not tavily_api_key:
    print("Warning: TAVILY_API_KEY not set")

if TavilySearchResults and tavily_api_key:
    try:
        search_tool = TavilySearchResults(max_results=5, api_key=tavily_api_key)
    except Exception as e:
        print(f"Warning: Could not initialize Tavily: {e}")
        search_tool = None
else:
    search_tool = None

# Initialize LLM
openai_api_key = os.getenv("OPENAI_API_KEY")
if ChatOpenAI and openai_api_key:
    try:
        llm = ChatOpenAI(model="gpt-4", temperature=0.7, api_key=openai_api_key)
    except Exception as e:
        print(f"Warning: Could not initialize OpenAI: {e}")
        llm = None
else:
    llm = None

def get_booking_details(booking_id: int):
    """Fetch booking details from database"""
    if not connection_pool:
        return None

    try:
        connection = connection_pool.get_connection()
        cursor = connection.cursor(dictionary=True)

        query = """
        SELECT b.*, p.property_name, p.location, p.amenities
        FROM bookings b
        JOIN properties p ON b.property_id = p.id
        WHERE b.id = %s
        """
        cursor.execute(query, (booking_id,))
        result = cursor.fetchone()

        cursor.close()
        connection.close()

        return result
    except Exception as e:
        print(f"Error fetching booking: {e}")
        return None

def save_conversation_message(user_id: int, message: str, role: str):
    """Save a conversation message to database"""
    if not connection_pool or not user_id:
        return False

    try:
        connection = connection_pool.get_connection()
        cursor = connection.cursor()

        # Create table if it doesn't exist
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS ai_conversations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                message TEXT NOT NULL,
                role ENUM('user', 'assistant') NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_user_id (user_id)
            )
        """)

        query = "INSERT INTO ai_conversations (user_id, message, role) VALUES (%s, %s, %s)"
        cursor.execute(query, (user_id, message, role))
        connection.commit()

        cursor.close()
        connection.close()

        return True
    except Exception as e:
        print(f"Error saving conversation: {e}")
        return False

def get_conversation_history(user_id: int, limit: int = 10):
    """Retrieve recent conversation history for a user"""
    if not connection_pool or not user_id:
        return []

    try:
        connection = connection_pool.get_connection()
        cursor = connection.cursor(dictionary=True)

        query = """
        SELECT message, role, created_at
        FROM ai_conversations
        WHERE user_id = %s
        ORDER BY created_at DESC
        LIMIT %s
        """
        cursor.execute(query, (user_id, limit))
        results = cursor.fetchall()

        cursor.close()
        connection.close()

        # Reverse to get chronological order
        return list(reversed(results))
    except Exception as e:
        print(f"Error fetching conversation history: {e}")
        return []

def get_owner_properties(user_id: int):
    """Fetch owner's properties from database"""
    if not connection_pool or not user_id:
        return []

    try:
        connection = connection_pool.get_connection()
        cursor = connection.cursor(dictionary=True)

        query = """
        SELECT id, property_name, property_type, location, city, state,
               description, price_per_night, bedrooms, bathrooms, max_guests,
               amenities, is_active
        FROM properties
        WHERE owner_id = %s
        ORDER BY created_at DESC
        """
        cursor.execute(query, (user_id,))
        results = cursor.fetchall()

        cursor.close()
        connection.close()

        return results
    except Exception as e:
        print(f"Error fetching owner properties: {e}")
        return []

def search_local_pois(location: str, interests: List[str]):
    """Search for local points of interest"""
    if not search_tool:
        return []
    
    try:
        query = f"top tourist attractions and activities in {location}"
        if interests:
            query += f" for {', '.join(interests)}"
        
        results = search_tool.invoke({"query": query})
        return results
    except Exception as e:
        print(f"Error searching POIs: {e}")
        return []

def search_weather(location: str, dates: str):
    """Search for weather information"""
    if not search_tool:
        return "Weather information unavailable"
    
    try:
        query = f"weather forecast {location} {dates}"
        results = search_tool.invoke({"query": query})
        return results
    except Exception as e:
        print(f"Error searching weather: {e}")
        return "Weather information unavailable"

def search_restaurants(location: str, dietary_filters: List[str]):
    """Search for restaurants based on dietary needs"""
    if not search_tool:
        return []
    
    try:
        dietary_str = ", ".join(dietary_filters) if dietary_filters else "best"
        query = f"{dietary_str} restaurants in {location}"
        results = search_tool.invoke({"query": query})
        return results
    except Exception as e:
        print(f"Error searching restaurants: {e}")
        return []

def search_local_events(location: str, dates: str):
    """Search for local events"""
    if not search_tool:
        return []
    
    try:
        query = f"events and festivals in {location} during {dates}"
        results = search_tool.invoke({"query": query})
        return results
    except Exception as e:
        print(f"Error searching events: {e}")
        return []

def generate_packing_list(weather_info: str, activities: List[str], duration: int):
    """Generate weather-aware packing checklist"""
    base_items = [
        "Identification and travel documents",
        "Phone and chargers",
        "Wallet and payment methods",
        "Medications and prescriptions"
    ]
    
    # Add weather-based items
    if "rain" in weather_info.lower() or "shower" in weather_info.lower():
        base_items.extend(["Umbrella", "Rain jacket", "Waterproof shoes"])
    
    if "cold" in weather_info.lower() or "winter" in weather_info.lower():
        base_items.extend(["Warm jacket", "Gloves", "Hat", "Layers"])
    
    if "hot" in weather_info.lower() or "sunny" in weather_info.lower():
        base_items.extend(["Sunscreen", "Sunglasses", "Hat", "Light clothing"])
    
    # Add activity-based items
    if any(act in str(activities).lower() for act in ["hike", "outdoor", "nature"]):
        base_items.extend(["Comfortable walking shoes", "Backpack", "Water bottle"])
    
    if any(act in str(activities).lower() for act in ["beach", "swim", "pool"]):
        base_items.extend(["Swimwear", "Beach towel", "Flip flops"])
    
    # Add duration-based items
    if duration > 3:
        base_items.append("Laundry detergent or laundry bag")
    
    return list(set(base_items))  # Remove duplicates

@app.post("/api/agent/plan", response_model=AgentResponse)
async def create_travel_plan(request: AgentRequestModel):
    """
    Generate a personalized travel plan based on booking and preferences
    """
    try:
        # Get booking details from database
        booking = get_booking_details(request.booking_context.booking_id)

        if not booking:
            location = request.booking_context.location
        else:
            location = booking["location"]

        # Calculate duration - handle both ISO format and simple date format
        start_date_str = request.booking_context.start_date.split('T')[0] if 'T' in request.booking_context.start_date else request.booking_context.start_date
        end_date_str = request.booking_context.end_date.split('T')[0] if 'T' in request.booking_context.end_date else request.booking_context.end_date

        start = datetime.strptime(start_date_str, "%Y-%m-%d")
        end = datetime.strptime(end_date_str, "%Y-%m-%d")
        duration = (end - start).days

        date_range = f"{request.booking_context.start_date} to {request.booking_context.end_date}"

        # Use OpenAI to generate intelligent recommendations if available
        if llm:
            from langchain_core.messages import HumanMessage
            import json

            interests_str = ', '.join(request.preferences.interests) if request.preferences.interests else 'general sightseeing'
            dietary_str = ', '.join(request.preferences.dietary_filters) if request.preferences.dietary_filters else 'no restrictions'

            prompt = f"""You are a travel planning expert. Create a detailed {duration}-day itinerary for {location}.

Trip Details:
- Location: {location}
- Dates: {date_range}
- Duration: {duration} days
- Number of guests: {request.booking_context.number_of_guests}
- Budget: {request.preferences.budget}
- Interests: {interests_str}
- Dietary preferences: {dietary_str}

For each day, provide:
1. Morning activity (specific place name, not generic)
2. Afternoon activity (specific place name, not generic)
3. Evening activity (specific place name, not generic)

Also provide:
- 3-5 specific restaurant recommendations with cuisine type
- A packing list based on weather and activities

Format your response as JSON with this structure:
{{
  "days": [
    {{
      "day": 1,
      "morning": {{"title": "Specific Place Name", "address": "Area/District", "duration": "2-3 hours"}},
      "afternoon": {{"title": "Specific Place Name", "address": "Area/District", "duration": "3-4 hours"}},
      "evening": {{"title": "Specific Place Name", "address": "Area/District", "duration": "2-3 hours"}}
    }}
  ],
  "restaurants": [
    {{"name": "Restaurant Name", "cuisine": "Type", "address": "Location", "dietary": ["tags"]}}
  ],
  "packing": ["item1", "item2", ...],
  "summary": "Brief summary of the trip plan"
}}

Be specific! Use real places, cafes, hiking trails, museums, etc. based on the interests."""

            t0 = time.time()
            response = llm.invoke([HumanMessage(content=prompt)])
            t1 = time.time()
            print(f"LLM invoke (plan) took {(t1-t0):.2f}s")

            try:
                # Try to parse JSON from response
                content = response.content
                # Find JSON in the response (might be wrapped in markdown)
                if "```json" in content:
                    content = content.split("```json")[1].split("```")[0]
                elif "```" in content:
                    content = content.split("```")[1].split("```")[0]

                ai_plan = json.loads(content.strip())

                # Convert AI response to our data models
                day_plans = []
                for day_data in ai_plan.get("days", [])[:duration]:
                    day_num = day_data.get("day", len(day_plans) + 1)
                    day_date = start + timedelta(days=day_num - 1)

                    morning = day_data.get("morning", {})
                    afternoon = day_data.get("afternoon", {})
                    evening = day_data.get("evening", {})

                    day_plans.append(DayPlan(
                        day=day_num,
                        date=day_date.strftime("%Y-%m-%d"),
                        morning=[ActivityCard(
                            title=morning.get("title", f"Morning Activity {day_num}"),
                            address=morning.get("address", location),
                            price_tier=request.preferences.budget,
                            duration=morning.get("duration", "2-3 hours"),
                            tags=request.preferences.interests[:2] if request.preferences.interests else ["sightseeing"],
                            wheelchair_friendly=True,
                            child_friendly=True
                        )],
                        afternoon=[ActivityCard(
                            title=afternoon.get("title", f"Afternoon Activity {day_num}"),
                            address=afternoon.get("address", location),
                            price_tier=request.preferences.budget,
                            duration=afternoon.get("duration", "3-4 hours"),
                            tags=request.preferences.interests if request.preferences.interests else ["culture"],
                            wheelchair_friendly=True,
                            child_friendly=True
                        )],
                        evening=[ActivityCard(
                            title=evening.get("title", f"Evening Activity {day_num}"),
                            address=evening.get("address", location),
                            price_tier=request.preferences.budget,
                            duration=evening.get("duration", "2-3 hours"),
                            tags=["dining", "entertainment"],
                            wheelchair_friendly=True,
                            child_friendly=True
                        )]
                    ))

                # Convert restaurant recommendations
                restaurant_recs = []
                for rest in ai_plan.get("restaurants", [])[:5]:
                    restaurant_recs.append(RestaurantRec(
                        name=rest.get("name", "Local Restaurant"),
                        cuisine=rest.get("cuisine", "Local Cuisine"),
                        address=rest.get("address", location),
                        price_tier=request.preferences.budget,
                        dietary_tags=rest.get("dietary", request.preferences.dietary_filters)
                    ))

                packing_list = ai_plan.get("packing", [])
                summary = ai_plan.get("summary", f"Your {duration}-day trip to {location} is planned!")

            except Exception as e:
                print(f"Error parsing AI response: {e}")
                # Fallback to basic plan
                day_plans = []
                restaurant_recs = []
                packing_list = generate_packing_list("", request.preferences.interests, duration)
                summary = f"Basic {duration}-day itinerary for {location}"
        else:
            # Fallback when OpenAI is not available
            day_plans = []
            restaurant_recs = []
            packing_list = generate_packing_list("", request.preferences.interests, duration)
            summary = f"Your {duration}-day trip to {location}"

        return AgentResponse(
            day_plans=day_plans,
            restaurant_recommendations=restaurant_recs,
            packing_checklist=packing_list,
            summary=summary.strip()
        )
        
    except Exception as e:
        print(f"Error creating travel plan: {e}")
        raise HTTPException(status_code=500, detail=f"Error creating travel plan: {str(e)}")

@app.post("/api/agent/query")
async def handle_custom_query(request: AgentRequestModel):
    """
    Handle natural language queries from users
    """
    try:
        # Debug logging
        print(f"========== DEBUG ==========")
        print(f"Received query from user_id: {request.user_id}, user_type: {request.user_type}, user_name: {request.user_name}")
        print(f"Query: {request.custom_query}")
        print(f"==========================")

        if not request.custom_query:
            raise HTTPException(status_code=400, detail="custom_query is required")

        location = request.booking_context.location
        start_date = request.booking_context.start_date
        end_date = request.booking_context.end_date
        number_of_guests = request.booking_context.number_of_guests

        # Use OpenAI with optional Tavily search
        if llm:
            # Use OpenAI directly when Tavily is not available
            from langchain_core.messages import HumanMessage, AIMessage, SystemMessage

            # Get conversation history for this user
            conversation_history = []
            if request.user_id:
                history = get_conversation_history(request.user_id, limit=10)
                for msg in history:
                    if msg['role'] == 'user':
                        conversation_history.append(HumanMessage(content=msg['message']))
                    else:
                        conversation_history.append(AIMessage(content=msg['message']))

            # Build context-aware system message
            user_name = request.user_name or "there"
            user_type = request.user_type or "guest"

            # Create context based on user type
            if user_type == "owner":
                # Fetch owner's properties
                owner_properties = get_owner_properties(request.user_id) if request.user_id else []

                # Format properties for context
                properties_info = ""
                if owner_properties:
                    properties_info = "\n\nYour Current Properties:\n"
                    for prop in owner_properties:
                        properties_info += f"""
- {prop['property_name']} ({prop['property_type']})
  Location: {prop['location']}{', ' + prop['city'] if prop.get('city') else ''}{', ' + prop['state'] if prop.get('state') else ''}
  Description: {prop['description']}
  Price: ${prop['price_per_night']}/night
  Bedrooms: {prop['bedrooms']}, Bathrooms: {prop['bathrooms']}, Max Guests: {prop['max_guests']}
  Amenities: {prop.get('amenities', 'N/A')}
  Status: {'Active' if prop.get('is_active') else 'Inactive'}
"""
                else:
                    properties_info = "\n\nYou currently have NO properties listed on the platform."

                system_context = f"""You are an AI assistant integrated into an Airbnb-like platform.
The user is {user_name}, a property OWNER (not a traveler).
{properties_info}

IMPORTANT - Answer Questions Directly:
- When they ask about their properties, use the property data above to answer specifically
- When they ask if they have a property matching a description, search through the properties listed above
- When they ask about specific properties, refer to the actual property details provided
- Be specific with property names, locations, prices, and details

You can provide guidance on:
- Information about their specific properties (using the data above)
- How to create and manage property listings
- Best practices for responding to booking requests
- Pricing strategies and tips based on their current listings
- Guest communication advice
- Property management tips

Be direct, friendly, and helpful. Use the actual property data to give specific answers."""
            elif user_type == "traveler":
                system_context = f"""You are a helpful AI assistant for {user_name}, who is a TRAVELER on an Airbnb-like platform.

Current Trip Context:
- Location: {location}
- Dates: {start_date} to {end_date}
- Number of guests: {number_of_guests}

IMPORTANT - Context Awareness:
- When they ask "am I in traveler page?" or similar - Confirm YES, they are logged in as a traveler and viewing the traveler interface
- When they ask about the current page - Explain they're on the traveler view where they can manage bookings, view properties, and plan trips
- When they ask navigation questions - Guide them to specific sections like "My Bookings", "Browse Properties", "My Profile", etc.

WEATHER INFORMATION:
- When asked about weather, provide realistic temperature forecasts based on the location and season
- For {location}, generate plausible temperatures and weather conditions (e.g., "Expected temperatures: highs around 65-70°F, lows around 45-50°F. Expect partly cloudy skies with a chance of afternoon showers.")
- Always provide helpful packing suggestions based on the weather you describe
- BE SPECIFIC with numbers - don't say "I can't provide real-time data"

You can help them with:
- Trip planning and itinerary suggestions for {location}
- Local recommendations for restaurants, activities, and attractions
- Weather forecasts (generate realistic estimates based on location and season)
- Travel tips and advice
- Booking and accommodation questions
- Transportation and logistics
- Navigating the platform features

Be direct, friendly, and helpful. Provide specific information rather than apologizing for limitations."""
            else:
                system_context = f"""You are a helpful AI assistant for the Airbnb platform.
Help users with their questions about travel, bookings, or property management.
Provide helpful and friendly responses."""

            # Try to get real-time information from Tavily if available
            search_context = ""
            if search_tool:
                try:
                    print(f"Searching Tavily for: {request.custom_query} in {location}")
                    t0 = time.time()
                    search_results = search_tool.invoke({"query": f"{request.custom_query} in {location}"})
                    t1 = time.time()
                    print(f"Tavily search took {(t1-t0):.2f}s")

                    # Format search results for context
                    if search_results:
                        search_context = "\n\nREAL-TIME WEB SEARCH RESULTS:\n"
                        for idx, result in enumerate(search_results[:5], 1):
                            if isinstance(result, dict):
                                title = result.get('title', result.get('name', 'Result'))
                                content = result.get('content', result.get('snippet', result.get('description', '')))
                                url = result.get('url', '')
                                search_context += f"\n{idx}. {title}\n   {content}\n   Source: {url}\n"
                        print(f"Added {len(search_results[:5])} Tavily search results to context")
                except Exception as e:
                    print(f"Tavily search error: {e}")
                    search_context = ""

            messages = [SystemMessage(content=system_context + search_context + "\n\nRemember previous context from the conversation history.")]

            # Add conversation history
            messages.extend(conversation_history)

            # Add current query
            messages.append(HumanMessage(content=request.custom_query))

            # Debug: Print what we're sending to OpenAI
            print(f"System prompt being used: {system_context[:200]}...")
            print(f"Number of history messages: {len(conversation_history)}")
            print(f"Search context added: {len(search_context)} characters")

            t0 = time.time()
            response = llm.invoke(messages)
            t1 = time.time()
            print(f"LLM invoke (query) took {(t1-t0):.2f}s")

            # Save conversation to database
            if request.user_id:
                save_conversation_message(request.user_id, request.custom_query, 'user')
                save_conversation_message(request.user_id, response.content, 'assistant')

            return {
                "response": response.content,
                "results": [],
                "suggestions": "Feel free to ask me anything else about your trip!"
            }
        else:
            return {
                "response": "I can help you with your query, but AI functionality is currently unavailable.",
                "results": [],
                "suggestions": "Please ensure OpenAI API key is configured."
            }
            
    except Exception as e:
        print(f"Error handling query: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing query: {str(e)}")

@app.get("/api/agent/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "OK",
        "message": "AI Concierge Agent is running",
        "tavily_configured": search_tool is not None,
        "llm_configured": llm is not None,
        "database_configured": connection_pool is not None
    }

if __name__ == "__main__":
    import uvicorn
    from datetime import timedelta
    uvicorn.run(app, host="0.0.0.0", port=8000)