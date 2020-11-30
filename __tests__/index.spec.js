const OrangebeardClient = require('../index');

describe('Orangebeard JavaScript Client', () => {
  describe('constructor', () => {
    it('executes without error', () => {
      const client = new OrangebeardClient({ token: 'test' });

      expect(client.config.token).toBe('test');
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
});
