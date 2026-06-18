const VERSION = 5;
const SIZE = VERSION * 4 + 17;
const DATA_CODEWORDS = 108;
const ECC_CODEWORDS = 26;
const MASK = 0;
const MAX_BYTES = DATA_CODEWORDS - 2;

const GF_EXP = new Array(512);
const GF_LOG = new Array(256);

let gfValue = 1;
for (let i = 0; i < 255; i += 1) {
  GF_EXP[i] = gfValue;
  GF_LOG[gfValue] = i;
  gfValue <<= 1;
  if (gfValue & 0x100) gfValue ^= 0x11d;
}
for (let i = 255; i < GF_EXP.length; i += 1) {
  GF_EXP[i] = GF_EXP[i - 255];
}

function createQrSvg(text, options = {}) {
  const value = String(text || '');
  const bytes = [...Buffer.from(value, 'utf8')];
  if (!bytes.length) {
    throw new RangeError('QR data is empty');
  }
  if (bytes.length > MAX_BYTES) {
    throw new RangeError(`QR data is too long; max ${MAX_BYTES} bytes`);
  }

  const scale = Math.max(2, Math.min(16, Number(options.scale || 6)));
  const border = Math.max(2, Math.min(8, Number(options.border || 4)));
  const codewords = createCodewords(bytes);
  const { matrix, reserved } = createMatrix();

  drawFunctionPatterns(matrix, reserved);
  drawFormatBits(matrix, reserved, 0);
  drawCodewords(matrix, reserved, codewordsToBits(codewords));
  drawFormatBits(matrix, reserved, formatBits());

  return matrixToSvg(matrix, scale, border);
}

function createCodewords(bytes) {
  const bits = [];
  appendBits(bits, 0b0100, 4);
  appendBits(bits, bytes.length, 8);
  bytes.forEach((byte) => appendBits(bits, byte, 8));

  const capacityBits = DATA_CODEWORDS * 8;
  appendBits(bits, 0, Math.min(4, capacityBits - bits.length));
  while (bits.length % 8) bits.push(0);

  const data = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j += 1) {
      byte = (byte << 1) | bits[i + j];
    }
    data.push(byte);
  }

  const pads = [0xec, 0x11];
  for (let i = 0; data.length < DATA_CODEWORDS; i += 1) {
    data.push(pads[i % pads.length]);
  }

  return [...data, ...reedSolomonRemainder(data, ECC_CODEWORDS)];
}

function appendBits(target, value, length) {
  for (let i = length - 1; i >= 0; i -= 1) {
    target.push((value >>> i) & 1);
  }
}

function codewordsToBits(codewords) {
  const bits = [];
  codewords.forEach((codeword) => appendBits(bits, codeword, 8));
  return bits;
}

function createMatrix() {
  return {
    matrix: Array.from({ length: SIZE }, () => Array(SIZE).fill(false)),
    reserved: Array.from({ length: SIZE }, () => Array(SIZE).fill(false))
  };
}

function drawFunctionPatterns(matrix, reserved) {
  drawFinder(matrix, reserved, 0, 0);
  drawFinder(matrix, reserved, SIZE - 7, 0);
  drawFinder(matrix, reserved, 0, SIZE - 7);

  for (let i = 8; i < SIZE - 8; i += 1) {
    setFunctionModule(matrix, reserved, i, 6, i % 2 === 0);
    setFunctionModule(matrix, reserved, 6, i, i % 2 === 0);
  }

  drawAlignment(matrix, reserved, 30, 30);
  setFunctionModule(matrix, reserved, 8, SIZE - 8, true);
}

function drawFinder(matrix, reserved, x, y) {
  for (let dy = -1; dy <= 7; dy += 1) {
    for (let dx = -1; dx <= 7; dx += 1) {
      const xx = x + dx;
      const yy = y + dy;
      if (xx < 0 || xx >= SIZE || yy < 0 || yy >= SIZE) continue;

      const inPattern = dx >= 0 && dx <= 6 && dy >= 0 && dy <= 6;
      const dark = inPattern && (
        dx === 0 || dx === 6 || dy === 0 || dy === 6 ||
        (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4)
      );
      setFunctionModule(matrix, reserved, xx, yy, dark);
    }
  }
}

