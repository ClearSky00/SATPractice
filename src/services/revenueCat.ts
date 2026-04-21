import Purchases, { CustomerInfo, PurchasesPackage, INTRO_ELIGIBILITY_STATUS } from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';
import { Alert } from 'react-native';



export class RevenueCatService {
  private static instance: RevenueCatService;
  private initialized = false;

  static getInstance(): RevenueCatService {
    if (!RevenueCatService.instance) {
      RevenueCatService.instance = new RevenueCatService();
    }
    return RevenueCatService.instance;
  }

  async initialize(userId?: string): Promise<void> {
    if (this.initialized) return;

    try {
      console.log('🚀 Initializing RevenueCat...');
      
      // Initialize RevenueCat - works for both anonymous and authenticated users
      await Purchases.configure({
        apiKey: REVENUE_CAT_API_KEY,
        // appUserID is optional - if not provided, RevenueCat creates anonymous user
        appUserID: userId,
      });

      // Only log in if user ID is provided (authenticated users)
      if (userId) {
        console.log('🔑 Logging in user:', userId);
        await Purchases.logIn(userId);
      } else {
        console.log('🔑 User purchasing anonymously');
      }

      this.initialized = true;
      console.log('✅ RevenueCat initialized successfully');
      
      // Immediately test offerings
      await this.testConfiguration();
    } catch (error) {
      console.error('❌ Failed to initialize RevenueCat:', error);
      throw error;
    }
  }

  private async testConfiguration(): Promise<void> {
    try {
      console.log('🧪 Testing RevenueCat configuration...');
      const offerings = await Purchases.getOfferings();
      console.log('📦 Available offerings:', Object.keys(offerings.all));
      console.log('📦 Current offering:', offerings.current?.identifier);
      console.log('📦 Available packages:', offerings.current?.availablePackages?.length || 0);
      
      // 🎫 CHECK INTRO OFFER ELIGIBILITY
      console.log('🎫 Checking intro offer eligibility...');
      const eligibility = await Purchases.checkTrialOrIntroductoryPriceEligibility(['Weekly_Subscription', 'Monthly_Subscription']);
      console.log('🎫 Intro offer eligibility:', eligibility);
      
      if (offerings.current?.availablePackages) {
        offerings.current.availablePackages.forEach((pkg, index) => {
          const product = pkg.product;
          
          console.log(`📱 Package ${index + 1}:`, {
            identifier: pkg.identifier,
            productId: product.identifier,
            priceString: product.priceString,
            productType: product.productType
          });
          
          // 🔍 INTRO OFFER DEBUGGING
          console.log(`🎁 Intro Offer Debug for ${product.identifier}:`);
          console.log('  - Has introPrice:', !!product.introPrice);
          console.log('  - IntroPrice object:', product.introPrice);
          console.log('  - Eligibility:', eligibility[product.identifier] || 'Not checked');
          
          if (product.introPrice) {
            console.log('  ✅ INTRO OFFER DETECTED:');
            console.log('    - Price:', product.introPrice.priceString);
            console.log('    - Period:', product.introPrice.periodNumberOfUnits, product.introPrice.periodUnit);
            console.log('    - Cycles:', product.introPrice.cycles);
          } else {
            console.log('  ❌ NO INTRO OFFER DETECTED');
          }
          
          // Show eligibility status prominently
          const userEligibility = eligibility[product.identifier];
          if (userEligibility) {
            console.log(`  🎫 ELIGIBILITY: ${userEligibility.status}`);
            if (userEligibility.status === INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_INELIGIBLE) {
              console.log('  🚫 USER INELIGIBLE - This is why intro text is hidden!');
            } else if (userEligibility.status === INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_ELIGIBLE) {
              console.log('  ✅ USER ELIGIBLE - Intro text should show!');
            }
          }
          
          // Check for any other intro-related properties
          console.log('  - Raw product keys:', Object.keys(product));
          
          // Check if there are other intro-related properties
          const productAny = product as any;
          if (productAny.discounts) {
            console.log('  - Discounts array:', productAny.discounts);
          }
          if (productAny.introductoryOffer) {
            console.log('  - Introductory offer:', productAny.introductoryOffer);
          }
          if (productAny.subscriptionPeriod) {
            console.log('  - Subscription period:', productAny.subscriptionPeriod);
          }
          
          console.log('  ═══════════════════════════════════');
        });
      } else {
        console.log('❌ No packages found in current offering');
      }
    } catch (error) {
      console.error('❌ Configuration test failed:', error);
    }
  }

