import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

interface ErrorScreenProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  onGoBack?: () => void;
  showBackButton?: boolean;
}

const ErrorScreen: React.FC<ErrorScreenProps> = ({
  title = "Something went wrong",
  message = "We encountered an error while loading your content. Please check your connection and try again.",
  onRetry,
  onGoBack,
  showBackButton = true,
}) => {
  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          {showBackButton && onGoBack && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={onGoBack}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
          )}
          
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>Error</Text>
          </View>
          
          {showBackButton && <View style={styles.spacer} />}
        </View>
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.errorContainer}>
          {/* Error Icon */}
          <View style={styles.iconContainer}>
            <LinearGradient
              colors={['#ff6b6b', '#ee5a24']}
              style={styles.iconGradient}
            >
              <Ionicons name="alert-circle" size={48} color="#fff" />
            </LinearGradient>
          </View>

          {/* Error Content */}
          <View style={styles.textContainer}>
            <Text style={styles.errorTitle}>{title}</Text>
            <Text style={styles.errorMessage}>{message}</Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            {onRetry && (
              <TouchableOpacity
                style={styles.retryButton}
                onPress={onRetry}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#667eea', '#764ba2']}
                  style={styles.buttonGradient}
                >
                  <Ionicons name="refresh" size={20} color="#fff" />
                  <Text style={styles.retryButtonText}>Try Again</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
            
            {onGoBack && !showBackButton && (
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={onGoBack}
                activeOpacity={0.8}
              >
                <Text style={styles.secondaryButtonText}>Go Back</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Help Text */}
          <View style={styles.helpContainer}>
            <Text style={styles.helpText}>
              If the problem persists, please check your internet connection or try again later.
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8faff',
  },
  header: {
    paddingTop: 20,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  },
  spacer: {
    width: 40,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  errorContainer: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    paddingVertical: 40,
  },
  iconContainer: {
    marginBottom: 32,
    shadowColor: '#ff6b6b',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  iconGradient: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#2d3748',
    textAlign: 'center',
    marginBottom: 12,
  },
  errorMessage: {
    fontSize: 16,
    color: '#4a5568',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 320,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
    marginBottom: 32,
  },
  retryButton: {
    shadowColor: '#667eea',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonGradient: {
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#667eea',
    fontSize: 16,
    fontWeight: '600',
  },
  helpContainer: {
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  helpText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
});

export default ErrorScreen; 