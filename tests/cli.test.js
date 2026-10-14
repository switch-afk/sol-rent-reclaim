'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { run } = require('../src/cli');
const { version } = require('../package.json');

const ADDR = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';

function sink() {
  return {
    data: '',
    write(chunk) {
      this.data += chunk;
    },
  };
}

test('--help prints usage and exits 0', () => {
  const stdout = sink();
  const code = run(['--help'], { stdout, stderr: sink() });
  assert.equal(code, 0);
  assert.match(stdout.data, /Usage:/);
});

test('--version prints the package version', () => {
  const stdout = sink();
  const code = run(['--version'], { stdout, stderr: sink() });
  assert.equal(code, 0);
  assert.equal(stdout.data.trim(), version);
});

test('usage errors exit 2 and print to stderr', () => {
  const stderr = sink();
  const code = run([], { stdout: sink(), stderr });
  assert.equal(code, 2);
  assert.match(stderr.data, /Missing wallet address/);
});

test('a valid address exits 1 until scanning lands', () => {
  const stderr = sink();
  const code = run([ADDR], { stdout: sink(), stderr });
  assert.equal(code, 1);
  assert.match(stderr.data, /not implemented/);
});