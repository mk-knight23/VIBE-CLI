/* Webpack configuration for Vibe (Kilo-Style AI Sidebar)
 * Goal: Produce a lean bundle (<5MB) for the extension host code.
 * Only one entry point (extension) – other modules are imported internally.
 * Excludes the 'vscode' module (provided by VS Code runtime).
 */

const path = require('path');

module.exports = (env, argv) => {
  const isProd = argv.mode === 'production';

  return {
    target: 'node',
    mode: 'production',
    entry: {
      extension: './src/extension.ts'
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].js'
    },
    resolve: {
      extensions: ['.ts', '.js']
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          exclude: /node_modules/,
          use: {
            loader: 'ts-loader',
            options: {
              transpileOnly: false
            }
          }
        }
      ]
    },
    externals: {
      vscode: 'commonjs vscode'
    },
    devtool: 'source-map',
    optimization: {
      minimize: true,
      // Safe module concatenation for small bundle
      concatenateModules: true
    },
    performance: {
      hints: isProd ? 'warning' : false,
      maxAssetSize: 5 * 1024 * 1024, // 5MB cap
      maxEntrypointSize: 5 * 1024 * 1024
    },
    stats: {
      assets: true,
      modules: false,
      timings: true
    }
  };
};