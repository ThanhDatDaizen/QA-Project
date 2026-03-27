#!/bin/bash
# tests/integration-tests/test-integration.sh

BASE_URL="http://localhost:8080/api/v1"

echo "🧪 Starting Integration Tests..."

# Health Check
echo "1. Testing Health Check..."
curl -s $BASE_URL/health | grep -q "OK" && echo "✅ Health Check Passed" || echo "❌ Health Check Failed"

# Register
echo "2. Testing Registration..."
REGISTER_RESPONSE=$(curl -s -X POST $BASE_URL/identity/enroll \
  -H "Content-Type: application/json" \
  -d '{"academic_designation":"Test","institutional_email":"test@test.edu","access_secret":"pass123","department_identifier":null}')
echo "$REGISTER_RESPONSE" | grep -q "unique_context_identifier" && echo "✅ Registration Passed" || echo "❌ Registration Failed"

# Login
echo "3. Testing Login..."
LOGIN_RESPONSE=$(curl -s -X POST $BASE_URL/identity/authenticate \
  -H "Content-Type: application/json" \
  -d '{"institutional_email":"test@test.edu","access_secret":"pass123"}')
TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
[ -n "$TOKEN" ] && echo "✅ Login Passed" || echo "❌ Login Failed"

echo "🎉 Integration Tests Completed!"
