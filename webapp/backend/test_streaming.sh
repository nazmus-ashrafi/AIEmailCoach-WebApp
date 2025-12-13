#!/bin/bash

# Test script for streaming classification endpoint
# Usage: ./test_streaming.sh <email_id> <jwt_token>

EMAIL_ID=${1:-1}
JWT_TOKEN=${2:-"your-jwt-token-here"}

echo "🧪 Testing streaming classification endpoint..."
echo "📧 Email ID: $EMAIL_ID"
echo ""

curl -N \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Accept: text/event-stream" \
  -X POST \
  "http://localhost:8000/api/emails/classify_email_stream/$EMAIL_ID"

echo ""
echo "✅ Test complete"
