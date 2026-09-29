/* eslint-env mocha */

const assert = require('node:assert/strict');

const { buildBaseArgs, getErrorMessage } = require('../../src');

describe('common', () => {
  it('builds the shared CLI options', () => {
    assert.deepEqual(
      buildBaseArgs('plan', 'config', './configuration', './licence', 'subscription'),
      [
        'plan',
        'config',
        '--config-dir',
        './configuration',
        '--licence-file',
        './licence',
        '--subscription-id',
        'subscription',
      ],
    );
  });

  it('uses a fallback for non-Error values', () => {
    assert.equal(getErrorMessage(new Error('failed')), 'failed');
    assert.equal(getErrorMessage('failed'), 'Unknown error');
  });
});
