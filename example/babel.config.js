module.exports = (api) => {
  api.cache(true);
  return {
    // babel-preset-expo (SDK 55) auto-adds the react-native-worklets plugin
    // required by react-native-reanimated v4 when it detects them installed.
    presets: ["babel-preset-expo"],
  };
};
