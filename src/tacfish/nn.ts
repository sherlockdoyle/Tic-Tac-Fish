export class NeuralNetwork {
  private readonly inputSize: number;
  private readonly hiddenSize: number;
  private readonly hiddenBuf: Float32Array;

  private readonly w1: Float32Array;
  private readonly b1: Float32Array;
  private readonly w2: Float32Array;
  private b2: number;

  private readonly g_w1: Float32Array;
  private readonly g_b1: Float32Array;
  private readonly g_w2: Float32Array;
  private g_b2: number;

  private readonly v_w1: Float32Array;
  private readonly v_b1: Float32Array;
  private readonly v_w2: Float32Array;
  private v_b2: number;

  constructor(
    N: number,
    K: number,
    public lr = 0.005,
    private readonly mu = 0.9,
    private readonly leakyAlpha = 0.01,
  ) {
    this.inputSize = N * N;
    this.hiddenSize = Math.max(32, 1 << (31 - Math.clz32(this.inputSize * K)));
    this.hiddenBuf = new Float32Array(this.hiddenSize);

    const scale = Math.sqrt(8 / this.inputSize);
    this.w1 = new Float32Array(this.hiddenSize * this.inputSize).map(() => (Math.random() - 0.5) * scale);
    this.b1 = new Float32Array(this.hiddenSize).fill(0);
    this.w2 = new Float32Array(this.hiddenSize).map(() => (Math.random() - 0.5) * scale);
    this.b2 = 0;

    this.g_w1 = new Float32Array(this.inputSize * this.hiddenSize);
    this.g_b1 = new Float32Array(this.hiddenSize);
    this.g_w2 = new Float32Array(this.hiddenSize);
    this.g_b2 = 0;

    this.v_w1 = new Float32Array(this.inputSize * this.hiddenSize).fill(0);
    this.v_b1 = new Float32Array(this.hiddenSize).fill(0);
    this.v_w2 = new Float32Array(this.hiddenSize).fill(0);
    this.v_b2 = 0;
  }

  setWeights(w: Float32Array) {
    this.w1.set(w.subarray(0, this.w1.length));
    this.b1.set(w.subarray(this.w1.length, this.w1.length + this.b1.length));
    this.w2.set(w.subarray(this.w1.length + this.b1.length, this.w1.length + this.b1.length + this.w2.length));
    this.b2 = w[this.w1.length + this.b1.length + this.w2.length];
  }
  getWeights(): Float32Array {
    const w = new Float32Array(this.w1.length + this.b1.length + this.w2.length + 1);
    w.set(this.w1, 0);
    w.set(this.b1, this.w1.length);
    w.set(this.w2, this.w1.length + this.b1.length);
    w[this.w1.length + this.b1.length + this.w2.length] = this.b2;
    return w;
  }

  updateLR(m: number) {
    this.lr = Math.max(0.001, Math.min(this.lr * m, 0.01));
  }

  forward(board: Int8Array): number {
    const hidden = this.hiddenBuf,
      w1 = this.w1,
      inputSize = this.inputSize;

    for (let j = 0; j < this.hiddenSize; ++j) {
      let sum = this.b1[j];
      const row = j * inputSize;
      for (let i = 0; i < inputSize; ++i) sum += board[i] * w1[row + i];
      hidden[j] = sum > 0 ? sum : sum * this.leakyAlpha; // leaky ReLU
    }

    let sum = this.b2;
    for (let j = 0; j < this.hiddenSize; ++j) sum += hidden[j] * this.w2[j];

    return Math.tanh(sum);
  }

  trainBatch(boards: Int8Array[], targets: number[]): void {
    const batchSize = boards.length;
    this.g_w1.fill(0);
    this.g_b1.fill(0);
    this.g_w2.fill(0);
    this.g_b2 = 0;

    for (let b = 0; b < batchSize; ++b) {
      const board = boards[b],
        target = targets[b],
        pred = this.forward(board);

      const outGrad = (pred - target) * (1 - pred * pred);
      this.g_b2 += outGrad;
      for (let j = 0; j < this.hiddenSize; ++j) {
        const hVal = this.hiddenBuf[j];
        this.g_w2[j] += outGrad * hVal;

        const reluDeriv = hVal > 0 ? 1 : this.leakyAlpha;
        const hiddenGrad = outGrad * this.w2[j] * reluDeriv;
        this.g_b1[j] += hiddenGrad;

        const row = j * this.inputSize;
        for (let i = 0; i < this.inputSize; ++i) if (board[i]) this.g_w1[row + i] += hiddenGrad * board[i];
      }
    }

    const invBatch = 1 / batchSize;

    const v_b2 = this.mu * this.v_b2 - this.lr * this.g_b2 * invBatch;
    this.v_b2 = v_b2;
    this.b2 += v_b2;

    for (let j = 0; j < this.hiddenSize; ++j) {
      const v_w2 = this.mu * this.v_w2[j] - this.lr * this.g_w2[j] * invBatch;
      this.v_w2[j] = v_w2;
      this.w2[j] += v_w2;

      const v_b1 = this.mu * this.v_b1[j] - this.lr * this.g_b1[j] * invBatch;
      this.v_b1[j] = v_b1;
      this.b1[j] += v_b1;
    }

    for (let i = 0, l = this.g_w1.length; i < l; ++i)
      if (this.g_w1[i]) {
        const v_w1 = this.mu * this.v_w1[i] - this.lr * this.g_w1[i] * invBatch;
        this.v_w1[i] = v_w1;
        this.w1[i] += v_w1;
      }
  }
}
