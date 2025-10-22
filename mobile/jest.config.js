module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testMatch: [
    '**/__tests__/**/*.(js|jsx|ts|tsx)',
    '**/*.(test|spec).(js|jsx|ts|tsx)'
  ],
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|@react-native|@react-navigation|expo|@expo|@unimodules|unimodules|sentry-expo|native-base|react-native-svg|@react-native-async-storage|@react-native-community|react-native-paper|react-native-vector-icons|@react-native-picker|react-native-gesture-handler|react-native-reanimated|react-native-safe-area-context|react-native-screens|@react-native-community|react-native-keychain|expo-secure-store|expo-sqlite|expo-notifications|expo-image|expo-image-picker|expo-status-bar|expo-router|socket.io-client|kea)'
  ],
  testEnvironment: 'jsdom'
};