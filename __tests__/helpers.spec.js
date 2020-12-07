const os = require('os');
const fs = require('fs');
const glob = require('glob');
const OrangebeardClient = require('../index');
const RestClient = require('../utils/rest');
const pjson = require('../package.json');

describe('Helpers', () => {
  const client = new OrangebeardClient({ token: 'token' });

  describe('formatName', () => {
    it('slice last 256 symbols', () => {
      expect(client.helpers.formatName(`a${'b'.repeat(256)}`)).toBe('b'.repeat(256));
    });
    it('leave 256 symbol name as is', () => {
      expect(client.helpers.formatName('c'.repeat(256))).toBe('c'.repeat(256));
    });
    it('leave 3 symbol name as is', () => {
      expect(client.helpers.formatName('abc')).toBe('abc');
    });
    it('complete with dots 2 symbol name', () => {
      expect(client.helpers.formatName('ab')).toBe('ab.');
    });
  });

  describe('now', () => {
    it('returns milliseconds from unix time', () => {
      expect(new Date() - client.helpers.now()).toBeLessThan(100); // less than 100 miliseconds difference
    });
  });

  describe('getServerResults', () => {
    it('calls RestClient#request', () => {
      jest.spyOn(RestClient, 'request');

      client.helpers.getServerResult(
        'http://localhost:80/api/v1',
        { userId: 1 },
        {
          headers: {
            'X-Custom-Header': 'WOW',
          },
        },
        'POST',
      );

      expect(RestClient.request).toHaveBeenCalledWith(
        'POST',
        'http://localhost:80/api/v1',
        { userId: 1 },
        {
          headers: {
            'X-Custom-Header': 'WOW',
          },
        },
      );
    });
  });

  describe('readLaunchesFromFile', () => {
    it('should return the right ids', () => {
      jest
        .spyOn(glob, 'sync')
        .mockImplementation(() => ['oblaunch-fileOne.tmp', 'oblaunch-fileTwo.tmp']);

      const ids = client.helpers.readLaunchesFromFile();

      expect(ids).toEqual(['fileOne', 'fileTwo']);
    });
  });

  describe('saveLaunchIdToFile', () => {
    it('should call fs.open method with right parameters', () => {
      jest.spyOn(fs, 'open');

      client.helpers.saveLaunchIdToFile('fileOne');

      expect(fs.open).toHaveBeenCalledWith('oblaunch-fileOne.tmp', 'w', expect.any(Function));
    });
  });

  describe('getSystemAttribute', () => {
    it('should return correct system attributes', () => {
      jest.spyOn(os, 'type').mockImplementation(() => 'osType');
      jest.spyOn(os, 'arch').mockImplementation(() => 'osArchitecture');
      jest.spyOn(os, 'totalmem').mockImplementation(() => '1');
      const nodeVersion = process.version;
      const expectedAttr = [
        {
          key: 'client',
          value: `${pjson.name}|${pjson.version}`,
          system: true,
        },
        {
          key: 'os',
          value: 'osType|osArchitecture',
          system: true,
        },
        {
          key: 'RAMSize',
          value: '1',
          system: true,
        },
        {
          key: 'nodeJS',
          value: nodeVersion,
          system: true,
        },
      ];

      const attr = client.helpers.getSystemAttribute();

      expect(attr).toEqual(expectedAttr);
    });
  });

  describe('generateTestCaseId', () => {
    it('should return undefined if there is no codeRef', () => {
      const testCaseId = client.helpers.generateTestCaseId();

      expect(testCaseId).toEqual(undefined);
    });

    it('should return codeRef if there is no params', () => {
      const testCaseId = client.helpers.generateTestCaseId('codeRef');

      expect(testCaseId).toEqual('codeRef');
    });

    it('should return codeRef with parameters if there are all parameters', () => {
      const parameters = [
        {
          key: 'key',
          value: 'value',
        },
        { value: 'valueTwo' },
        { key: 'keyTwo' },
        {
          key: 'keyThree',
          value: 'valueThree',
        },
      ];

      const testCaseId = client.helpers.generateTestCaseId('codeRef', parameters);

      expect(testCaseId).toEqual('codeRef[value,valueTwo,valueThree]');
    });
  });
});
