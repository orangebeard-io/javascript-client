import path from 'path';
import fs from 'fs';
import { OrangebeardParameters } from '../models/OrangebeardParameters';
import { Attribute } from '../models/Attribute';

/* eslint-disable no-param-reassign */
function getAttributesFromString(stringAttr: string): Array<Attribute> {
  return stringAttr
    ? stringAttr.split(';').map((attribute) => {
        const attributeArr = attribute.split(':');

        return {
          key: attributeArr.length === 1 ? null : attributeArr[0],
          value: attributeArr.length === 1 ? attributeArr[0] : attributeArr[1],
        };
      })
    : [];
}

function updateConfigParametersFromEnv(
  currentConfig: OrangebeardParameters,
): OrangebeardParameters {
  currentConfig.token = process.env.ORANGEBEARD_TOKEN || currentConfig.token;
  currentConfig.endpoint = process.env.ORANGEBEARD_ENDPOINT || currentConfig.endpoint;
  currentConfig.testset = process.env.ORANGEBEARD_TESTSET || currentConfig.testset;
  currentConfig.project = process.env.ORANGEBEARD_PROJECT || currentConfig.project;
  currentConfig.description = process.env.ORANGEBEARD_DESCRIPTION || currentConfig.description;
  currentConfig.attributes = process.env.ORANGEBEARD_ENDPOINT
    ? getAttributesFromString(process.env.ORANGEBEARD_ENDPOINT)
    : currentConfig.attributes;

  return currentConfig;
}

function getConfig(pathToResolve: string): OrangebeardParameters {
  let traversing = true;
  let prevPath: string;
  while (traversing) {
    const configFilePath = path.join(pathToResolve, 'orangebeard.json');
    if (fs.existsSync(configFilePath)) {
      try {
        let config: OrangebeardParameters = JSON.parse(fs.readFileSync(configFilePath, 'utf8'));
        if (typeof config !== 'object') {
          config = undefined;
        }
        return updateConfigParametersFromEnv(config);
      } catch (error) {
        return undefined;
      }
    }

    prevPath = pathToResolve;
    pathToResolve = path.dirname(pathToResolve);

    traversing = pathToResolve !== prevPath;
  }

  return undefined;
}
/* eslint-enable no-param-reassign */
export default getConfig(process.cwd());
