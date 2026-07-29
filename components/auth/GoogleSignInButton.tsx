import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface GoogleSignInButtonProps {
  onPress: () => Promise<void>;
  disabled?: boolean;
  loading?: boolean;
  label?: string;
}

/**
 * Google Sign-In Button Component
 * 
 * Requires setup:
 * 1. Install @react-native-google-signin/google-signin
 * 2. Configure app.json with Google Client IDs
 * 3. Initialize GoogleSignin in parent component
 * 
 * Example usage:
 * ```tsx
 * const { loginWithGoogle } = useAuth();
 * const handleGoogleSignIn = async () => {
 *   try {
 *     const userInfo = await GoogleSignin.signIn();
 *     if (userInfo.idToken) {
 *       await loginWithGoogle(userInfo.idToken);
 *     }
 *   } catch (error) {
 *     console.error('Google Sign-In error:', error);
 *   }
 * };
 * 
 * <GoogleSignInButton 
 *   onPress={handleGoogleSignIn}
 *   disabled={loading}
 *   loading={loading}
 * />
 * ```
 */
export default function GoogleSignInButton({
  onPress,
  disabled = false,
  loading = false,
  label = 'Đăng nhập với Google',
}: GoogleSignInButtonProps) {
  const [isPressed, setIsPressed] = useState(false);

  const handlePress = async () => {
    if (disabled || loading) return;
    
    try {
      setIsPressed(true);
      await onPress();
    } finally {
      setIsPressed(false);
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        (pressed || isPressed) && !disabled && styles.buttonPressed,
        (disabled || loading) && styles.buttonDisabled,
      ]}>
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator
            size={18}
            color="#1F2937"
            style={styles.icon}
          />
        ) : (
          <MaterialCommunityIcons
            name="google"
            size={18}
            color="#1F2937"
            style={styles.icon}
          />
        )}
        <Text style={styles.text}>
          {loading ? 'Đang xử lý...' : label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },

  buttonPressed: {
    transform: [{ scale: 0.98 }],
    backgroundColor: '#F3F4F6',
  },

  buttonDisabled: {
    opacity: 0.65,
  },

  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  icon: {
    marginRight: 4,
  },

  text: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    letterSpacing: 0.2,
  },
});
