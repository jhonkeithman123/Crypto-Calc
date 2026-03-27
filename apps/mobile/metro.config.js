const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch all files in the workspace
config.watchFolders = [workspaceRoot];

// Resolve modules from workspace root first, then project root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Map @crypto/* package aliases to their source files
config.resolver.extraNodeModules = {
  '@crypto/cipher-core': path.resolve(workspaceRoot, 'packages/cipher-core/src'),
  '@crypto/cipher-contract': path.resolve(workspaceRoot, 'packages/cipher-contract/src'),
  '@crypto/modcalc-core': path.resolve(workspaceRoot, 'packages/modcalc-core/src'),
};

module.exports = config;
