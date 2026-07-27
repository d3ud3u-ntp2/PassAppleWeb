(function () {
  function loadImage(source) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = source;
    });
  }

  async function compositeToCanvas(baseUrl, overlaySource) {
    const baseImage = await loadImage(baseUrl);
    const overlayImage = typeof overlaySource === 'string'
      ? await loadImage(overlaySource)
      : overlaySource;

    const canvas = document.createElement('canvas');
    canvas.width = baseImage.naturalWidth || baseImage.width;
    canvas.height = baseImage.naturalHeight || baseImage.height;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(baseImage, 0, 0, canvas.width, canvas.height);

    const overlayBuffer = document.createElement('canvas');
    overlayBuffer.width = canvas.width;
    overlayBuffer.height = canvas.height;
    const overlayCtx = overlayBuffer.getContext('2d');
    overlayCtx.drawImage(overlayImage, 0, 0, canvas.width, canvas.height);

    const baseData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const overlayData = overlayCtx.getImageData(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < overlayData.data.length; i += 4) {
      const r = overlayData.data[i];
      const g = overlayData.data[i + 1];
      const b = overlayData.data[i + 2];
      const a = overlayData.data[i + 3];

      const isWhite = r > 240 && g > 240 && b > 240 && a > 200;
      if (isWhite) {
        baseData.data[i] = r;
        baseData.data[i + 1] = g;
        baseData.data[i + 2] = b;
        baseData.data[i + 3] = 255;
      }
    }

    ctx.putImageData(baseData, 0, 0);
    return canvas;
  }

  window.compositeImages = compositeToCanvas;
})();
