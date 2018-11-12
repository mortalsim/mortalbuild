const MortalBuild = require('../..');
const assert = require('assert');
var intercept = require('intercept-stdout');
var capturedText = '';

intercept(function(txt) {
  capturedText += txt;
});

process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
  // application specific logging, throwing an error, or other logic here
});
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
  // Include flag
  incl: '-I',
  // Any include directories to add
  includes: {
    all: 'include/',
    test: [
      'test/include',
      'dep/Catch2/single_include/'
    ]
  },
  // Any necessary flags for the command
  args: {
    // Optionally, FLAGS can be defined with ALL:, DEV:, and/or
    // PROD: properties which will cause it to change depending
    // on whether it's a development or production build.

    // These flags will be used for all builds
    all: '-std=c++14',
    // These will be used only for dev builds
    dev: '-Wall -Weffc++ -g',
    // These will be used only for production builds
    prod: '-O3'
  },
  // ECMAScript template for the build command. Use ${source}
  // for the source file(s) and ${target} for the target file
  tpl: '${cmd} ${args} ${includes} -c -o ${target} ${source}'
};

console.log('Running tests...');

// Run the build! This returns a promise so you can use it to be
// notified when all build commands are complete
MortalBuild.build({
  execPool: pool,
  buildDef: buildDef,
  dev: true, // use the dev settings
  src: 'test/src/*',
  targetDir: 'test/build/dev',
}).then(() => {
  var cmd = 'g++ -std=c++14 -Wall -Weffc++ -g -Iinclude/ -c -o test/build/dev/hello_world.o test/src/hello_world.cpp';
  assert.ok(capturedText.indexOf(cmd) >= 0, 'Incorrect dev build command');
  console.log('dev build passed');
}, (err) => {
  throw err;
});

MortalBuild.build({
  execPool: pool,
  buildDef: buildDef,
  dev: false, // use the production settings
  src: 'test/src/*',
  targetDir: 'test/build/prod',
}).then(() => {
  var cmd = 'g++ -std=c++14 -O3 -Iinclude/ -c -o test/build/prod/hello_world.o test/src/hello_world.cpp';
  assert.ok(capturedText.indexOf(cmd) >= 0, 'Incorrect prod build command');
  console.log('prod build passed');
}, (err) => {
  throw err;
});

MortalBuild.build({
  execPool: pool,
  buildDef: buildDef,
  test: true, // use the test settings
  src: 'test/src/*',
  targetDir: 'test/build/test',
}).then(() => {
  var cmd = 'g++ -std=c++14 -O3 -Iinclude/ -Itest/include -Idep/Catch2/single_include/ -c -o test/build/test/hello_world.o test/src/hello_world.cpp';
  assert.ok(capturedText.indexOf(cmd) >= 0, 'Incorrect test build command');
  console.log('test build passed');
}, (err) => {
  throw err;
});
