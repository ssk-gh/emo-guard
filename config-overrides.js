const path = require('path');
const { override, disableChunk } = require('customize-cra');
const Dotenv = require('dotenv-webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  paths: function (paths, env) {
    paths.appIndexJs = path.resolve('src/popup/index.tsx');
    return paths;
  },
  webpack: function (config, env) {
    // Add files to build
    config.entry = {
      // Assign the popup as main because `main` entry is required
      main: [path.resolve('src/popup/index')],
      options: [path.resolve('src/options/index')],
      'content-script': [path.resolve('src/content-script/content-script')],
      background: [path.resolve('src/background/background')]
    };

    // Avoid including hashes in file names
    config.output.filename = 'static/js/[name].js';
    const defaultMiniCssExtractPlugin = config.plugins.find(plugin => plugin.constructor.name === 'MiniCssExtractPlugin');
    defaultMiniCssExtractPlugin.options.filename = 'static/css/[name].css';

    // Inject only the specified <script> into the `popup.html`
    const defaultHtmlWebpackPlugin = config.plugins.find(plugin => plugin.constructor.name === 'HtmlWebpackPlugin');
    defaultHtmlWebpackPlugin.userOptions.filename = 'popup.html'
    defaultHtmlWebpackPlugin.userOptions.chunks = ['main'];

    // Add multiple entry points
    config.plugins.push(
      new HtmlWebpackPlugin({
        inject: true,
        filename: 'options.html',
        template: 'public/index.html',
        chunks: ['options'],
        minify: Object.assign({}, defaultHtmlWebpackPlugin.userOptions.minify)
      })
    );

    // Enable environment variables in client-side code
    config.plugins = config.plugins.concat([new Dotenv()]);

    // Include Node.js polyfills to use some packages in the browser
    config.resolve.fallback = {
      "crypto": require.resolve("crypto-browserify"),
      "util": require.resolve("util/"),
      "buffer": require.resolve("buffer/"),
      "stream": require.resolve("stream-browserify")
    };

    return override(
      disableChunk()
    )(config, env);
  }
};