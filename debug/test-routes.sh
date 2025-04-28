#!/bin/bash

BASE_URL="http://localhost:5000"
COOKIE_FILE="debug/cookies.txt"

echo "🔍 Bus Tracker API Debugging Tool 🔍"
echo "======================================"

# Create cookies file if it doesn't exist
touch $COOKIE_FILE

function login() {
  echo -e "\n📝 Logging in as $1..."
  curl -s -X POST "$BASE_URL/api/auth/login" \
       -H "Content-Type: application/json" \
       -d "{\"username\":\"$1\",\"password\":\"$2\",\"userType\":\"$3\"}" \
       -c $COOKIE_FILE
  echo
}

function get_current_user() {
  echo -e "\n👤 Getting current user..."
  curl -s -X GET "$BASE_URL/api/auth/me" \
       -b $COOKIE_FILE
  echo
}

function list_users() {
  echo -e "\n👥 Listing users..."
  curl -s -X GET "$BASE_URL/api/users" \
       -b $COOKIE_FILE
  echo
}

function list_riders() {
  echo -e "\n🚶 Listing riders..."
  curl -s -X GET "$BASE_URL/api/users?userType=rider" \
       -b $COOKIE_FILE
  echo
}

function create_trip() {
  echo -e "\n🚌 Creating trip for rider $1..."
  curl -s -X POST "$BASE_URL/api/trips" \
       -H "Content-Type: application/json" \
       -d "{\"riderId\":\"$1\",\"location\":\"$2\",\"note\":\"$3\"}" \
       -b $COOKIE_FILE
  echo
}

function list_trips() {
  echo -e "\n🧾 Listing trips..."
  curl -s -X GET "$BASE_URL/api/trips" \
       -b $COOKIE_FILE
  echo
}

function list_recent_trips() {
  echo -e "\n🕒 Listing recent trips..."
  curl -s -X GET "$BASE_URL/api/trips/recent" \
       -b $COOKIE_FILE
  echo
}

function logout() {
  echo -e "\n🚪 Logging out..."
  curl -s -X POST "$BASE_URL/api/auth/logout" \
       -b $COOKIE_FILE \
       -c $COOKIE_FILE
  echo
}

echo "Step 1: Login as driver"
login "driver1" "password123" "driver"

echo "Step 2: Check current user"
get_current_user

echo "Step 3: List riders"
list_riders

echo "Step 4: Create a test trip"
create_trip "12345" "Test Location" "Created via debug script"

echo "Step 5: List trips"
list_trips

echo "Step 6: List recent trips"
list_recent_trips

echo "Step 7: Logout"
logout

echo -e "\n✅ Debug test completed"