  async presentPaywall(): Promise<boolean> {
    try {
      console.log('💳 Presenting paywall...');
      
      // Check offerings first
      const offerings = await Purchases.getOfferings();
      if (!offerings.current || offerings.current.availablePackages.length === 0) {
        console.error('❌ No offerings or packages available for paywall');
        return false;
      }

      console.log('✅ Offerings available, showing paywall...');
      const paywallResult: PAYWALL_RESULT = await RevenueCatUI.presentPaywall();
      console.log('💳 Paywall result:', paywallResult);

      switch (paywallResult) {
        case PAYWALL_RESULT.NOT_PRESENTED:
          console.log('❌ Paywall not presented');
          return false;
        case PAYWALL_RESULT.ERROR:
          console.log('❌ Paywall error');
          return false;
        case PAYWALL_RESULT.CANCELLED:
          console.log('🚫 Paywall cancelled by user');
          return false;
        case PAYWALL_RESULT.PURCHASED:
          console.log('✅ Purchase successful');
          // Show optional registration prompt after successful purchase
          this.showOptionalRegistration();
          return true;
        case PAYWALL_RESULT.RESTORED:
          console.log('✅ Purchase restored');
          return true;
        default:
          console.log('❓ Unknown paywall result:', paywallResult);
          return false;
      }
    } catch (error) {
      console.error('❌ Error presenting paywall:', error);
      return false;
    }
  }

  private showOptionalRegistration() {
    // Show this as a non-blocking prompt after successful purchase
    Alert.alert(
      'Sync Across Devices?',
      'Create an account to access your premium features on all your devices. You can skip this and continue using premium features on this device only.',
      [
        { text: 'Skip for Now', style: 'cancel' },
        { 
          text: 'Create Account', 
          onPress: () => {
            // This will be handled by the navigation system
            // The app should provide a way to navigate to registration
            console.log('User wants to create account after purchase');
          }
        }
      ]
    );
  }

  async linkAnonymousPurchaseToUser(userId: string): Promise<boolean> {
    try {
      console.log('🔗 Linking anonymous purchase to user:', userId);
      
      // This transfers any anonymous purchases to the authenticated user
      const logInResult = await Purchases.logIn(userId);
      
      // Check if the transfer was successful
      const hasActiveEntitlement = logInResult.customerInfo.entitlements.active[PRO_ENTITLEMENT_ID] != null;
      
      if (hasActiveEntitlement) {
        console.log('✅ Successfully linked anonymous purchase to user account');
      } else {
        console.log('ℹ️ No anonymous purchases to transfer');
      }
      
      return hasActiveEntitlement;
    } catch (error) {
      console.error('❌ Error linking anonymous purchase:', error);
      return false;
    }
  }

  async presentPaywallIfNeeded(): Promise<boolean> {
    try {
      const paywallResult: PAYWALL_RESULT = await RevenueCatUI.presentPaywallIfNeeded({
        requiredEntitlementIdentifier: PRO_ENTITLEMENT_ID.toLowerCase(),
      });

      switch (paywallResult) {
        case PAYWALL_RESULT.NOT_PRESENTED:
          return true;
        case PAYWALL_RESULT.ERROR:
        case PAYWALL_RESULT.CANCELLED:
          return false;
        case PAYWALL_RESULT.PURCHASED:
        case PAYWALL_RESULT.RESTORED:
          return true;
        default:
          return false;
      }
    } catch (error) {
      console.error('Error presenting paywall if needed:', error);
      return false;
    }
  }

  async checkProEntitlement(): Promise<boolean> {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      const proEntitlement = customerInfo.entitlements.active[PRO_ENTITLEMENT_ID];
      const isActive = proEntitlement != null;
      console.log('🏆 Pro entitlement active:', isActive);
      return isActive;
    } catch (error) {
      console.error('Error checking Pro entitlement:', error);
      return false;
    }
  }

  async restorePurchases(): Promise<boolean> {
    try {
      const customerInfo = await Purchases.restorePurchases();
      const hasPremium = customerInfo.entitlements.active[PRO_ENTITLEMENT_ID] != null;
      
      return hasPremium;
    } catch (error) {
      console.error('Error restoring purchases:', error);
      return false;
    }
  }

  async getOfferings(): Promise<PurchasesPackage[]> {
    try {
      const offerings = await Purchases.getOfferings();
      return offerings.current?.availablePackages || [];
    } catch (error) {
      console.error('Error getting offerings:', error);
      return [];
    }
  }

  async logOut(): Promise<void> {
    try {
      await Purchases.logOut();
    } catch (error) {
      console.error('Error logging out of RevenueCat:', error);
    }
  }

  async manageSubscriptions(): Promise<boolean> {
    try {
      console.log('📱 Opening subscription management...');
      
      // Try to show the manage subscriptions screen
      await Purchases.showManageSubscriptions();
      return true;
    } catch (error) {
      console.error('❌ Error opening subscription management:', error);
      return false;
    }
  }

  async getSubscriptionInfo(): Promise<{
    isActive: boolean;
    expirationDate?: string;
    willRenew?: boolean;
    productIdentifier?: string;
  }> {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      const proEntitlement = customerInfo.entitlements.active[PRO_ENTITLEMENT_ID];
      
      if (proEntitlement) {
        return {
          isActive: true,
          expirationDate: proEntitlement.expirationDate || undefined,
          willRenew: proEntitlement.willRenew,
          productIdentifier: proEntitlement.productIdentifier,
        };
      }
      
      return { isActive: false };
    } catch (error) {
      console.error('Error getting subscription info:', error);
      return { isActive: false };
    }
  }
}

export const revenueCatService = RevenueCatService.getInstance(); 