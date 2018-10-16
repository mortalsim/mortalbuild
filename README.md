# MortalBuild

A simple, straightforward build tool implemented in JavaScript.

This tool was designed to be the build system for [MortalSim](https://github.com/mortalsim)
libraries and modules, which are generally written in C++, but the tool is generic enough
that it could theoretically work with several other languages as well.

Requires Node version >= 6.5

## Installation

npm install mortalbuild

## Usage

```javascript
const MortalBuild = require('mortalbuild');

// MortalBuild simply runs commands on a subprocess. For this it provides a simple
// execution pool to run these commands in parallel. By creating one and providing
// it to each of the build calls, the ExecPool can optimize CPU utilization for
// the build process
var pool = new MortalBuild.ExecPool();

// Create a build definition object (this one uses GCC to build C++ object files)
var buildDef = {
      // File extension for the target file(s) (this will be appended
      // automatically to the target, don't add it to the TPL string!)
      ext: '.o'
      // Command to invoke
      cmd: 'g++'
      // Any necessary flags for the command
      args:
        // Optionally, FLAGS can be defined with ALL:, DEV:, and/or
        // PROD: properties which will cause it to change depending
        // on whether it's a development or production build.

        // These flags will be used for all builds
        all: '-std=c++14 -Iinclude/'
        // These will be used only for dev builds
        dev: '-Wall -Weffc++ -g'
        // These will be used only for production builds
        prod: '-O3'
        // These will be used only for test builds
        test: '-Itest/include -Idep/Catch2/single_include/'
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
  src: 'src/*',
  targetDir: 'build/'
}).then(() => {
  console.log('Build complete!')
});

```

## Options

|     Option     |        Type        |           Default            |   Description  
| -------------- | ------------------ | ---------------------------- | -------------------------------------------------------
| execPool       | ExecPool           | ExecPool(os.cpus().length()) | ExecPool object for running commands in parallel
| buildDef       | Object             |                              | Required build definition object (see below)
| dev            | Boolean            | False                        | Whether to use dev arguments
| src            | String or [String] |                              | Source file(s)
| target         | String             |                              | Target file (if no targetDir provided)
| targetDir      | String or [String] |                              | Target file directory (if no target provided)
| forceRun       | Boolean            | False                        | Forces a run, even if the target is newer than source
| execOpts       | Object             | {}                           | Options passed to [child_process.exec][1]

### Build Definition Object

The Build definition object (`buildDef` in the options above) defines the command to be run.
These commands are run via [child_process.exec][1]. The options to define these commands are
as follows:

|     Option     |        Type        |   Description  
| -------------- | ------------------ | -------------------------------------------------------
| ext            | String             | Target file extension
| cmd            | String             | Command to execute
| args           | String or Object   | Arguments to pass to the cmd
| tpl            | String             | ECMAScript template string for the command.

The `tpl` template will be compiled at runtime with `${target}` set to the target file and `${source}`
set to the source file(s). The target extension (designated by `ext`) will be added internally.
${ext} should never be in the template string.

[1]: https://nodejs.org/api/child_process.html#child_process_child_process_exec_command_options_callback "child_process.exec"
