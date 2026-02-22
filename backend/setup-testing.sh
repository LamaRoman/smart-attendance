#!/bin/bash

# Jest Testing Setup Script
# This script installs all necessary dependencies for backend testing

echo "🧪 Setting up Jest for Backend Testing..."
echo ""

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ Error: npm is not installed. Please install Node.js and npm first."
    exit 1
fi

echo "📦 Installing Jest and testing dependencies..."
npm install --save-dev \
  jest@^29.7.0 \
  @types/jest@^29.5.11 \
  ts-jest@^29.1.1 \
  ts-node@^10.9.2 \
  @testing-library/jest-dom@^6.1.5

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully!"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo ""
echo "📝 Testing setup complete!"
echo ""
echo "Available commands:"
echo "  npm test              - Run all tests"
echo "  npm run test:watch    - Run tests in watch mode"
echo "  npm run test:coverage - Run tests with coverage report"
echo "  npm run test:api      - Run API tests only"
echo ""
echo "📚 See TESTING.md for complete documentation"
echo ""
echo "🚀 Ready to test! Run 'npm test' to get started."