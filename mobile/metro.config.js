const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Add support for .wasm files
config.resolver.assetExts.push('wasm');

// Handle expo-sqlite web compatibility
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Exclude backend directory from Metro bundler
// This prevents Node.js code from being imported into React Native
config.resolver.blockList = [
  // Ignore backend directory entirely
  /backend\/.*/,
  // Ignore aws-lambdas directory
  /aws-lambdas\/.*/,
];

// Set watchFolders to only include mobile directory and shared root node_modules
config.watchFolders = [
  path.resolve(__dirname, '..'), // Root for shared node_modules
];

module.exports = config;
