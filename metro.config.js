const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// expo-sqlite's web implementation imports wa-sqlite.wasm. Metro's Expo
// defaults do not resolve .wasm in this SDK, so include it as an asset for
// web export while leaving native bundling behavior unchanged.
config.resolver.assetExts = Array.from(new Set([...config.resolver.assetExts, 'wasm']));

module.exports = config;
