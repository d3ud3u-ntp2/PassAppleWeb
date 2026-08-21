(function () {
  function loadImage(source) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = source;
    });
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function sampleBilinear(data, width, height, x, y) {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const x1 = clamp(x0 + 1, 0, width - 1);
    const y1 = clamp(y0 + 1, 0, height - 1);
    const tx = x - x0;
    const ty = y - y0;

    const idx00 = (y0 * width + x0) * 4;
    const idx10 = (y0 * width + x1) * 4;
    const idx01 = (y1 * width + x0) * 4;
    const idx11 = (y1 * width + x1) * 4;

    const result = [0, 0, 0, 0];
    for (let i = 0; i < 4; i += 1) {
      const v00 = data[idx00 + i];
      const v10 = data[idx10 + i];
      const v01 = data[idx01 + i];
      const v11 = data[idx11 + i];
      const top = v00 * (1 - tx) + v10 * tx;
      const bottom = v01 * (1 - tx) + v11 * tx;
      result[i] = top * (1 - ty) + bottom * ty;
    }
    return result;
  }

  function findWhiteBounds(imageData) {
    const { data, width, height } = imageData;
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3];
        const isWhite = r > 240 && g > 240 && b > 240 && a > 200;

        if (isWhite) {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }

    if (maxX < minX || maxY < minY) {
      return null;
    }

    return {
      minX: clamp(Math.floor(minX), 0, width - 1),
      minY: clamp(Math.floor(minY), 0, height - 1),
      maxX: clamp(Math.ceil(maxX), 0, width - 1),
      maxY: clamp(Math.ceil(maxY), 0, height - 1)
    };
  }

  function bulgeImageData(imageData, bounds, strength = 0.7) {
    if (!bounds) {
      return new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height);
    }

    const { width, height } = imageData;
    const output = new Uint8ClampedArray(imageData.data);
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;
    const radiusX = (bounds.maxX - bounds.minX) / 2 || 1;
    const radiusY = (bounds.maxY - bounds.minY) / 2 || 1;

    for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
      for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
        const dx = (x - centerX) / radiusX;
        const dy = (y - centerY) / radiusY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        let factor = 1;
        if (dist > 0 && dist <= 1) {
          const fullFactor = Math.asin(dist) / (dist * (Math.PI / 2));
          factor = 1 + (fullFactor - 1) * strength;
        }

        const newDx = dx * factor;
        const newDy = dy * factor;
        const srcX = clamp(centerX + newDx * radiusX, 0, width - 1);
        const srcY = clamp(centerY + newDy * radiusY, 0, height - 1);

        const src = sampleBilinear(imageData.data, width, height, srcX, srcY);
        const idx = (y * width + x) * 4;
        output[idx] = src[0];
        output[idx + 1] = src[1];
        output[idx + 2] = src[2];
        output[idx + 3] = src[3];
      }
    }

    return new ImageData(output, width, height);
  }

  async function compositeToCanvas(baseSource, overlaySource, strength = 0.7) {
    const bulgeStrength = Number.isFinite(strength) ? Math.min(Math.max(strength, 0.1), 1.5) : 0.7;
    const baseImage = typeof baseSource === 'string' ? await loadImage(baseSource) : baseSource;
    const overlayImage = typeof overlaySource === 'string' ? await loadImage(overlaySource) : overlaySource;

    const width = baseImage.naturalWidth || baseImage.width;
    const height = baseImage.naturalHeight || baseImage.height;

    const baseCanvas = document.createElement('canvas');
    baseCanvas.width = width;
    baseCanvas.height = height;
    const baseCtx = baseCanvas.getContext('2d');
    baseCtx.drawImage(baseImage, 0, 0, width, height);
    const baseData = baseCtx.getImageData(0, 0, width, height);

    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = width;
    maskCanvas.height = height;
    const maskCtx = maskCanvas.getContext('2d');
    maskCtx.drawImage(overlayImage, 0, 0, width, height);
    const overlayData = maskCtx.getImageData(0, 0, width, height);

    const bounds = findWhiteBounds(overlayData);
    const bulgedBase = bulgeImageData(baseData, bounds, bulgeStrength);
    const bulgedMask = bulgeImageData(overlayData, bounds, bulgeStrength);

    const result = new Uint8ClampedArray(bulgedBase.data);
    for (let i = 0; i < result.length; i += 4) {
      const alpha = bulgedMask.data[i + 3];
      if (alpha > 20) {
        result[i] = 255;
        result[i + 1] = 255;
        result[i + 2] = 255;
        result[i + 3] = 255;
      }
    }

    const resultCanvas = document.createElement('canvas');
    resultCanvas.width = width;
    resultCanvas.height = height;
    const resultCtx = resultCanvas.getContext('2d');
    resultCtx.putImageData(new ImageData(result, width, height), 0, 0);
    return resultCanvas;
  }

  window.compositeImages = compositeToCanvas;
})();
