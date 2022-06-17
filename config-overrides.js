const path = require('path');
const { override, disableChunk } = require('customize-cra');
const Dotenv = require('dotenv-webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  webpack: function (config, env) {
    // Add files to build
    config.entry = {
      main: [path.resolve('src/index')],
      options: [path.resolve('src/options')],
      'content-script': [path.resolve('src/content-script')],
      background: [path.resolve('src/background')]
    };

    // Avoid including hashes in file names
    config.output.filename = 'static/js/[name].js';

    // Inject only the specified <script> into the `index.html`
    const defaultHtmlWebpackPlugin = config.plugins.find(plugin => plugin.constructor.name === 'HtmlWebpackPlugin');
    defaultHtmlWebpackPlugin.userOptions.chunks = ['main'];

    // Add multiple entry points
    config.plugins.push(
      new HtmlWebpackPlugin({
        inject: true,
        filename: 'options.html',
        template: 'public/options.html',
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