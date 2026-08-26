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

  function findMaskBounds(imageData) {
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
        const luminance = (r + g + b) / 3;
        const isWhite = luminance >= 10 && a > 0;

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

  async function loadBoundingBox(source) {
    if (!source) {
      return null;
    }

    try {
      const response = await fetch(source);
      if (!response.ok) {
        return null;
      }

      const text = await response.text();
      for (const line of text.split(/\r?\n/)) {
        const values = line.replace(/#.*/, '').trim().split(/[\s,]+/).filter(Boolean).map(Number);
        if (values.length === 4 && values.every(Number.isFinite)) {
          return { minX: values[0], minY: values[1], maxX: values[2], maxY: values[3] };
        }
      }
    } catch (error) {
      return null;
    }
    return null;
  }

  async function compositeToCanvas(baseSource, targetSource, maskSource, bboxSource, strength = 0.7) {
    const bulgeStrength = Number.isFinite(strength) ? Math.min(Math.max(strength, 0.1), 1.5) : 0.7;
    const baseImage = typeof baseSource === 'string' ? await loadImage(baseSource) : baseSource;
    const targetImage = typeof targetSource === 'string' ? await loadImage(targetSource) : targetSource;
    const maskImage = typeof maskSource === 'string' ? await loadImage(maskSource) : maskSource;
    const configuredBounds = await loadBoundingBox(bboxSource);

    const width = baseImage.naturalWidth || baseImage.width;
    const height = baseImage.naturalHeight || baseImage.height;

    const baseCanvas = document.createElement('canvas');
    baseCanvas.width = width;
    baseCanvas.height = height;
    const baseCtx = baseCanvas.getContext('2d');
    baseCtx.drawImage(baseImage, 0, 0, width, height);
    const baseData = baseCtx.getImageData(0, 0, width, height);

    const targetWidth = targetImage.naturalWidth || targetImage.width;
    const targetHeight = targetImage.naturalHeight || targetImage.height;
    const targetCanvas = document.createElement('canvas');
    targetCanvas.width = targetWidth;
    targetCanvas.height = targetHeight;
    const targetCtx = targetCanvas.getContext('2d');
    targetCtx.drawImage(targetImage, 0, 0, targetWidth, targetHeight);
    const targetData = targetCtx.getImageData(0, 0, targetWidth, targetHeight);

    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = targetWidth;
    maskCanvas.height = targetHeight;
    const maskCtx = maskCanvas.getContext('2d');
    maskCtx.drawImage(maskImage, 0, 0, targetWidth, targetHeight);
    const maskData = maskCtx.getImageData(0, 0, targetWidth, targetHeight);

    const bounds = configuredBounds || findMaskBounds(maskData);
    const bulgedTarget = bulgeImageData(targetData, bounds, bulgeStrength);
    const bulgedMask = bulgeImageData(maskData, bounds, bulgeStrength);

    const result = new Uint8ClampedArray(baseData.data);
    for (let y = 0; y < targetHeight; y += 1) {
      for (let x = 0; x < targetWidth; x += 1) {
        const targetIndex = (y * targetWidth + x) * 4;
        const resultIndex = (y * width + x) * 4;
        const alpha = Math.round((bulgedMask.data[targetIndex] + bulgedMask.data[targetIndex + 1] + bulgedMask.data[targetIndex + 2]) / 3);
        if (alpha === 0 || resultIndex >= result.length) {
          continue;
        }

        const sourceAlpha = alpha / 255;
        result[resultIndex] = Math.round(bulgedTarget.data[targetIndex] * sourceAlpha + result[resultIndex] * (1 - sourceAlpha));
        result[resultIndex + 1] = Math.round(bulgedTarget.data[targetIndex + 1] * sourceAlpha + result[resultIndex + 1] * (1 - sourceAlpha));
        result[resultIndex + 2] = Math.round(bulgedTarget.data[targetIndex + 2] * sourceAlpha + result[resultIndex + 2] * (1 - sourceAlpha));
        result[resultIndex + 3] = 255;
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
