let path = require("path");
const { override, disableChunk } = require("customize-cra");

module.exports = {
  webpack: function(config, env) {
    // ビルド対象のファイルを追加
    config.entry = {
      main: [path.resolve("src/index")],
      content_script: [path.resolve("src/content-script")],
      background: [path.resolve("src/background")]
    };

    // ファイル名にハッシュが含まれないようにする
    config.output.filename = "static/js/[name].js";

    return override(
      disableChunk()
    )(config, env);
  }
};