// Configuración de Metro para monorepo con npm workspaces.
// Sin esto, Metro no encuentra @arbolapp/core ni las dependencias izadas a la raíz.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Vigila todo el monorepo para recargar en caliente los cambios de packages/core.
config.watchFolders = [workspaceRoot];

// Resuelve primero en la app y luego en la raíz del workspace.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

module.exports = config;
