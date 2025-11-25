#!/bin/bash
# Seed Database Script
# Run this script to seed the database with sample data
# Usage: ./seed-database.sh

set -e

echo "🌱 Seeding database with sample data..."

# Check if MySQL container is running
if ! docker ps | grep -q airbnb-mysql; then
    echo "❌ Error: MySQL container (airbnb-mysql) is not running"
    echo "   Please start it with: docker compose up -d mysql"
    exit 1
fi

# Wait for MySQL to be ready
echo "⏳ Waiting for MySQL to be ready..."
until docker exec airbnb-mysql mysqladmin ping -h localhost --silent 2>/dev/null; do
    echo "   Waiting for MySQL..."
    sleep 2
done

echo "✅ MySQL is ready"

# Run seed script
echo "📦 Running seed data script..."
docker exec -i airbnb-mysql mysql -u root -prootpassword airbnb_clone < "$(dirname "$0")/seed_data.sql" 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✅ Database seeded successfully!"
    echo ""
    echo "📊 Summary:"
    docker exec airbnb-mysql mysql -u root -prootpassword airbnb_clone -e "
        SELECT 'Properties' as type, COUNT(*) as count FROM properties
        UNION ALL
        SELECT 'Bookings', COUNT(*) FROM bookings
        UNION ALL
        SELECT 'Favorites', COUNT(*) FROM favorites
        UNION ALL
        SELECT 'Users', COUNT(*) FROM users;
    " 2>/dev/null
else
    echo "❌ Error seeding database"
    exit 1
fi

