module.exports = function (api) {
  api.cache(true);

  return {
    presets: ["babel-preset-expo"],
    plugins: [
      // In this npm workspace, `babel-preset-expo` is hoisted to the root
      // `node_modules` while `expo-router` stays nested in
      // `qna-mobile/node_modules`. The preset's internal `hasModule('expo-router')`
      // check runs from the hoisted location and can't see the sibling
      // workspace, so it silently skips the plugin that inlines
      // `process.env.EXPO_ROUTER_APP_ROOT`. Register it explicitly.
      require("babel-preset-expo/build/expo-router-plugin")
        .expoRouterBabelPlugin,
    ],
  };
};
