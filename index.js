const build = require('./lib/build.js');
const detectBuildMode = require('./lib/detect-build-mode.js');
const execPool = require('./lib/exec-pool.js');
const fsUtil = require('./lib/fs-util.js');

module.exports = {
  build: (opts) => build(opts)(),
  deferBuild: build,
  detectBuildMode: detectBuildMode,
  fsUtil: fsUtil,
  ExecPool: execPool
}
