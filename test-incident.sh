#!/bin/bash
# Test script to create a sample incident

# Get your JWT token first (replace with your actual login credentials)
TOKEN=$(curl -s -X POST http://192.168.1.12:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email@example.com","password":"your-password"}' \
  | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

echo "Token: $TOKEN"

# Create a test incident (you need a test image)
curl -X POST http://192.168.1.12:3000/api/security/incidents \
  -H "Authorization: Bearer $TOKEN" \
  -F "type=intruder" \
  -F "image=@/path/to/test-image.jpg"

echo ""
echo "Incident created! Check your app."
