const execSync = require('child_process').execSync;
const BUILD_TYPES_TO_CHECK = ['OBJ_CC', 'STATIC_LC', 'SHARED_LC'];

module.exports = function detectBuildMode(buildDefMap) {
  var modes = Object.keys(buildDefMap);

  // create a copy to keep track of which modes are valid
  var validModes = modes.slice();

  modes.forEach((mode) => {
    var def = buildDefMap[mode];

    BUILD_TYPES_TO_CHECK.forEach((type) => {
      if(!commandExists(def[type].CMD)) {
        console.log('Command does not exist: ', def[type].CMD);
        var idx = validModes.indexOf(mode);
        if(idx > -1) validModes.splice(idx,1);
      }
    });
  });

  if(modes.length < 1)
    throw new Error('Unable to determine a valid build mode automatically');

  console.log('Valid Modes:', validModes);

  // TODO: if we still have more than one mode... determine
  // the best one based on the OS and other criteria

  return validModes[0];
};


function commandExists(cmd) {
  try {
    return !!execSync('where '+cmd, {stdio:[]});
  }
  catch(e) {
    return false;
  }
}
