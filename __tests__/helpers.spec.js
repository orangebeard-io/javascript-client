const OrangebeardClient = require('../index');

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
