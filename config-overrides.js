const path = require('path');
const { override, disableChunk } = require('customize-cra');

module.exports = {
  webpack: function (config, env) {
    // Add files to build
    config.entry = {
      main: [path.resolve('src/index')],
      'content-script': [path.resolve('src/content-script')],
      background: [path.resolve('src/background')]
    };

    // Avoid including hashes in file names
    config.output.filename = 'static/js/[name].js';

    // Inject only the specified <script> into the `index.html`
    config.plugins[0].userOptions.chunks = ['main'];

    return override(
      disableChunk()
    )(config, env);
  }
};