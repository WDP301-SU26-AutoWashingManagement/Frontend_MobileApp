#!/bin/bash

# Installation script for AutoWash Mobile Auth Dependencies

echo "🚀 Installing AutoWash Mobile Auth Dependencies..."

# Install Axios
echo "📦 Installing axios..."
npm install axios

# Install React Native Async Storage
echo "📦 Installing @react-native-async-storage/async-storage..."
npx expo install @react-native-async-storage/async-storage

# Optional: Install Google Sign-In (uncomment if needed)
# echo "📦 Installing Google Sign-In packages..."
# npx expo install @react-native-google-signin/google-signin
# npx expo install expo-google-app-auth

# Optional: Install React Native Secure Storage (more secure than AsyncStorage)
# echo "📦 Installing expo-secure-store..."
# npx expo install expo-secure-store

echo "✅ Installation completed!"
echo ""
echo "📝 Next steps:"
echo "1. Update API_BASE_URL in services/authService.ts with your backend URL"
echo "2. Read AUTH_SETUP.md for configuration instructions"
echo "3. Test authentication by running 'npm start'"
echo ""
echo "🔗 For Google Sign-In, see AUTH_SETUP.md for detailed setup instructions"
