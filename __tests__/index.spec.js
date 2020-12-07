const OrangebeardClient = require('../index');
const RestClient = require('../utils/rest');
const helpers = require('../utils/helpers');

describe('Orangebeard JavaScript Client', () => {
  describe('constructor', () => {
    it('executes without error', () => {
      const client = new OrangebeardClient({ token: 'test' });

      expect(client.config.token).toBe('test');
    });
  });

  describe('logDebug', () => {
    it('should not call console.log if debug is false', () => {
      const client = new OrangebeardClient({ debug: false });
      jest.spyOn(console, 'log');

      client.logDebug('message');

      expect(console.log).not.toHaveBeenCalled();
    });

    it('should call console.log with message if debug is true', () => {
      const client = new OrangebeardClient({ debug: true });
      jest.spyOn(console, 'log');

      client.logDebug('message');

      expect(console.log).toHaveBeenCalledWith('message');
    });
  });

  describe('calculateNonRetriedItemMapKey', () => {
    it("should return correct parameter's string", () => {
      const client = new OrangebeardClient({});

      const str = client.calculateNonRetriedItemMapKey('lId', 'pId', 'name', 'itemId');

      expect(str).toEqual('lId__pId__name__itemId');
    });

    it("should return correct parameter's string with default value if itemId doesn't pass", () => {
      const client = new OrangebeardClient({});

      const str = client.calculateNonRetriedItemMapKey('lId', 'pId', 'name');

      expect(str).toEqual('lId__pId__name__');
    });
  });

  describe('getRejectAnswer', () => {
    it('should return object with tempId and promise.reject with error', () => {
      const client = new OrangebeardClient({});

      const rejectAnswer = client.getRejectAnswer('tempId', 'error');

      expect(rejectAnswer.tempId).toEqual('tempId');
      return expect(rejectAnswer.promise).rejects.toMatch('error');
    });
  });

  describe('cleanMap', () => {
    it('should delete element with id', () => {
      const client = new OrangebeardClient({});
      client.map = {
        id1: 'firstElement',
        id2: 'secondElement',
        id3: 'thirdElement',
      };

      client.cleanMap(['id1', 'id2']);

      expect(client.map).toEqual({ id3: 'thirdElement' });
    });
  });

  describe('checkConnect', () => {
    it('should return promise', () => {
      const client = new OrangebeardClient({ endpoint: 'endpoint' });
      jest.spyOn(RestClient, 'request').mockImplementation(() => Promise.resolve('ok'));

      const request = client.checkConnect();

      return expect(request).resolves.toBe('ok');
    });
  });

  describe('startLaunch', () => {
    it('should call restClient with suitable parameters', () => {
      const fakeSystemAttr = [
        {
          key: 'client',
          value: 'client-name|1.0',
          system: true,
        },
        {
          key: 'os',
          value: 'osType|osArchitecture',
          system: true,
        },
      ];
      const client = new OrangebeardClient({
        token: 'startLaunchTest',
        endpoint: 'https://orangebeard.io/api/v1',
        project: 'tst',
      });
      const myPromise = Promise.resolve({ id: 'testidlaunch' });
      const time = 12345734;
      jest.spyOn(client.restClient, 'create').mockImplementation(() => myPromise);
      jest.spyOn(helpers, 'getSystemAttribute').mockImplementation(() => fakeSystemAttr);

      client.startLaunch({
        startTime: time,
      });

      expect(client.restClient.create).toHaveBeenCalledWith(
        'launch',
        {
          name: 'Test launch name',
          startTime: time,
          attributes: fakeSystemAttr,
        },
        { headers: client.headers },
      );
    });

    it('should call restClient with suitable parameters, attributes is concatenated', () => {
      const fakeSystemAttr = [
        {
          key: 'client',
          value: 'client-name|1.0',
          system: true,
        },
      ];
      const client = new OrangebeardClient({
        token: 'startLaunchTest',
        endpoint: 'https://orangebeard.io/api/v1',
        project: 'tst',
      });
      client.isLaunchMergeRequired = true;
      const myPromise = Promise.resolve({ id: 'testidlaunch' });
      const time = 12345734;
      jest.spyOn(client.restClient, 'create').mockImplementation(() => myPromise);
      jest.spyOn(helpers, 'getSystemAttribute').mockImplementation(() => fakeSystemAttr);

      client.startLaunch({
        startTime: time,
        attributes: [{ value: 'value' }],
      });

      expect(client.restClient.create).toHaveBeenCalledWith(
        'launch',
        {
          name: 'Test launch name',
          startTime: time,
          attributes: [
            { value: 'value' },
            {
              key: 'client',
              value: 'client-name|1.0',
              system: true,
            },
          ],
        },
        { headers: client.headers },
      );
    });

    it('dont start new launch if launchDataRQ.id is not empty', () => {
      const client = new OrangebeardClient({
        token: 'startLaunchTest',
        endpoint: 'https://orangebeard.io/api/v1',
        project: 'tst',
      });
      const myPromise = Promise.resolve({ id: 'testidlaunch' });
      const startTime = 12345734;
      const id = 12345734;
      jest.spyOn(client.restClient, 'create').mockImplementation(() => myPromise);

      client.startLaunch({
        startTime,
        id,
      });

      expect(client.restClient.create).not.toHaveBeenCalled();
      expect(client.launchUuid).toEqual(id);
    });
  });

  describe('finishLaunch', () => {
    it('should call getRejectAnswer if there is no launchTempId with suitable launchTempId', () => {
      const client = new OrangebeardClient({
        token: 'any',
        endpoint: 'https://orangebeard.api',
        project: 'prj',
      });
      client.map = {
        id1: {
          children: ['child1'],
        },
      };
      jest.spyOn(client, 'getRejectAnswer');

      client.finishLaunch('id2', { some: 'data' });

      expect(client.getRejectAnswer).toHaveBeenCalledWith(
        'id2',
        new Error('Launch "id2" not found'),
      );
    });
  });

  describe('getMergeLaunchesRequest', () => {
    it('should return object which contains a data for merge launches with default launch name', () => {
      const expectedMergeLaunches = {
        description: 'Merged launch',
        endTime: 12345734,
        extendSuitesDescription: true,
        launches: ['12345', '12346'],
        mergeType: 'BASIC',
        mode: 'DEFAULT',
        name: 'Test launch name',
        attributes: [{ value: 'value' }],
      };
      const client = new OrangebeardClient({ attributes: [{ value: 'value' }] });
      jest.spyOn(client.helpers, 'now').mockImplementation(() => 12345734);

      const mergeLaunches = client.getMergeLaunchesRequest(['12345', '12346']);

      expect(mergeLaunches).toEqual(expectedMergeLaunches);
    });

    it('should return object which contains a data for merge launches', () => {
      const expectedMergeLaunches = {
        description: 'Merged launch',
        endTime: 12345734,
        extendSuitesDescription: true,
        launches: ['12345', '12346'],
        mergeType: 'BASIC',
        mode: 'DEFAULT',
        name: 'launch',
        attributes: [{ value: 'value' }],
      };
      const client = new OrangebeardClient({ launch: 'launch', attributes: [{ value: 'value' }] });
      jest.spyOn(client.helpers, 'now').mockImplementation(() => 12345734);

      const mergeLaunches = client.getMergeLaunchesRequest(['12345', '12346']);

      expect(mergeLaunches).toEqual(expectedMergeLaunches);
    });
  });

  describe('mergeLaunches', () => {
    const fakeLaunchIds = ['12345-gfdgfdg-gfdgdf-fdfd45', '12345-gfdgfdg-gfdgdf-fdfd45', ''];
    const fakeEndTime = 12345734;
    const fakeMergeDataRQ = {
      description: 'Merged launch',
      endTime: fakeEndTime,
      extendSuitesDescription: true,
      launches: fakeLaunchIds,
      mergeType: 'BASIC',
      mode: 'DEFAULT',
      name: 'Test launch name',
    };

    it('should calls client', (done) => {
      const client = new OrangebeardClient({
        token: 'startLaunchTest',
        endpoint: 'https://orangebeard.io/api/v1',
        project: 'tst',
        isLaunchMergeRequired: true,
      });

      const myPromise = Promise.resolve({ id: 'testidlaunch' });
      jest.spyOn(client.restClient, 'create').mockImplementation(() => myPromise);
      jest.spyOn(helpers, 'readLaunchesFromFile').mockImplementation(() => fakeLaunchIds);
      jest.spyOn(client, 'getMergeLaunchesRequest').mockImplementation(() => fakeMergeDataRQ);
      jest.spyOn(client.restClient, 'retrieveSyncAPI').mockImplementation(() =>
        Promise.resolve({
          content: [{ id: 'id1' }],
        }),
      );

      const promise = client.mergeLaunches();

      expect(promise.then).toBeDefined();
      promise.then(() => {
        expect(client.restClient.create).toHaveBeenCalledWith('launch/merge', fakeMergeDataRQ, {
          headers: client.headers,
        });

        done();
      });
    });

    it('should not call client if something went wrong', (done) => {
      const client = new OrangebeardClient({
        isLaunchMergeRequired: true,
      });

      jest.spyOn(client.helpers, 'readLaunchesFromFile').mockImplementation(() => 'launchUUid');
      jest.spyOn(client.restClient, 'retrieveSyncAPI').mockImplementation(() => Promise.resolve());
      jest.spyOn(client.restClient, 'create').mockImplementation(() => Promise.reject());

      const promise = client.mergeLaunches();

      promise.then(() => {
        expect(client.restClient.create).not.toHaveBeenCalled();

        done();
      });
    });

    it('should return undefined if isLaunchMergeRequired is false', () => {
      const client = new OrangebeardClient({
        token: 'startLaunchTest',
        endpoint: 'https://orangebeard.io/api/v1',
        project: 'tst',
        isLaunchMergeRequired: false,
      });

      const result = client.mergeLaunches();

      expect(result).toEqual(undefined);
    });
  });

  describe('updateLaunch', () => {
    it('should call getRejectAnswer if there is no launchTempId with suitable launchTempId', () => {
      const client = new OrangebeardClient({
        token: 'any',
        endpoint: 'https://orangebeard.api',
        project: 'prj',
      });
      client.map = {
        id1: {
          children: ['child1'],
        },
      };
      jest.spyOn(client, 'getRejectAnswer');

      client.updateLaunch('id2', { some: 'data' });

      expect(client.getRejectAnswer).toHaveBeenCalledWith(
        'id2',
        new Error('Launch "id2" not found'),
      );
    });

    it('should return object with tempId and promise', () => {
      const client = new OrangebeardClient({
        token: 'any',
        endpoint: 'https://orangebeard.api',
        project: 'prj',
      });
      client.map = {
        id1: {
          children: ['child1'],
          promiseFinish: Promise.resolve(),
        },
      };
      jest.spyOn(client.restClient, 'update').mockImplementation(() => Promise.resolve(true));

      const result = client.updateLaunch('id1', { some: 'data' });

      expect(result.tempId).toEqual('id1');
      return expect(result.promise).resolves.toBe(true);
    });
  });

  describe('startTestItem', () => {
    it('should call getRejectAnswer if there is no launchTempId with suitable launchTempId', () => {
      const client = new OrangebeardClient({
        token: 'any',
        endpoint: 'https://orangebeard.api',
        project: 'prj',
      });
      client.map = {
        id1: {
          children: ['child1'],
        },
      };
      jest.spyOn(client, 'getRejectAnswer');

      client.startTestItem({}, 'id2');

      expect(client.getRejectAnswer).toHaveBeenCalledWith(
        'id2',
        new Error('Launch "id2" not found'),
      );
    });

    it('should call getRejectAnswer if launchObj.finishSend is true', () => {
      const client = new OrangebeardClient({
        token: 'any',
        endpoint: 'https://orangebeard.api',
        project: 'prj',
      });
      client.map = {
        id1: {
          children: ['child1'],
          finishSend: true,
        },
      };
      jest.spyOn(client, 'getRejectAnswer');
      const error = new Error('Launch "id1" is already finished, you can not add an item to it');

      client.startTestItem({}, 'id1');

      expect(client.getRejectAnswer).toHaveBeenCalledWith('id1', error);
    });

    it('should call getRejectAnswer if there is no parentObj with suitable parentTempId', () => {
      const client = new OrangebeardClient({
        token: 'any',
        endpoint: 'https://orangebeard.api',
        project: 'prj',
      });
      client.map = {
        id: {
          children: ['id1'],
        },
        id1: {
          children: ['child1'],
        },
      };
      jest.spyOn(client, 'getRejectAnswer');
      const error = new Error('Item "id3" not found');

      client.startTestItem({ testCaseId: 'testCaseId' }, 'id1', 'id3');

      expect(client.getRejectAnswer).toHaveBeenCalledWith('id1', error);
    });

    it('should return object with tempId and promise', () => {
      const client = new OrangebeardClient({
        token: 'any',
        endpoint: 'https://orangebeard.api',
        project: 'prj',
      });
      client.map = {
        id: {
          children: ['id1', '4n5pxq24kpiob12og9'],
          promiseStart: Promise.resolve(),
        },
        id1: {
          children: ['child1'],
          promiseStart: Promise.resolve(),
        },
        '4n5pxq24kpiob12og9': {
          promiseStart: Promise.resolve(),
        },
      };
      jest.spyOn(client.nonRetriedItemMap, 'get').mockImplementation(() => Promise.resolve());
      jest.spyOn(client.restClient, 'create').mockImplementation(() => Promise.resolve({}));
      jest.spyOn(client, 'getUniqId').mockImplementation(() => '4n5pxq24kpiob12og9');

      const result = client.startTestItem({ retry: true }, 'id1', 'id');

      expect(result.tempId).toEqual('4n5pxq24kpiob12og9');
      return expect(result.promise).resolves.toStrictEqual({});
    });
  });

  describe('finishTestItem', () => {
    it('should call getRejectAnswer if there is no itemObj with suitable itemTempId', () => {
      const client = new OrangebeardClient({
        token: 'any',
        endpoint: 'https://orangebeard.api',
        project: 'prj',
      });
      client.map = {
        id1: {
          children: ['child1'],
        },
      };
      jest.spyOn(client, 'getRejectAnswer');

      client.finishTestItem('id2', {});

      expect(client.getRejectAnswer).toHaveBeenCalledWith('id2', new Error('Item "id2" not found'));
    });

    // it('should call finishTestItemPromiseStart with correct parameters', (done) => {
    //   const client = new OrangebeardClient({
    //     token: 'any',
    //     endpoint: 'https://orangebeard.api',
    //     project: 'prj',
    //   });
    //   client.map = {
    //     id: {
    //       children: ['id1'],
    //       promiseFinish: Promise.resolve(),
    //     },
    //     id1: {
    //       children: ['child1'],
    //       promiseFinish: Promise.resolve(),
    //     },
    //   };
    //   client.launchUuid = 'launchUuid';
    //   jest.spyOn(client, 'cleanMap');
    //   jest.spyOn(client, 'finishTestItemPromiseStart');
    //   jest.spyOn(client.helpers, 'now').mockImplementation(() => 1234567);

    //   client.finishTestItem('id', {});

    //   setTimeout(() => {
    //     expect(client.cleanMap).toHaveBeenCalledWith(['id1']);
    //     expect(client.finishTestItemPromiseStart).toHaveBeenCalledWith(
    //       Object.assign(client.map.id, { finishSend: true }),
    //       'id',
    //       { endTime: 1234567, launchUuid: 'launchUuid' },
    //     );
    //     done();
    //   }, 100);
    // });

    // it('should call finishTestItemPromiseStart with correct parameters if smt went wrong', (done) => {
    //   const client = new OrangebeardClient({
    //     token: 'any',
    //     endpoint: 'https://orangebeard.api',
    //     project: 'prj',
    //   });
    //   client.map = {
    //     id: {
    //       children: ['id1'],
    //       promiseFinish: Promise.resolve(),
    //     },
    //     id1: {
    //       children: ['child1'],
    //       promiseFinish: Promise.reject(),
    //     },
    //   };
    //   client.launchUuid = 'launchUuid';
    //   jest.spyOn(client, 'cleanMap');
    //   jest.spyOn(client, 'finishTestItemPromiseStart');
    //   jest.spyOn(client.helpers, 'now').mockImplementation(() => 1234567);

    //   client.finishTestItem('id', {});

    //   setTimeout(() => {
    //     expect(client.cleanMap).toHaveBeenCalledWith(['id1']);
    //     expect(client.finishTestItemPromiseStart).toHaveBeenCalledWith(
    //       Object.assign(client.map.id, { finishSend: true }),
    //       'id',
    //       { endTime: 1234567, launchUuid: 'launchUuid' },
    //     );
    //     done();
    //   }, 100);
    // });
  });

  describe('saveLog', () => {
    it('should return object with tempId and promise', () => {
      const client = new OrangebeardClient({
        token: 'any',
        endpoint: 'https://orangebeard.api',
        project: 'prj',
      });
      client.map = {
        id1: {
          children: ['child1'],
        },
      };
      jest.spyOn(client, 'getUniqId').mockImplementation(() => '4n5pxq24kpiob12og9');
      jest.spyOn(client.restClient, 'create').mockImplementation(() => Promise.resolve(true));

      const result = client.saveLog(
        {
          promiseStart: Promise.resolve(),
          realId: 'realId',
          children: [],
        },
        client.restClient.create,
      );

      expect(result.tempId).toEqual('4n5pxq24kpiob12og9');
      return expect(result.promise).resolves.toBe(true);
    });
  });

  describe('sendLog', () => {
    it('should return sendLogWithFile if fileObj is not empty', () => {
      const client = new OrangebeardClient({
        token: 'any',
        endpoint: 'https://orangebeard.api',
        project: 'prj',
      });
      jest.spyOn(client, 'sendLogWithFile').mockImplementation(() => 'sendLogWithFile');

      const result = client.sendLog('itemTempId', { message: 'message' }, { name: 'name' });

      expect(result).toEqual('sendLogWithFile');
    });

    it('should return sendLogWithoutFile if fileObj is empty', () => {
      const client = new OrangebeardClient({
        token: 'any',
        endpoint: 'https://orangebeard.api',
        project: 'prj',
      });
      jest.spyOn(client, 'sendLogWithoutFile').mockImplementation(() => 'sendLogWithoutFile');

      const result = client.sendLog('itemTempId', { message: 'message' });

      expect(result).toEqual('sendLogWithoutFile');
    });
  });

  describe('sendLogWithoutFile', () => {
    it('should call getRejectAnswer if there is no itemObj with suitable itemTempId', () => {
      const client = new OrangebeardClient({
        token: 'any',
        endpoint: 'https://orangebeard.api',
        project: 'prj',
      });
      client.map = {
        id1: {
          children: ['child1'],
        },
      };
      jest.spyOn(client, 'getRejectAnswer');

      client.sendLogWithoutFile('itemTempId', {});

      expect(client.getRejectAnswer).toHaveBeenCalledWith(
        'itemTempId',
        new Error('Item "itemTempId" not found'),
      );
    });

    it('should return saveLog function', () => {
      const client = new OrangebeardClient({
        token: 'any',
        endpoint: 'https://orangebeard.api',
        project: 'prj',
      });
      client.map = {
        itemTempId: {
          children: ['child1'],
        },
      };
      jest.spyOn(client, 'saveLog').mockImplementation(() => 'saveLog');

      const result = client.sendLogWithoutFile('itemTempId', {});

      expect(result).toEqual('saveLog');
    });
  });

  describe('sendLogWithFile', () => {
    it('should call getRejectAnswer if there is no itemObj with suitable itemTempId', () => {
      const client = new OrangebeardClient({
        token: 'any',
        endpoint: 'https://orangebeard.api',
        project: 'prj',
      });
      client.map = {
        id1: {
          children: ['child1'],
        },
      };
      jest.spyOn(client, 'getRejectAnswer');

      client.sendLogWithFile('itemTempId', {});

      expect(client.getRejectAnswer).toHaveBeenCalledWith(
        'itemTempId',
        new Error('Item "itemTempId" not found'),
      );
    });

    it('should return saveLog function', () => {
      const client = new OrangebeardClient({
        token: 'any',
        endpoint: 'https://orangebeard.api',
        project: 'prj',
      });
      client.map = {
        itemTempId: {
          children: ['child1'],
        },
      };
      jest.spyOn(client, 'saveLog').mockImplementation(() => 'saveLog');

      const result = client.sendLogWithFile('itemTempId', {});

      expect(result).toEqual('saveLog');
    });
  });

  describe('getRequestLogWithFile', () => {
    it('should return restClient.create', () => {
      const client = new OrangebeardClient({
        token: 'any',
        endpoint: 'https://orangebeard.api',
        project: 'prj',
      });
      client.map = {
        id1: {
          children: ['child1'],
        },
      };
      jest.spyOn(client, 'buildMultiPartStream').mockImplementation(() => true);
      jest.spyOn(client.restClient, 'create').mockImplementation(() => Promise.resolve(true));

      const result = client.getRequestLogWithFile({}, { name: 'name' });

      return expect(result).resolves.toBe(true);
    });

    it('should return restClient.create with error', () => {
      const client = new OrangebeardClient({
        token: 'any',
        endpoint: 'https://orangebeard.api',
        project: 'prj',
      });
      client.map = {
        id1: {
          children: ['child1'],
        },
      };
      jest.spyOn(client, 'buildMultiPartStream').mockImplementation(() => true);
      jest.spyOn(client.restClient, 'create').mockImplementation(() => Promise.reject());

      const result = client.getRequestLogWithFile({}, { name: 'name' });

      expect(result.catch).toBeDefined();
    });
  });
});
