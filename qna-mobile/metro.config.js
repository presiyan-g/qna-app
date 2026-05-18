// Metro configuration for the npm-workspace monorepo.
//
// `qna-mobile` shares a single `node_modules` tree with `qna-web` at the
// workspace root. npm hoists some Expo/React Native packages to the root and
// keeps others (those whose peer deps tug toward this workspace's React
// version) nested in `qna-mobile/node_modules`. Metro's default resolver only
// walks up from the importing file, so a hoisted package can't find a nested
// peer (e.g. `@react-navigation/native-stack` at the root cannot resolve
// `react-native-screens` from `qna-mobile/node_modules`).
//
// Telling Metro to search both `node_modules` trees fixes the cross-tree
// resolution without giving up on workspace hoisting.

const { getDefaultConfig } = require("expo/metro-config");
const path = require("node:path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
// Keep hierarchical lookup enabled so packages like `react-native` can still
// find their privately nested copies (`react-native/node_modules/@react-native/...`).
// We just augment the search with both `node_modules` trees so resolves across
// hoisted/nested boundaries succeed.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

module.exports = config;
