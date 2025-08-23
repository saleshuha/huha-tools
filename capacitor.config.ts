import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.b8534ecb6b6b428596757d5b3166e7b9',
  appName: 'huha-tools',
  webDir: 'dist',
  server: {
    // For production APK build - serves bundled assets
    // url: 'https://b8534ecb-6b6b-4285-9675-7d5b3166e7b9.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#ffffff',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false
    }
  }
};

export default config;