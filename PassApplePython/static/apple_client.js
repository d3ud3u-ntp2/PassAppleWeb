(function (global) {
  function isWhitePixel(r, g, b, a) {
    return a > 200 && r > 240 && g > 240 && b > 240;
  }

  function composeAppleImageData(baseData, overlayData, width, height) {
    if (!baseData || !overlayData) {
      throw new Error('baseData and overlayData are required');
    }

    const output = new Uint8ClampedArray(baseData.length);
    const pixelCount = width * height;

    for (let i = 0; i < pixelCount; i += 1) {
      const offset = i * 4;
      const r = overlayData[offset];
      const g = overlayData[offset + 1];
      const b = overlayData[offset + 2];
      const a = overlayData[offset + 3];

      if (isWhitePixel(r, g, b, a)) {
        output[offset] = baseData[offset];
        output[offset + 1] = baseData[offset + 1];
        output[offset + 2] = baseData[offset + 2];
        output[offset + 3] = baseData[offset + 3];
        continue;
      }

      if (a > 0) {
        output[offset] = r;
        output[offset + 1] = g;
        output[offset + 2] = b;
        output[offset + 3] = a;
      } else {
        output[offset] = baseData[offset];
        output[offset + 1] = baseData[offset + 1];
        output[offset + 2] = baseData[offset + 2];
        output[offset + 3] = baseData[offset + 3];
      }
    }

    return output;
  }

  const api = {
    composeAppleImageData,
    isWhitePixel,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  global.AppleClient = api;
})(typeof window !== 'undefined' ? window : globalThis);
