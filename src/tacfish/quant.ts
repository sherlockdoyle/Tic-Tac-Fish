const CHAR_MIN = 0x20, // space
  CHAR_MAX = 0xd800, // surrogate
  RANGE = CHAR_MAX - CHAR_MIN;

const VIEW = new DataView(new ArrayBuffer(8)), // for 2 32-bit floats
  HEADER_LEN = Math.ceil((VIEW.byteLength * 8) / Math.log2(RANGE)), // number of characters needed in base RANGE
  RANGE_N = BigInt(RANGE);
function packFloatPair(f1: number, f2: number): string {
  VIEW.setFloat32(0, f1);
  VIEW.setFloat32(4, f2);
  let u64 = VIEW.getBigUint64(0);

  let str = '';
  for (let i = 0; i < HEADER_LEN; ++i) {
    str += String.fromCharCode(Number(u64 % RANGE_N) + CHAR_MIN);
    u64 /= RANGE_N;
  }
  return str;
}
function unpackFloatPair(str: string): [f1: number, f2: number] {
  let u64 = 0n,
    m = 1n;
  for (let i = 0; i < HEADER_LEN; ++i) {
    u64 += BigInt(str.charCodeAt(i) - CHAR_MIN) * m;
    m *= RANGE_N;
  }

  VIEW.setBigUint64(0, u64);
  return [VIEW.getFloat32(0), VIEW.getFloat32(4)];
}

export function compress(weights: Float32Array): string {
  const l = weights.length;

  let min = Infinity,
    max = -Infinity;
  for (const w of weights) {
    if (w < min) min = w;
    if (w > max) max = w;
  }
  const step = (max - min) / RANGE;

  const chars = new Array(l);
  for (let i = 0; i < l; ++i) chars[i] = String.fromCharCode(Math.floor((weights[i] - min) / step) + CHAR_MIN);

  return packFloatPair(min, step) + chars.join('');
}

export function decompress(str: string): Float32Array {
  const [min, step] = unpackFloatPair(str.slice(0, HEADER_LEN)),
    data = str.slice(HEADER_LEN);
  const l = data.length;

  const weights = new Float32Array(l);
  for (let i = 0; i < l; ++i) weights[i] = (data.charCodeAt(i) - CHAR_MIN) * step + min;
  return weights;
}
