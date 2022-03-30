const path = require('path');
const fs = require('fs');


const getAppOptions = (pathToResolve) => {
  let traversing = true;

  // Find nearest orangebeard.json by traversing up directories until /
  while (traversing) {
    traversing = pathToResolve !== path.sep;

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
    // eslint-disable-next-line no-param-reassign
    pathToResolve = path.dirname(pathToResolve);
  }

  return {};
};

module.exports = getAppOptions('./');

