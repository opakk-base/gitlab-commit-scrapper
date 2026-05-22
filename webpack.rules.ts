import type { ModuleOptions } from 'webpack';

type Rule = NonNullable<ModuleOptions['rules']>[number];

const nodeFileRule: Rule = {
  test: /native_modules[/\\].+\.node$/,
  use: 'node-loader',
};

const cssRule: Rule = {
  test: /\.css$/,
  use: [
    'style-loader',
    'css-loader',
    {
      loader: 'postcss-loader',
      options: {
        postcssOptions: {
          plugins: {
            '@tailwindcss/postcss': {},
          },
        },
      },
    },
  ],
};

// Main process: keep CJS emit so `require('electron-squirrel-startup')`
// in src/index.ts continues to work.
export const mainRules: Required<ModuleOptions>['rules'] = [
  nodeFileRule,
  {
    test: /\.tsx?$/,
    exclude: /(node_modules|\.webpack)/,
    use: {
      loader: 'ts-loader',
      options: {
        transpileOnly: true,
      },
    },
  },
];

// Renderer: emit ESM so packages declared with `"type": "module"`
// (e.g. html2canvas-pro) resolve via the `import` export condition
// and produce real ESM bindings instead of corrupted UMD output.
export const rendererRules: Required<ModuleOptions>['rules'] = [
  nodeFileRule,
  {
    test: /\.tsx?$/,
    exclude: /(node_modules|\.webpack)/,
    use: {
      loader: 'ts-loader',
      options: {
        transpileOnly: true,
        compilerOptions: {
          module: 'esnext',
        },
      },
    },
  },
  cssRule,
];

// Backwards-compatible alias kept for any external import of `rules`.
export const rules = rendererRules;
