module.exports = function cmdLog(cmd, err, stdout, stderr) {
  console.log(cmd);
  if(stdout) console.log(stdout);
  if(err) {
    console.error(stderr);
    throw err;
  }
};
