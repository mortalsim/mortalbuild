const path = require('path');
const MortalBuild = require('../..');

// MortalBuild simply runs commands on a subprocess. For this it provides a simple
// execution pool to run these commands in parallel. By creating one and providing
// it to each of the build calls, the ExecPool can optimize CPU utilization for
// the build process
var pool = new MortalBuild.ExecPool();

// Create a build definition object (this one uses GCC to build C++ object files)
var buildDef = {
  // File extension for the target file(s) (this will be appended
  // automatically to the target, don't add it to the TPL string!)
  ext: '.o',
  // Command to invoke
  cmd: 'g++',
  // Any necessary flags for the command
  args: {
    // Optionally, FLAGS can be defined with ALL:, DEV:, and/or
    // PROD: properties which will cause it to change depending
    // on whether it's a development or production build.

    // These flags will be used for all builds
    all: '-std=c++14 -Iinclude/',
    // These will be used only for dev builds
    dev: '-Wall -Weffc++ -g',
    // These will be used only for production builds
    prod: '-O3',
    // These will be used only for test builds
    test: '-Itest/include -Idep/Catch2/single_include/'
  },
  // ECMAScript template for the build command. Use ${source}
  // for the source file(s) and ${target} for the target file
  tpl: '${cmd} ${args} -c -o ${target} ${source}'
};


// Run the build! This returns a promise so you can use it to be
// notified when all build commands are complete
MortalBuild.build({
  execPool: pool,
  buildDef: buildDef,
  dev: true, // use the dev settings
  src: path.join(__dirname, '..', 'src')+'/*',
  targetDir: path.join(__dirname, '..', 'build_dev'),
}).then(() => {
  console.log('Development Build complete!');
}, (err) => {
  console.error('Oops, something went wrong...', err);
});

MortalBuild.build({
  execPool: pool,
  buildDef: buildDef,
  dev: false, // use the production settings
  src: path.join(__dirname, '..', 'src')+'/*',
  targetDir: path.join(__dirname, '..', 'build_prod'),
}).then(() => {
  console.log('Production Build complete!');
}, (err) => {
  console.error('Oops, something went wrong...', err);
});

MortalBuild.fsUtil.ifNewerInDir(path.join(__dirname, '..', '..', 'lib'),
  path.join(__dirname, '..', '..', 'test'),
  () => {console.log('lib is newer'); },
  () => {console.log('test is newer'); });
