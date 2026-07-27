const assert = require('assert');
const { composeAppleImageData, isWhitePixel } = require('../static/apple_client.js');

function createPixel(r, g, b, a) {
  return [r, g, b, a];
}

function runTests() {
  const base = new Uint8ClampedArray([
    10, 20, 30, 40,
    50, 60, 70, 80,
  ]);
  const overlay = new Uint8ClampedArray([
    255, 255, 255, 255,
    100, 120, 130, 200,
  ]);

  const result = composeAppleImageData(base, overlay, 2, 1);

  assert.strictEqual(result[0], 10, '白いピクセルは元画像を維持');
  assert.strictEqual(result[4], 100, '非白ピクセルはオーバーレイを使う');
  assert.strictEqual(result[5], 120, '非白ピクセルはオーバーレイを使う');
  assert.strictEqual(result[6], 130, '非白ピクセルはオーバーレイを使う');
  assert.strictEqual(result[7], 200, '非白ピクセルはオーバーレイを使う');

  assert.strictEqual(isWhitePixel(255, 255, 255, 255), true, '白いピクセル判定');
  assert.strictEqual(isWhitePixel(100, 120, 130, 200), false, '非白ピクセル判定');

  console.log('apple_client tests passed');
}

runTests();
