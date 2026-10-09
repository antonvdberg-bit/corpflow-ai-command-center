import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import Module from 'node:module';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const root = join(import.meta.dirname, '..');
const originalJsLoader = require.extensions['.js'];
const originalModuleLoad = Module._load;
const babel = require('next/dist/compiled/babel/core');
const presetReact = require('next/dist/compiled/babel/preset-react');
const transformModulesCommonjs = require('next/dist/compiled/babel/plugin-transform-modules-commonjs');
const React = require('react');

Module._load = function businessAdminDeskModuleLoader(request, parent, isMain) {
  if (request === 'next/head') {
    return function TestHead({ children }) {
      return React.createElement(React.Fragment, null, children);
    };
  }
  return originalModuleLoad.call(this, request, parent, isMain);
};

require.extensions['.js'] = function businessAdminDeskJsLoader(module, filename) {
  if (filename.includes(`${join('node_modules')}/`)) {
    return originalJsLoader(module, filename);
  }
  const source = readFileSync(filename, 'utf8');
  const transformed = babel.transformSync(source, {
    filename,
    presets: [presetReact],
    plugins: [transformModulesCommonjs],
  });
  module._compile(transformed.code, filename);
};

const ReactDOMServer = require('react-dom/server');

export function loadModule(relativePath) {
  return require(join(root, relativePath));
}

export function loadComponent(relativePath) {
  const module = loadModule(relativePath);
  return module.default || module;
}

export function render(element) {
  return ReactDOMServer.renderToStaticMarkup(element);
}

export function createElement(component, props = {}, ...children) {
  return React.createElement(component, props, ...children);
}

export function restoreJsLoader() {
  require.extensions['.js'] = originalJsLoader;
  Module._load = originalModuleLoad;
}
