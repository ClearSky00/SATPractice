import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const TestScreen = ({ navigation }: any) => {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.comingSoonContainer}>
          <View style={styles.iconContainer}>
            <LinearGradient
              colors={['#E3F2FD', '#F7F9FC']}
              style={styles.iconBackground}
            >
              <Ionicons name="construct" size={50} color="#1CB0F6" />
            </LinearGradient>
          </View>
          
          <Text style={styles.comingSoonTitle}>Coming Soon! 🚀</Text>
          
          <Text style={styles.comingSoonText}>
            We're working hard to bring you comprehensive SAT practice tests.
          </Text>
          
          <Text style={styles.comingSoonSubtext}>
            This feature will include full-length practice exams, detailed analytics, 
            and personalized feedback to help you achieve your target score.
          </Text>

          <View style={styles.featuresPreview}>
            <Text style={styles.featuresTitle}>What's coming:</Text>
            <View style={styles.featuresList}>
              <View style={styles.featureItem}>
                <View style={[styles.featureIcon, { backgroundColor: '#E3F2FD' }]}>
                  <Ionicons name="timer" size={16} color="#1CB0F6" />
                </View>
                <Text style={styles.featureText}>Timed practice tests</Text>
              </View>
              <View style={styles.featureItem}>
                <View style={[styles.featureIcon, { backgroundColor: '#E8F5E8' }]}>
                  <Ionicons name="analytics" size={16} color="#58CC02" />
                </View>
                <Text style={styles.featureText}>Detailed score breakdowns</Text>
              </View>
              <View style={styles.featureItem}>
                <View style={[styles.featureIcon, { backgroundColor: '#FFF3E0' }]}>
                  <Ionicons name="trophy" size={16} color="#FF9800" />
                </View>
                <Text style={styles.featureText}>Performance tracking</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7F7',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  comingSoonContainer: {
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: width * 0.08,
    borderRadius: 20,
    shadowColor: '#1CB0F6',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  iconContainer: {
    marginBottom: 20,
  },
  iconBackground: {
    width: width * 0.25,
    height: width * 0.25,
    maxWidth: 100,
    maxHeight: 100,
    borderRadius: (width * 0.25) / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  comingSoonTitle: {
    fontSize: Math.min(width * 0.08, 28),
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 12,
    textAlign: 'center',
  },
  comingSoonText: {
    fontSize: Math.min(width * 0.045, 16),
    color: '#777',
    textAlign: 'center',
    lineHeight: Math.min(width * 0.06, 22),
    marginBottom: 12,
    fontWeight: '600',
  },
  comingSoonSubtext: {
    fontSize: Math.min(width * 0.04, 14),
    color: '#999',
    textAlign: 'center',
    lineHeight: Math.min(width * 0.055, 20),
    marginBottom: 24,
    fontWeight: '500',
  },
  featuresPreview: {
    width: '100%',
  },
  featuresTitle: {
    fontSize: Math.min(width * 0.045, 16),
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
    textAlign: 'center',
  },
  featuresList: {
    gap: 10,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  featureIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  featureText: {
    fontSize: Math.min(width * 0.04, 14),
    color: '#1A1A1A',
    fontWeight: '600',
    flex: 1,
  },
});

export default TestScreen; 