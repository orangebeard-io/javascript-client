const fs = require('fs');
const glob = require('glob');
const os = require('os');
const RestClient = require('./rest');
const pjson = require('../package.json');

const MIN = 3;
const MAX = 256;
const PJSON_VERSION = pjson.version;
const PJSON_NAME = pjson.name;

const getUUIDFromFileName = (filename) => filename.match(/oblaunch-(.*)\.tmp/)[1];

module.exports = {
  formatName(name) {
    const len = name.length;
    return (len < MIN ? name + new Array(MIN - len + 1).join('.') : name).slice(-MAX);
  },

  now() {
    return new Date().valueOf();
  },

  getServerResult(url, request, options, method) {
    return RestClient.request(method, url, request, options);
  },

  readLaunchesFromFile() {
    const files = glob.sync('oblaunch-*.tmp');
    const ids = files.map(getUUIDFromFileName);

    return ids;
  },

  saveLaunchIdToFile(launchId) {
    const filename = `oblaunch-${launchId}.tmp`;
    fs.open(filename, 'w', (err) => {
      if (err) {
        throw err;
      }
    });
  },

  getSystemAttribute() {
    const osType = os.type();
    const osArchitecture = os.arch();
    const RAMSize = os.totalmem();
    const nodeVersion = process.version;
    const systemAttr = [
      {
        key: 'client',
        value: `${PJSON_NAME}|${PJSON_VERSION}`,
        system: true,
      },
      {
        key: 'os',
        value: `${osType}|${osArchitecture}`,
        system: true,
      },
      {
        key: 'RAMSize',
        value: RAMSize,
        system: true,
      },
      {
        key: 'nodeJS',
        value: nodeVersion,
        system: true,
      },
    ];

    return systemAttr;
  },

  generateTestCaseId(codeRef, params) {
    if (!codeRef) {
      return undefined;
    }

    if (!params) {
      return codeRef;
    }

    const parameters = params.reduce(
      (result, item) => (item.value ? result.concat(item.value) : result),
      [],
    );

    return `${codeRef}[${parameters}]`;
  },
};
