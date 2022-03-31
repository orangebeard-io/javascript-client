const path = require('path');
const fs = require('fs');

const getAppOptions = (pathToResolve) => {
  let traversing = true;
  let prevPath;
  // Find nearest orangebeard.json by traversing up directories until /
  while (traversing) {
    const configFilePath = path.join(pathToResolve, 'orangebeard.json');
    if (fs.existsSync(configFilePath)) {
      try {
        // eslint-disable-next-line global-require,import/no-dynamic-require
        let options = JSON.parse(fs.readFileSync(configFilePath));
        if (typeof options !== 'object') {
          options = {};
        }
        return options;
      } catch (error) {
        return {};
      }
    }
    /* eslint-disable no-param-reassign */
    prevPath = pathToResolve;
    pathToResolve = path.dirname(pathToResolve);
    /* eslint-disable no-param-reassign */
    traversing = pathToResolve !== prevPath;
  }

  return {};
};

module.exports = getAppOptions(__dirname);
