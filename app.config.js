export default {
  expo: {
    name: "Nottos",
    slug: "notes",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "notes",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: false,
      bundleIdentifier: "com.notesapp.voicenotes",
      usesAppleSignIn: true,
      infoPlist: {
        NSSpeechRecognitionUsageDescription: "Nottos uses speech recognition to transcribe your spoken voice notes into text, so you can dictate a reminder like \"Call Mom tomorrow at 5pm\" and have it saved as a written note.",
        NSMicrophoneUsageDescription: "Nottos needs microphone access to record your voice notes. For example, you can tap the microphone button to dictate a journal entry or reminder instead of typing it.",
        NSCameraUsageDescription: "Nottos uses the camera so you can capture photos to attach to your journal entries and notes. For example, snap a picture of a meal, a whiteboard, or a place to save it with your journal entry.",
        NSLocationWhenInUseUsageDescription: "Nottos uses your location to trigger location-based reminders. For example, you can save \"Buy milk\" to remind you when you arrive at your local grocery store.",
        NSPhotoLibraryUsageDescription: "Nottos accesses your photo library so you can attach existing photos to your journal entries and notes. For example, pick a photo from your library to add to a journal entry about your day.",
        ITSAppUsesNonExemptEncryption: false
      }
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png"
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: "com.notesapp.voicenotes",
      permissions: [
        "ACCESS_COARSE_LOCATION",
        "ACCESS_FINE_LOCATION",
        "android.permission.RECORD_AUDIO",
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.ACCESS_FINE_LOCATION"
      ]
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png"
    },
    plugins: [
      "expo-router",
      "expo-apple-authentication",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
          dark: {
            backgroundColor: "#000000"
          }
        }
      ],
      "expo-speech-recognition",
      [
        "expo-location",
        {
          locationWhenInUsePermission: "Nottos uses your location to trigger location-based reminders. For example, you can save \"Buy milk\" to remind you when you arrive at your local grocery store."
        }
      ],
      "@react-native-community/datetimepicker"
    ],
    experiments: {
      typedRoutes: true
    },
    extra: {
      router: {},
      // Environment variables from EAS Secrets
      DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY || '',
      OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
      GOOGLE_PLACES_API_KEY: process.env.GOOGLE_PLACES_API_KEY || '',
      eas: {
        projectId: "d676cf2a-5bc7-4bf8-b616-7ccb12f07aa4"
      }
    }
  }
};
