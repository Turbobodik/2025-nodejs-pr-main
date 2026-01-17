#!/bin/bash
# API Testing Script for pr-6

BASE_URL="http://localhost:3000"
API_URL="${BASE_URL}/api"

echo "=== API Testing Script ==="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Register a new user
echo -e "${YELLOW}Test 1: Register a new user${NC}"
REGISTER_RESPONSE=$(curl -s -X POST "${API_URL}/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test",
    "surname": "User",
    "email": "test@example.com",
    "password": "password123"
  }')

echo "$REGISTER_RESPONSE" | jq '.'
TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.token // empty')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo -e "${RED}Registration failed or token not received${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Registration successful${NC}"
echo "Token: ${TOKEN:0:50}..."
echo ""

# Test 2: Login
echo -e "${YELLOW}Test 2: Login${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "${API_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }')

echo "$LOGIN_RESPONSE" | jq '.'
LOGIN_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token // empty')

if [ ! -z "$LOGIN_TOKEN" ] && [ "$LOGIN_TOKEN" != "null" ]; then
  TOKEN=$LOGIN_TOKEN
  echo -e "${GREEN}✓ Login successful${NC}"
else
  echo -e "${RED}Login failed${NC}"
fi
echo ""

# Test 3: Get all students (requires auth)
echo -e "${YELLOW}Test 3: Get all students${NC}"
STUDENTS_RESPONSE=$(curl -s -X GET "${API_URL}/students" \
  -H "Authorization: Bearer $TOKEN")

echo "$STUDENTS_RESPONSE" | jq '.'
if echo "$STUDENTS_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Get students successful${NC}"
else
  echo -e "${RED}Get students failed${NC}"
fi
echo ""

# Test 4: Invalid request (should log error)
echo -e "${YELLOW}Test 4: Invalid request (should log error)${NC}"
INVALID_RESPONSE=$(curl -s -X GET "${API_URL}/students/999" \
  -H "Authorization: Bearer $TOKEN")

echo "$INVALID_RESPONSE" | jq '.'
echo ""

# Test 5: Unauthorized request (should log warning)
echo -e "${YELLOW}Test 5: Unauthorized request${NC}"
UNAUTH_RESPONSE=$(curl -s -X GET "${API_URL}/students")
echo "$UNAUTH_RESPONSE" | jq '.'
echo ""

echo -e "${GREEN}=== API Tests Complete ===${NC}"