function drawAlignment(matrix, reserved, centerX, centerY) {
  for (let dy = -2; dy <= 2; dy += 1) {
    for (let dx = -2; dx <= 2; dx += 1) {
      const distance = Math.max(Math.abs(dx), Math.abs(dy));
      setFunctionModule(matrix, reserved, centerX + dx, centerY + dy, distance !== 1);
    }
  }
}

function drawFormatBits(matrix, reserved, bits) {
  for (let i = 0; i <= 5; i += 1) setFunctionModule(matrix, reserved, 8, i, bitAt(bits, i));
  setFunctionModule(matrix, reserved, 8, 7, bitAt(bits, 6));
  setFunctionModule(matrix, reserved, 8, 8, bitAt(bits, 7));
  setFunctionModule(matrix, reserved, 7, 8, bitAt(bits, 8));
  for (let i = 9; i < 15; i += 1) setFunctionModule(matrix, reserved, 14 - i, 8, bitAt(bits, i));

  for (let i = 0; i < 8; i += 1) setFunctionModule(matrix, reserved, SIZE - 1 - i, 8, bitAt(bits, i));
  for (let i = 8; i < 15; i += 1) setFunctionModule(matrix, reserved, 8, SIZE - 15 + i, bitAt(bits, i));
}

function drawCodewords(matrix, reserved, bits) {
  let bitIndex = 0;
  for (let right = SIZE - 1; right >= 1; right -= 2) {
    if (right === 6) right -= 1;

    for (let vertical = 0; vertical < SIZE; vertical += 1) {
      const y = ((right + 1) & 2) === 0 ? SIZE - 1 - vertical : vertical;
      for (let j = 0; j < 2; j += 1) {
        const x = right - j;
        if (reserved[y][x]) continue;

        let dark = bitIndex < bits.length ? Boolean(bits[bitIndex]) : false;
        bitIndex += 1;
        if (maskCondition(x, y)) dark = !dark;
        matrix[y][x] = dark;
      }
    }
  }
}

function setFunctionModule(matrix, reserved, x, y, dark) {
  matrix[y][x] = Boolean(dark);
  reserved[y][x] = true;
}

function formatBits() {
  const data = (0b01 << 3) | MASK;
  let value = data << 10;
  for (let i = 14; i >= 10; i -= 1) {
    if ((value >>> i) & 1) value ^= 0x537 << (i - 10);
  }
  return (((data << 10) | value) ^ 0x5412) & 0x7fff;
}

function bitAt(value, index) {
  return ((value >>> index) & 1) !== 0;
}

function maskCondition(x, y) {
  return (x + y) % 2 === 0;
}

function reedSolomonRemainder(data, degree) {
  const generator = reedSolomonGenerator(degree);
  const result = Array(degree).fill(0);

  data.forEach((byte) => {
    const factor = byte ^ result.shift();
    result.push(0);
    for (let i = 0; i < degree; i += 1) {
      result[i] ^= gfMultiply(generator[i + 1], factor);
    }
  });

  return result;
}

function reedSolomonGenerator(degree) {
  let result = [1];
  for (let i = 0; i < degree; i += 1) {
    result = polyMultiply(result, [1, GF_EXP[i]]);
  }
  return result;
}

function polyMultiply(left, right) {
  const result = Array(left.length + right.length - 1).fill(0);
  for (let i = 0; i < left.length; i += 1) {
    for (let j = 0; j < right.length; j += 1) {
      result[i + j] ^= gfMultiply(left[i], right[j]);
    }
  }
  return result;
}

function gfMultiply(left, right) {
  if (!left || !right) return 0;
  return GF_EXP[GF_LOG[left] + GF_LOG[right]];
}

function matrixToSvg(matrix, scale, border) {
  const modules = SIZE + border * 2;
  const dimension = modules * scale;
  const rects = [];

  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      if (!matrix[y][x]) continue;
      rects.push(`<rect x="${(x + border) * scale}" y="${(y + border) * scale}" width="${scale}" height="${scale}"/>`);
    }
  }

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dimension} ${dimension}" width="${dimension}" height="${dimension}" shape-rendering="crispEdges">`,
    `<rect width="100%" height="100%" fill="#fff"/>`,
    `<g fill="#111827">${rects.join('')}</g>`,
    `</svg>`
  ].join('');
}

module.exports = {
  createQrSvg
};
