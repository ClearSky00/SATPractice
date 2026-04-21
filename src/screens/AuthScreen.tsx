import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { authService } from '../services/auth';
import { onboardingService } from '../services/onboarding';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AppleAuthentication from 'expo-apple-authentication';

const AuthScreen = ({ navigation }: any) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  
  // Check if native sign-in is available (not in Expo Go)
  const isNativeSignInAvailable = authService.isNativeSignInAvailable();

  const processOnboardingData = async () => {
    try {
      const savedOnboardingData = await AsyncStorage.getItem('onboarding_data');
      if (savedOnboardingData) {
        console.log('Processing saved onboarding data...');
        const onboardingData = JSON.parse(savedOnboardingData);
        
        // Get current user to save onboarding data
        const currentUser = await authService.getCurrentUser();
        if (currentUser) {
          // Ensure onboarding_completed is set to true
          const completeOnboardingData = {
            ...onboardingData,
            onboarding_completed: true
          };
          
          await onboardingService.updateOnboardingData(completeOnboardingData, currentUser.id);
          console.log('Onboarding data processed successfully, onboarding marked as completed');
          
          // Clear the saved data after processing
          await AsyncStorage.removeItem('onboarding_data');
          
          // Set a flag to force navigation refresh
          await AsyncStorage.setItem('onboarding_just_completed', 'true');
          
          // Fallback navigation - redirect to main app after a short delay if automatic navigation doesn't work
          setTimeout(() => {
            console.log('Fallback navigation: redirecting to main app');
            navigation.navigate('Main');
          }, 2000);
        }
      } else {
        // No saved onboarding data - check if user has completed onboarding in database
        const currentUser = await authService.getCurrentUser();
        if (currentUser) {
          const onboardingCompleted = await onboardingService.checkOnboardingStatus(currentUser.id);
          console.log('User onboarding status:', onboardingCompleted);
          
          if (onboardingCompleted) {
            // User has already completed onboarding, redirect to main app
            setTimeout(() => {
              console.log('Fallback navigation: user has completed onboarding, redirecting to main app');
              navigation.navigate('Main');
            }, 1500);
          }
        }
      }
    } catch (onboardingError) {
      console.error('Error processing saved onboarding data:', onboardingError);
      // Don't fail the auth process if onboarding data processing fails
    }
  };

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    
    // Add timeout protection
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timed out. Please try again.')), 30000); // 30 second timeout
    });

    try {
      if (isLogin) {
        // Wrap signIn with timeout
        await Promise.race([
          authService.signIn(email, password),
          timeoutPromise
        ]);
        
        // Process any saved onboarding data with timeout protection
        await Promise.race([
          processOnboardingData(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Onboarding data processing timed out')), 10000)
          )
        ]);
      } else {
        // Wrap signUp with timeout
        const result = await Promise.race([
          authService.signUp(email, password),
          timeoutPromise
        ]) as any;
        
        if (result.needsVerification) {
          // Show verification screen
          setVerificationEmail(email);
          setShowVerification(true);
          Alert.alert(
            'Check your email', 
            'We\'ve sent you a verification link. Please check your email and click the link to verify your account.'
          );
        } else {
          // If no verification needed, process onboarding data immediately with timeout
          await Promise.race([
            processOnboardingData(),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Onboarding data processing timed out')), 10000)
            )
          ]);
        }
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      
      // Show user-friendly error messages
      let errorMessage = error.message;
      
      if (error.message?.includes('timeout') || error.message?.includes('timed out')) {
        errorMessage = 'The request is taking too long. Please check your internet connection and try again.';
      } else if (error.message?.includes('Invalid login credentials')) {
        errorMessage = 'Invalid email or password. Please check your credentials and try again.';
      } else if (error.message?.includes('Email not confirmed')) {
        errorMessage = 'Please verify your email before signing in. Check your inbox for the verification link.';
      } else if (error.message?.includes('Too many requests')) {
        errorMessage = 'Too many sign-in attempts. Please wait a moment and try again.';
      } else if (error.message?.includes('Network request failed') || error.message?.includes('Failed to fetch')) {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      // Always reset loading state
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setLoading(true);
    try {
      await authService.resendEmailVerification(verificationEmail);
      Alert.alert('Success', 'Verification email sent again!');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const goBackToAuth = () => {
    setShowVerification(false);
    setVerificationEmail('');
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    
    // Add timeout protection
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Google sign-in timed out. Please try again.')), 30000);
    });
    
    try {
      const result = await Promise.race([
        authService.signInWithGoogle(),
        timeoutPromise
      ]);
      
      console.log('Google sign-in completed:', result);
      
      // Check if sign-in was cancelled
      if (result === null) {
        console.log('Google sign-in was cancelled, stopping process');
        setLoading(false);
        return;
      }
      
      // Process any saved onboarding data with timeout protection
      await Promise.race([
        processOnboardingData(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Onboarding data processing timed out')), 10000)
        )
      ]);
      
      // The auth state change will trigger navigation automatically
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      
      // Show user-friendly error messages
      let errorMessage = error.message;
      
      if (error.message?.includes('timeout') || error.message?.includes('timed out')) {
        errorMessage = 'Google sign-in is taking too long. Please check your internet connection and try again.';
      } else if (error.message?.includes('Network request failed')) {
        errorMessage = 'Network error during Google sign-in. Please check your internet connection.';
      }
      
      Alert.alert('Error', errorMessage);
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setLoading(true);
    
    // Add timeout protection
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Apple sign-in timed out. Please try again.')), 30000);
    });
    
    try {
      const result = await Promise.race([
        authService.signInWithApple(),
        timeoutPromise
      ]);
      
      console.log('Apple sign-in completed:', result);
      
      // Check if sign-in was cancelled
      if (result === null) {
        console.log('Apple sign-in was cancelled, stopping process');
        setLoading(false);
        return;
      }
      
      // Process any saved onboarding data with timeout protection
      await Promise.race([
        processOnboardingData(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Onboarding data processing timed out')), 10000)
        )
      ]);
      
      // The auth state change will trigger navigation automatically
    } catch (error: any) {
      console.error('Apple sign-in error:', error);
      
      // Show user-friendly error messages
      let errorMessage = error.message;
      
      if (error.message?.includes('timeout') || error.message?.includes('timed out')) {
        errorMessage = 'Apple sign-in is taking too long. Please check your internet connection and try again.';
      } else if (error.message?.includes('Network request failed')) {
        errorMessage = 'Network error during Apple sign-in. Please check your internet connection.';
      }
      
      Alert.alert('Error', errorMessage);
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            {/* Back Button */}
            <TouchableOpacity
              style={styles.headerBackButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={24} color="#1CB0F6" />
            </TouchableOpacity>
            
            <View style={styles.logoContainer}>
              <View style={styles.logoBackground}>
                <Image 
                  source={require('../../assets/ninja.png')} 
                  style={styles.ninjaImage}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.appName}>StudyNinja</Text>
              <Text style={styles.tagline}>Master the SAT with confidence</Text>
            </View>
          </View>

          {/* Auth Form */}
          <View style={styles.formContainer}>
            <View style={styles.formCard}>
              {showVerification ? (
                /* Email Verification Form */
                <>
                  {/* Header with back button */}
                  <View style={styles.verificationHeader}>
                    <TouchableOpacity
                      style={styles.backButton}
                      onPress={goBackToAuth}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="arrow-back" size={24} color="#1CB0F6" />
                    </TouchableOpacity>
                    <Text style={styles.verificationTitle}>Verify your email</Text>
                    <View style={styles.backButton} />
                  </View>

                                     {/* Verification instructions */}
                   <View style={styles.verificationInstructions}>
                     <Text style={styles.verificationText}>
                       We've sent a verification link to:
                     </Text>
                     <Text style={styles.verificationEmail}>{verificationEmail}</Text>
                     <Text style={styles.verificationSubtext}>
                       Please check your email and click the link to verify your account. 
                       You'll be automatically signed in once verified.
                     </Text>
                   </View>

                   {/* Email icon illustration */}
                   <View style={styles.emailIconContainer}>
                     <Ionicons name="mail" size={64} color="#1CB0F6" />
                     <Text style={styles.waitingText}>Waiting for verification...</Text>
                   </View>

                   {/* Resend link */}
                   <TouchableOpacity
                     style={styles.resendButton}
                     onPress={handleResendVerification}
                     disabled={loading}
                     activeOpacity={0.7}
                   >
                     <Text style={styles.resendButtonText}>
                       {loading ? 'Sending...' : 'Didn\'t receive the link? Resend'}
                     </Text>
                   </TouchableOpacity>
                </>
              ) : (
                /* Regular Auth Form */
                <>
                  {/* Tab Switcher */}
                  <View style={styles.tabContainer}>
                    <TouchableOpacity
                      style={[styles.tab, isLogin && styles.activeTab]}
                      onPress={() => setIsLogin(true)}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.tabText,
                        { color: isLogin ? '#1CB0F6' : '#9CA3AF' }
                      ]}>
                        Sign In
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.tab, !isLogin && styles.activeTab]}
                      onPress={() => setIsLogin(false)}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.tabText,
                        { color: !isLogin ? '#1CB0F6' : '#9CA3AF' }
                      ]}>
                        Sign Up
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Form Title */}
                  <View style={styles.formHeader}>
                    <Text style={styles.formTitle}>
                      {isLogin ? 'Welcome back' : 'Get started'}
                    </Text>
                    <Text style={styles.formSubtitle}>
                      {isLogin 
                        ? 'Sign in to your account' 
                        : 'Create your account'
                      }
                    </Text>
                  </View>

                  {/* Input Fields */}
                  <View style={styles.inputContainer}>
                    <View style={styles.inputWrapper}>
                      <Ionicons name="mail-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="Email"
                        placeholderTextColor="#9CA3AF"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </View>

                    <View style={styles.inputWrapper}>
                      <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                      <TextInput
                        style={[styles.input, styles.passwordInput]}
                        placeholder="Password"
                        placeholderTextColor="#9CA3AF"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                      <TouchableOpacity
                        style={styles.passwordToggle}
                        onPress={() => setShowPassword(!showPassword)}
                      >
                        <Ionicons 
                          name={showPassword ? "eye-off-outline" : "eye-outline"} 
                          size={20} 
                          color="#9CA3AF" 
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Auth Button */}
                  <TouchableOpacity
                    style={[styles.authButton, loading && styles.authButtonDisabled]}
                    onPress={handleAuth}
                    disabled={loading}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.authButtonText}>
                      {loading 
                        ? (isLogin ? 'Signing in...' : 'Creating account...') 
                        : (isLogin ? 'Sign In' : 'Create Account')
                      }
                    </Text>
                  </TouchableOpacity>

                  {/* Divider */}
                  <View style={styles.dividerContainer}>
                    <View style={styles.divider} />
                    <Text style={styles.dividerText}>or</Text>
                    <View style={styles.divider} />
                  </View>

                  {/* Google Sign-In Button */}
                  <TouchableOpacity
                    style={[
                      styles.googleButton, 
                      (!isNativeSignInAvailable || loading) && styles.googleButtonDisabled
                    ]}
                    onPress={isNativeSignInAvailable ? handleGoogleSignIn : undefined}
                    disabled={!isNativeSignInAvailable || loading}
                    activeOpacity={isNativeSignInAvailable ? 0.8 : 1}
                  >
                    <Ionicons name="logo-google" size={20} color="#EA4335" />
                    <Text style={styles.googleButtonText}>
                      Continue with Google
                    </Text>
                  </TouchableOpacity>

                  {/* Apple Sign-In Button (iOS only) */}
                  {Platform.OS === 'ios' && (
                    <TouchableOpacity
                      style={[
                        styles.appleButton,
                        (!isNativeSignInAvailable || loading) && styles.appleButtonDisabled
                      ]}
                      onPress={isNativeSignInAvailable ? handleAppleSignIn : undefined}
                      disabled={!isNativeSignInAvailable || loading}
                      activeOpacity={isNativeSignInAvailable ? 0.8 : 1}
                    >
                      <Ionicons name="logo-apple" size={20} color="#FFFFFF" />
                      <Text style={styles.appleButtonText}>
                        Continue with Apple
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* Forgot Password */}
                  {isLogin && (
                    <TouchableOpacity style={styles.forgotPassword}>
                      <Text style={styles.forgotPasswordText}>Forgot password?</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 32,
    backgroundColor: '#FFFFFF',
  },
  headerBackButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoBackground: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  ninjaImage: {
    width: 36,
    height: 36,
  },
  appName: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  tagline: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    fontWeight: '400',
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: 24,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
  },
  formHeader: {
    marginBottom: 20,
    alignItems: 'center',
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
    textAlign: 'center',
  },
  formSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    fontWeight: '400',
  },
  inputContainer: {
    gap: 12,
    marginBottom: 20,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    height: 52,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    fontWeight: '400',
  },
  passwordInput: {
    paddingRight: 40,
  },
  passwordToggle: {
    position: 'absolute',
    right: 16,
    padding: 4,
  },
  authButton: {
    backgroundColor: '#1CB0F6',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 12,
  },
  authButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  authButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    paddingHorizontal: 16,
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '400',
  },
  googleButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  googleButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  googleButtonDisabled: {
    opacity: 0.5,
  },
  appleButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#000000',
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  appleButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  appleButtonDisabled: {
    opacity: 0.5,
  },
  forgotPassword: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  forgotPasswordText: {
    color: '#1CB0F6',
    fontSize: 14,
    fontWeight: '500',
  },
  verificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verificationTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
  verificationInstructions: {
    marginBottom: 24,
    alignItems: 'center',
  },
  verificationText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 4,
  },
  verificationEmail: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  verificationSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  resendButton: {
    alignItems: 'center',
    paddingVertical: 8,
    marginTop: 8,
  },
  resendButtonText: {
    color: '#1CB0F6',
    fontSize: 14,
    fontWeight: '500',
  },
  emailIconContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    marginVertical: 20,
  },
  waitingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
    textAlign: 'center',
  },
});

export default AuthScreen; 