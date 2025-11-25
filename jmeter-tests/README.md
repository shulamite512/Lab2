# JMeter Performance Test Plans

This directory contains Apache JMeter test plans for Lab 2 Part 5 - Performance Testing.

## Test Plans

### 1. Login Test - 100 Concurrent Users
**File:** `01-login-test-100-users.jmx`
- **Endpoint:** POST `http://localhost:3001/api/auth/login`
- **Users:** 100
- **Ramp-up:** 10 seconds
- **Loops:** 10 iterations
- **Total Requests:** 1,000

### 2. Property Search Test - 400 Concurrent Users
**File:** `02-property-search-test-400-users.jmx`
- **Endpoint:** GET `http://localhost:3003/api/properties?location=New%20York`
- **Users:** 400
- **Ramp-up:** 20 seconds
- **Loops:** 5 iterations
- **Total Requests:** 2,000

### 3. Booking Creation Test - 500 Concurrent Users
**File:** `03-booking-creation-test-500-users.jmx`
- **Endpoint:** POST `http://localhost:3004/api/bookings`
- **Users:** 500
- **Ramp-up:** 30 seconds
- **Loops:** 3 iterations
- **Total Requests:** 1,500

## Quick Start

### 1. Install JMeter
```bash
# Download from https://jmeter.apache.org/download_jmeter.cgi
# Extract to C:\jmeter (Windows) or /opt/jmeter (Mac/Linux)
```

### 2. Start Services
```bash
cd ../services
docker-compose up -d
```

### 3. Run Tests (GUI Mode)
```bash
# Windows
C:\jmeter\bin\jmeter.bat

# Mac/Linux
/opt/jmeter/bin/jmeter.sh

# Then: File → Open → Select .jmx file → Click Start
```

### 4. Run Tests (CLI Mode - Recommended)
```bash
# Create results directory
mkdir -p results

# Test 1: Login
C:\jmeter\bin\jmeter.bat -n -t 01-login-test-100-users.jmx -l results/login-results.jtl -e -o results/login-report

# Test 2: Property Search
C:\jmeter\bin\jmeter.bat -n -t 02-property-search-test-400-users.jmx -l results/search-results.jtl -e -o results/search-report

# Test 3: Booking Creation
C:\jmeter\bin\jmeter.bat -n -t 03-booking-creation-test-500-users.jmx -l results/booking-results.jtl -e -o results/booking-report
```

### 5. View Results
```bash
# Open HTML report in browser
start results/login-report/index.html
start results/search-report/index.html
start results/booking-report/index.html
```

## Test Configuration

All tests include:
- HTTP Header Manager (Content-Type: application/json)
- Response Code Assertions (200/201)
- Duration Assertions (< 2-3 seconds)
- JSON Path Assertions (valid response)
- Multiple result listeners:
  - View Results Tree
  - Summary Report
  - Graph Results
  - Response Time Graph
  - Aggregate Report

## Expected Performance

| Test | Users | Expected Avg Response | Expected Throughput |
|------|-------|----------------------|---------------------|
| Login | 100 | 150-300 ms | 200-400 req/s |
| Search | 400 | 200-500 ms | 300-600 req/s |
| Booking | 500 | 300-800 ms | 150-300 req/s |

## Troubleshooting

**Services not running:**
```bash
docker-compose ps
curl http://localhost:3001/health
```

**Connection refused:**
```bash
# Check if ports are correct in test plans
# Traveler Service: 3001
# Owner Service: 3002
# Property Service: 3003
# Booking Service: 3004
```

**Out of memory:**
```bash
# Increase JMeter heap size
# Edit jmeter.bat: set HEAP=-Xms1g -Xmx4g
```

## Results Directory Structure

```
results/
├── login-results.jtl           # Raw login test results
├── search-results.jtl          # Raw search test results
├── booking-results.jtl         # Raw booking test results
├── login-report/
│   └── index.html             # Login HTML report
├── search-report/
│   └── index.html             # Search HTML report
└── booking-report/
    └── index.html             # Booking HTML report
```

## Documentation

See [JMETER_TESTING_GUIDE.md](../JMETER_TESTING_GUIDE.md) for complete documentation.

## Lab Requirements

**Lab 2 Part 5 - Performance Testing (5 points):**
- ✅ Test 1: 100 concurrent users (Login)
- ✅ Test 2: 400 concurrent users (Property Search)
- ✅ Test 3: 500 concurrent users (Booking Creation)
- ✅ Performance reports with graphs
- ✅ Screenshots of results

---

**Created:** 2025-11-21
**Lab:** Distributed Systems - Lab 2 Part 5
