import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { revenueCatService } from '../services/revenueCat';
import { authService } from '../services/auth';
import { localStorageService } from '../services/localStorageService';

const ProfileScreen = ({ navigation }: any) => {
  const { user, signOut } = useAuth();
  const [isPremium, setIsPremium] = useState(false);
  const [isCheckingPremium, setIsCheckingPremium] = useState(true);

  useEffect(() => {
    checkPremiumStatus();
  }, []);

  const checkPremiumStatus = async () => {
    try {
      setIsCheckingPremium(true);
      const hasPremium = await revenueCatService.checkProEntitlement();
      setIsPremium(hasPremium);
    } catch (error) {
      console.error('Error checking premium status:', error);
    } finally {
      setIsCheckingPremium(false);
    }
  };

  const handleUpgrade = async () => {
    try {
      const success = await revenueCatService.presentPaywall();
      if (success) {
        await checkPremiumStatus();
        Alert.alert('Success!', 'Welcome to Premium! Enjoy unlimited access to all features.');
      }
    } catch (error) {
      console.error('Error presenting paywall:', error);
      Alert.alert('Error', 'Failed to show upgrade options. Please try again.');
    }
  };

  const handleCreateAccount = () => {
    navigation.navigate('Auth');
  };

  const handleAnonymousAccountInfo = () => {
    Alert.alert(
      'Anonymous Account',
      'You\'re currently using the app without an account. Create an account to sync your progress and premium features across devices.',
      [
        { text: 'Continue Without Account', style: 'cancel' },
        { text: 'Create Account', onPress: handleCreateAccount }
      ]
    );
  };

  const handleDeleteAccount = () => {
    const title = user ? 'Delete Account' : 'Delete Local Data';
    const message = user 
      ? 'This will permanently delete your account and all associated data. This action cannot be undone.'
      : 'This will delete all your local progress and data. This action cannot be undone.';

    Alert.alert(
      title,
      message,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: async () => {
            try {
              if (user) {
                // Delete account from database
                await authService.deleteAccount();
                Alert.alert('Account Deleted', 'Your account has been permanently deleted.');
              } else {
                // Delete local data only
                await localStorageService.clearAllData();
                Alert.alert('Data Deleted', 'All local data has been cleared.');
              }
            } catch (error) {
              console.error('Error deleting account/data:', error);
              Alert.alert('Error', 'Failed to delete. Please try again.');
            }
          }
        },
      ]
    );
  };


  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: signOut },
      ]
    );
  };

  const menuItems = [
    {
      title: isPremium ? 'Premium Active' : 'Upgrade to Premium',
      subtitle: isPremium ? 'Enjoy unlimited access to all features' : 'Unlock unlimited practice and advanced features',
      icon: isPremium ? 'star' : 'diamond',
      backgroundColor: '#FFF3E0',
      iconColor: isPremium ? '#FFD900' : '#1CB0F6',
      rightText: isPremium ? 'Active' : 'Upgrade',
      rightTextColor: isPremium ? '#FFD900' : '#1CB0F6',
      onPress: isPremium ? () => {
        Alert.alert('Premium Active', 'You have access to all premium features!');
      } : handleUpgrade,
    },
    {
      title: 'Help & Support',
      subtitle: 'Get help or contact support',
      icon: 'help-circle',
      backgroundColor: '#E3F2FD',
      iconColor: '#1CB0F6',
      onPress: () => {
        Alert.alert('Support', 'Email us at andrew@projectempower.io for assistance!');
      },
    },
    {
      title: 'Terms of Use',
      subtitle: 'View our terms and conditions',
      icon: 'document-text',
      backgroundColor: '#F3F4F6',
      iconColor: '#6B7280',
      onPress: () => {
        Linking.openURL('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/');
      },
    },
    {
      title: 'Privacy Policy',
      subtitle: 'Review our privacy practices',
      icon: 'shield-checkmark',
      backgroundColor: '#F3F4F6',
      iconColor: '#6B7280',
      onPress: () => {
        Linking.openURL('https://www.notion.so/StudyNinja-SAT-Prep-App-Privacy-Policy-2193116a130780ceadc5eb41db104768?source=copy_link');
      },
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.content}>
          {/* Profile Section */}
          <View style={styles.profileCard}>
            <View style={styles.profileInfo}>
              <LinearGradient
                colors={['#1CB0F6', '#1899D6']}
                style={styles.avatar}
              >
                <Text style={styles.avatarText}>
                  {user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                </Text>
              </LinearGradient>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>
                  {user?.name || user?.email?.split('@')[0] || 'Guest'}
                </Text>
                {user && (
                  <Text style={styles.userEmail}>{user.email}</Text>
                )}
                {!isCheckingPremium && isPremium && (
                  <View style={styles.premiumBadge}>
                    <Ionicons name="star" size={16} color="#FFD900" />
                    <Text style={styles.premiumText}>Premium Member</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Account Creation Banner for Anonymous Users */}
          {!user && (
            <View style={styles.accountBanner}>
              <View style={styles.bannerContent}>
                <View style={styles.bannerIcon}>
                  <Ionicons name="person-add" size={24} color="#1CB0F6" />
                </View>
                <View style={styles.bannerText}>
                  <Text style={styles.bannerTitle}>Create an Account</Text>
                  <Text style={styles.bannerSubtitle}>
                    Sync your progress and premium features across all devices
                  </Text>
                </View>
                <TouchableOpacity 
                  style={styles.bannerButton}
                  onPress={handleCreateAccount}
                  activeOpacity={0.8}
                >
                  <Text style={styles.bannerButtonText}>Sign Up</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Settings Menu */}
          <View style={styles.menuContainer}>
            <Text style={styles.sectionTitle}>Settings</Text>
            <View style={styles.menuList}>
              {menuItems.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.menuItem}
                  onPress={item.onPress}
                  activeOpacity={0.8}
                >
                  <View style={styles.menuItemContent}>
                    <View style={[styles.menuIcon, { backgroundColor: item.backgroundColor }]}>
                      <Ionicons name={item.icon as any} size={20} color={item.iconColor} />
                    </View>
                    <View style={styles.menuContent}>
                      <Text style={styles.menuTitle}>{item.title}</Text>
                      <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                    </View>
                    {(item as any).rightText && (
                      <Text style={[
                        styles.rightText,
                        { color: (item as any).rightTextColor || '#1CB0F6' }
                      ]}>
                        {(item as any).rightText}
                      </Text>
                    )}
                    <Ionicons name="chevron-forward" size={16} color="#999" />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Account Actions */}
          {user && (
            <View style={styles.accountSection}>
              <Text style={styles.sectionTitle}>Account</Text>
              <TouchableOpacity 
                style={styles.signOutButton} 
                onPress={handleSignOut}
                activeOpacity={0.8}
              >
                <View style={styles.signOutContent}>
                  <View style={styles.signOutIcon}>
                    <Ionicons name="log-out" size={20} color="#F44336" />
                  </View>
                  <Text style={styles.signOutText}>Sign Out</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* Delete Account/Data Section */}
          <View style={styles.accountSection}>
            <Text style={styles.sectionTitle}>Data</Text>
            <TouchableOpacity 
              style={styles.deleteButton} 
              onPress={handleDeleteAccount}
              activeOpacity={0.8}
            >
              <View style={styles.deleteContent}>
                <View style={styles.deleteIcon}>
                  <Ionicons name="trash" size={20} color="#F44336" />
                </View>
                <Text style={styles.deleteText}>
                  {user ? 'Delete Account' : 'Delete Local Data'}
                </Text>
              </View>
            </TouchableOpacity>
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
  scrollContent: {
    paddingBottom: 30,
  },
  content: {
    paddingHorizontal: 24,
    marginTop: 16,
  },
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#1CB0F6',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: '#777',
    marginBottom: 8,
    fontWeight: '500',
  },
  anonymousText: {
    fontSize: 16,
    color: '#777',
    marginBottom: 8,
    fontWeight: '500',
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  premiumText: {
    color: '#FF8F00',
    fontWeight: '700',
    marginLeft: 6,
    fontSize: 14,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1CB0F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  upgradeText: {
    color: '#fff',
    fontWeight: '700',
    marginLeft: 6,
    fontSize: 14,
  },
  accountBanner: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bannerIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  bannerText: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  bannerSubtitle: {
    fontSize: 14,
    color: '#777',
    fontWeight: '500',
  },
  bannerButton: {
    backgroundColor: '#1CB0F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  bannerButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  menuContainer: {
    marginBottom: 32,
  },
  menuList: {
    gap: 12,
  },
  menuItem: {
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 14,
    color: '#777',
    fontWeight: '500',
  },
  rightText: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
  },
  accountSection: {
    marginBottom: 32,
  },
  signOutButton: {
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  signOutContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  signOutIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#FFEBEE',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F44336',
  },
  deleteButton: {
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  deleteContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  deleteIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#FFEBEE',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  deleteText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F44336',
  },
});

export default ProfileScreen; 