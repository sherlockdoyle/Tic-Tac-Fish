import { NeuralNetwork } from './nn';

export const CELL_EMPTY = 0b00n,
  CELL_X = 0b01n,
  CELL_O = 0b10n,
  CELL_MASK = CELL_X | CELL_O;
export type Player = typeof CELL_X | typeof CELL_O;

export type Pos = number;

const SCORE_WIN = 0x7fffffff, // 2**31 - 1, greater than K=13
  SCORE_LOSS = -SCORE_WIN;

interface Analysis {
  score: number;
  bestMove?: Pos;
  winner?: Player;
}

export class Engine {
  nnRatio = 0.4;

  #bitboard = 0n;
  moves: Pos[] = [];
  #curDepth = 1;
  #tt = new Map<bigint, { depth: number; score: number; flag: 'exact' | 'lower' | 'upper'; bestMove?: Pos }>();
  readonly nn: NeuralNetwork;

  #allLines: [start: Pos, delta: number][] = [];
  #colMask = 0n;
  #cellOrder: Uint8Array;
  #symmetries: Uint8Array;

  constructor(
    private readonly N: number = 3,
    private readonly K: number = 3,
    private readonly connect4: boolean = false,
    randomize = false,
  ) {
    this.nn = new NeuralNetwork(N, K);

    this.generateAllLines();

    this.#cellOrder = new Uint8Array(this.N * this.N);
    this.generateMasksAndOrder(randomize);

    this.#symmetries = new Uint8Array(7 * this.N * this.N); // the board has 8 symmetries, we don't need the identity
    this.generateSymmetries();
  }

  private generateAllLines() {
    const start = Number(this.connect4),
      end = this.N - this.K;

    // row
    for (let r = start; r < this.N; ++r) {
      const row = r * this.N;
      for (let c = 0; c <= end; ++c) this.#allLines.push([row + c, 1]);
    }

    // col
    for (let r = start; r <= end; ++r) {
      const row = r * this.N;
      for (let c = 0; c < this.N; ++c) this.#allLines.push([row + c, this.N]);
    }

    for (let r = start; r <= end; ++r) {
      const row = r * this.N;
      // diagonal
      for (let c = 0; c <= end; ++c) this.#allLines.push([row + c, this.N + 1]);
      // anti diagonal
      for (let c = this.K - 1; c < this.N; ++c) this.#allLines.push([row + c, this.N - 1]);
    }
  }
  private generateMasksAndOrder(randomize: boolean) {
    for (let i = 0; i < this.N; ++i) this.#colMask |= CELL_MASK << BigInt(i * this.N * 2);

    for (let i = this.#cellOrder.length - 1; i > 0; --i) this.#cellOrder[i] = i;
    if (randomize)
      // shuffle so that the cells that are same distance from the center are randomized
      for (let i = this.#cellOrder.length - 1; i > 0; --i) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.#cellOrder[i], this.#cellOrder[j]] = [this.#cellOrder[j], this.#cellOrder[i]];
      }

    const center = (this.N - 1) / 2;
    this.#cellOrder.sort((a, b) => {
      const ax = a % this.N,
        ay = Math.floor(a / this.N),
        bx = b % this.N,
        by = Math.floor(b / this.N);
      const da = (ax - center) ** 2 + (ay - center) ** 2,
        db = (bx - center) ** 2 + (by - center) ** 2;
      return da - db;
    });
  }
  private generateSymmetries() {
    const n = this.N;
    for (let i = 0, l = n * n; i < l; ++i) {
      const row = Math.floor(i / n),
        col = i % n;

      this.#symmetries[7 * i] = col * n + n - 1 - row; // 90 deg clockwise
      this.#symmetries[7 * i + 1] = (n - 1 - row) * n + n - 1 - col; // 180 deg
      this.#symmetries[7 * i + 2] = (n - 1 - col) * n + row; // 270 deg clockwise
      this.#symmetries[7 * i + 3] = row * n + n - 1 - col; // horizontal flip
      this.#symmetries[7 * i + 4] = (n - 1 - row) * n + col; // vertical flip
      this.#symmetries[7 * i + 5] = col * n + row; // diagonal flip
      this.#symmetries[7 * i + 6] = (n - 1 - col) * n + n - 1 - row; // anti diagonal flip
    }
  }

  private isValidPosInConnect4(pos: Pos): boolean {
    if (!this.connect4 || pos >= this.N * (this.N - 1))
      // no gravity or last row
      return true;

    if (pos < this.N)
      // first row; connect 4 board has one less row than column, so we ignore the first row to keep using the same code
      return false;

    const below = BigInt((pos + this.N) * 2);
    return ((this.#bitboard >> below) & CELL_MASK) !== CELL_EMPTY;
  }

  /**
   * Return the lowest empty row in the column of the given pos; as if the move fell down. Returns negative if the
   * column is full.
   */
  public getGravitizedPos(pos: Pos): Pos {
    if (!this.connect4) return pos;

    const shift = BigInt(this.N * 2);
    const col = pos % this.N;
    if (this.#bitboard === 0n)
      // empty board, return last row
      return this.N * (this.N - 1) + col;

    let tmpBoard = this.#bitboard >> BigInt((this.N + col) * 2); // ignore first row
    let topEmptyRow = -1;
    // we can do binary search, but our N<=15, so it's not worth it
    for (let i = 1; i < this.N; ++i) {
      if ((tmpBoard & CELL_MASK) === CELL_EMPTY) topEmptyRow = i;
      else break;
      tmpBoard >>= shift;
    }
    // col < this.N, if topEmptyRow === -1, then topEmptyRow * this.N + col < 0, so the result will be negative
    return topEmptyRow * this.N + col;
  }

  reset() {
    this.#bitboard = 0n;
    this.moves.length = 0;
  }

  makeMove(pos: Pos, player: Player): boolean {
    if (!this.isValidPosInConnect4(pos)) return false;

    const p = BigInt(pos * 2);
    if (((this.#bitboard >> p) & CELL_MASK) === CELL_EMPTY) {
      this.#bitboard |= player << p;
      this.moves.push(pos);
      return true;
    }
    return false;
  }

  /**
   * Toggles the cell at the given position between Empty, X, O.
   */
  togglePos(pos: Pos) {
    const p = BigInt(pos * 2);
    const cell = (this.#bitboard >> p) & CELL_MASK;
    // (cell + 1) % 3: 0 -> 1, 1 -> 2, 2 -> 0
    const newCell = (cell + 1n) % 3n;
    this.#bitboard = (this.#bitboard & ~(CELL_MASK << p)) | (newCell << p);

    const index = this.moves.indexOf(pos);
    if (index >= 0) this.moves.splice(index, 1); // remove old move
    if (newCell !== CELL_EMPTY) this.moves.push(pos); // add new move if present
  }

  /**
   * Change each cell to its opposite.
   */
  flipBoard() {
    const mask = (1n << BigInt(this.N * this.N * 2)) / 3n;
    this.#bitboard = ((this.#bitboard & mask) << 1n) | ((this.#bitboard >> 1n) & mask);
  }

  undoMove() {
    if (this.moves.length) this.#bitboard &= ~(CELL_MASK << BigInt(this.moves.pop()! * 2));
  }

  get board(): number[] {
    const l = this.N * this.N;
    const board = new Array<number>(l).fill(0);
    let tmpBoard = this.#bitboard;
    for (let i = 0; i < l && tmpBoard; ++i) {
      board[i] = Number(tmpBoard & CELL_MASK);
      tmpBoard >>= 2n;
    }
    return board;
  }

  getEmptyPos(): Pos[] {
    const l = this.N * this.N;
    const cells: Pos[] = [];
    let cellMask = CELL_MASK;
    for (let i = 0; i < l; ++i) {
      if ((this.#bitboard & cellMask) === CELL_EMPTY && this.isValidPosInConnect4(i)) cells.push(i);
      cellMask <<= 2n;
    }
    return cells;
  }

  checkWinner(): Player | 0n {
    const hShift = 2n,
      vShift = BigInt(this.N * 2),
      dShift = vShift + hShift,
      adShift = vShift - hShift;
    const leftMask = ~this.#colMask,
      rightMask = ~(this.#colMask << adShift); // vShift - 2n

    const mask = (1n << BigInt(this.N * this.N * 2)) / 3n; // alternating 0 and 1
    let maskedBoard = this.#bitboard & mask;

    // scan for both players
    for (let i = 1n; i <= 2n; ++i) {
      let h = maskedBoard, // horizontal
        v = maskedBoard, // vertical
        d = maskedBoard, // diagonal
        ad = maskedBoard; // anti diagonal

      for (let j = 1; j < this.K && (h || v || d || ad); ++j) {
        h &= (h >> hShift) & rightMask;
        v &= v >> vShift;
        d &= (d >> dShift) & rightMask;
        ad &= (ad >> adShift) & leftMask;
      }

      if (h || v || d || ad) return i as Player; // found winner

      maskedBoard = this.#bitboard & (mask << 1n); // will be used for the next player (2)
    }

    return 0n;
  }

  /**
   * Returns the positions of the winning line. This simply checks for K in a line irrespective of the player, so it
   * returns the positions of either player.
   * This method is strictly for the UI. We assume that the player who made the last move is the winner.
   */
  getWinningPos(): Set<Pos> {
    const hShift = 2n,
      vShift = BigInt(this.N * 2),
      dShift = vShift + hShift,
      adShift = vShift - hShift;
    const leftMask = ~this.#colMask,
      rightMask = ~(this.#colMask << adShift); // vShift - 2n

    let h = this.#bitboard, // horizontal
      v = this.#bitboard, // vertical
      d = this.#bitboard, // diagonal
      ad = this.#bitboard; // anti diagonal
    // keep all but one cell per winning lines
    for (let i = 1; i < this.K && (h || v || d || ad); ++i) {
      h &= (h >> hShift) & rightMask;
      v &= v >> vShift;
      d &= (d >> dShift) & rightMask;
      ad &= (ad >> adShift) & leftMask;
    }

    // reconstruct only the winning lines
    for (let i = 1; i < this.K; ++i) {
      h |= h << hShift;
      v |= v << vShift;
      d |= d << dShift;
      ad |= ad << adShift;
    }

    let onlyWins = h | v | d | ad;
    const winningPos = new Set<Pos>();
    for (let i = 0, l = this.N * this.N; i < l && onlyWins; ++i) {
      if (onlyWins & CELL_MASK) winningPos.add(i);
      onlyWins >>= 2n;
    }

    return winningPos;
  }

  private evaluateHeuristic(player: Player): number {
    const isFirstPlayer = // When no move has been made, moves.length === 0, even during negamax. This means, during the
        // first negamax call, both players will behave as the first player even if a move has already been made. This
        // is a bug, but keeps the code simple. Also, shouldn't be much of an issue for the first move, right? I hope!
        this.moves.length === 0 || player === ((this.#bitboard >> BigInt(this.moves[0] * 2)) & CELL_MASK),
      opponent = player ^ CELL_MASK;

    let score = 0;
    for (const [start, delta] of this.#allLines) {
      let numPlayer = 0,
        numOpponent = 0,
        floating = 0;
      let lastEmptyPlayerPos = -1;
      for (let i = 0; i < this.K; ++i) {
        const pos = start + i * delta;
        const cell = (this.#bitboard >> BigInt(pos * 2)) & CELL_MASK;
        if (cell === player) ++numPlayer;
        else if (cell === opponent) ++numOpponent;
        else {
          lastEmptyPlayerPos = pos;
          if (!this.isValidPosInConnect4(pos)) ++floating;
        }
      }

      // check winner
      if (numPlayer === this.K) return SCORE_WIN;
      if (numOpponent === this.K) return SCORE_LOSS;

      if (numOpponent === 0 && numPlayer) {
        let lineScore = 5 ** numPlayer / 2 ** floating;
        if (numPlayer === this.K - 1 && floating === 0)
          if (this.connect4) {
            // The formula below counts last row from 1, but we count from 0. So if the value is odd, the last row is
            // even for us.
            const isLastRowEven = (this.N - Math.floor(lastEmptyPlayerPos / this.N)) % 2 === 1;
            if (isFirstPlayer === isLastRowEven)
              // (isFirstPlayer && isLastRowEven) || (!isFirstPlayer && !isLastRowEven)
              lineScore *= 2;
            else lineScore *= 1.25;
          } else lineScore *= 3;
        score += lineScore;
      } else if (numPlayer === 0 && numOpponent) {
        let lineScore = 5 ** numOpponent / 2 ** floating;
        if (numOpponent === this.K - 1 && floating === 0)
          // opponent has a winning line, penalize
          lineScore *= 3;
        score -= lineScore;
      }
    }

    return Math.tanh(score / 5 ** (this.K - 0.25)); // scale to NN range (-1 to 1)
  }
  private evaluateNN(player: Player): number {
    return this.nn.forward(this.getBoardForNN(player));
  }
  evaluatePos(player: Player): number {
    if (this.nnRatio < 1e-5) return this.evaluateHeuristic(player);
    if (this.nnRatio > 0.99999) return this.evaluateNN(player);
    return this.evaluateHeuristic(player) * (1 - this.nnRatio) + this.evaluateNN(player) * this.nnRatio;
  }

  isEmpty(): boolean {
    return this.#bitboard === 0n;
  }
  isFull(): boolean {
    return this.moves.length === this.N * (this.N - Number(this.connect4));
  }

  private getSortedPos(bestMove: number | undefined): Pos[] {
    const poses: Pos[] = [],
      nonNeighbors: Pos[] = [];

    let occ = this.#bitboard;
    const hShift = 2n,
      vShift = BigInt(this.N * 2);

    const hSmear = occ | ((occ & ~(this.#colMask << (vShift - 2n))) << hShift) | ((occ & ~this.#colMask) >> hShift);
    const neighbors = hSmear | (hSmear << vShift) | (hSmear >> vShift);

    if (bestMove != null) {
      poses.push(bestMove);
      occ |= CELL_MASK << BigInt(bestMove * 2); // mark as occupied so that this pos is not added again
    }
    for (const pos of this.#cellOrder) {
      const cellMask = CELL_MASK << BigInt(pos * 2);
      if ((occ & cellMask) === CELL_EMPTY && this.isValidPosInConnect4(pos))
        if (neighbors & cellMask) poses.push(pos);
        else nonNeighbors.push(pos);
    }

    return poses.concat(nonNeighbors);
  }

  private negamax(depth: number, alpha: number, beta: number, player: Player): Analysis {
    const opponent = (player ^ CELL_MASK) as Player;

    const tt = this.#tt.get(this.#bitboard);
    if (tt && tt.depth >= depth) {
      switch (tt.flag) {
        case 'exact':
          return { score: tt.score, bestMove: tt.bestMove };
        case 'lower':
          alpha = Math.max(alpha, tt.score);
          break;
        case 'upper':
          beta = Math.min(beta, tt.score);
          break;
      }
      if (alpha >= beta) return { score: tt.score, bestMove: tt.bestMove };
    }

    const winner = this.checkWinner();
    if (winner)
      return {
        score:
          winner === player
            ? SCORE_WIN - (this.#curDepth - depth) // prefer winning faster
            : SCORE_LOSS + (this.#curDepth - depth), // winner === opponent, prefer losing later
        winner,
      };

    // User has already made `moves.length` moves. The current search started from `curDepth` depth and we are currently
    // at `depth` depth. So we have traversed `curDepth - depth` depths and made one move per depth. So the total number
    // of moves is user moves + search moves = `moves.length + (curDepth - depth)`.
    // We use this calculation since we do unchecked moves in the loop below which does not update `moves`, so we can
    // not use `isFull()`.
    // We do this calculation inline to avoid it being calculated always (short circuiting, micro-optimization?).
    if (
      depth === 0 ||
      /* isFull= */ this.moves.length + this.#curDepth - depth === this.N * (this.N - Number(this.connect4))
    )
      return { score: this.evaluatePos(player) };

    const originalAlpha = alpha;
    let bestScore = -Infinity,
      bestMove: Pos | undefined = undefined;
    for (const pos of this.getSortedPos(tt?.bestMove)) {
      const p = BigInt(pos * 2);
      this.#bitboard |= player << p; // makeMove without checking
      const result = this.negamax(depth - 1, -beta, -alpha, opponent);
      this.#bitboard &= ~(CELL_MASK << p); // undoMove

      const score = -result.score;
      if (score > bestScore) {
        bestScore = score;
        bestMove = pos;
      }
      alpha = Math.max(alpha, score);
      if (alpha >= beta) break;
    }

    this.#tt.set(this.#bitboard, {
      depth,
      score: bestScore,
      flag: bestScore <= originalAlpha ? 'upper' : bestScore >= beta ? 'lower' : 'exact',
      bestMove,
    });

    return { score: bestScore, bestMove };
  }

  resetSearch() {
    this.#tt.clear();
    this.#curDepth = 1;
  }

  private getPV(player: Player): Pos[] {
    const pv: Pos[] = [];
    const numMoves = this.moves.length;

    let curPlayer = player;
    for (let i = 0, l = this.N * this.N; i < l; ++i) {
      const tt = this.#tt.get(this.#bitboard);
      if (tt?.bestMove == null) break;

      pv.push(tt.bestMove);

      if (!this.makeMove(tt.bestMove, curPlayer)) break;
      curPlayer = (curPlayer ^ CELL_MASK) as Player;
    }
    while (this.moves.length > numMoves) this.undoMove();

    return pv;
  }

  doWork(player: Player, getPV: boolean = false): Analysis & { depth: number; pv?: Pos[] } {
    const result = this.negamax(this.#curDepth, -Infinity, Infinity, player);
    return { ...result, depth: this.#curDepth++, pv: getPV ? this.getPV(player) : undefined };
  }

  private getBoardForNN(player: Player): Int8Array {
    const l = this.N * this.N;

    // A board has 8 symmetries and we want them to be treated the same. We do this by canonicalizing the board - we
    // generate all symmetries of the board and then choose the smallest one.
    let minBoard = this.#bitboard;
    for (let i = 0; i < 7; ++i) {
      let tmpBoard = this.#bitboard,
        newBoard = 0n;
      for (let j = 0; j < l && tmpBoard; ++j) {
        const cell = tmpBoard & CELL_MASK;
        newBoard |= cell << BigInt(this.#symmetries[7 * j + i] * 2);
        tmpBoard >>= 2n;
      }
      minBoard = newBoard < minBoard ? newBoard : minBoard;
    }

    const board = new Int8Array(l);
    if (minBoard === 0n) return board; // quick return

    for (let i = 0; i < l && minBoard; ++i) {
      const cell = minBoard & CELL_MASK;
      board[i] = cell === CELL_EMPTY ? 0 : cell === player ? 1 : -1;
      minBoard >>= 2n;
    }
    return board;
  }

  // we can get the winner here too, but we pass it as a small speedup
  trainNN(winner: Player | 0n) {
    const tmpBoard = this.#bitboard;
    this.#bitboard = 0n;

    const boards: Int8Array[] = [],
      targets: number[] = [];
    for (const pos of this.moves) {
      const p = BigInt(pos * 2);
      const cell = ((tmpBoard >> p) & CELL_MASK) as Player;
      this.#bitboard |= cell << p;

      boards.push(this.getBoardForNN(cell));
      targets.push(winner ? (winner === cell ? 1 : -1) : 0);
    }

    for (let i = 0; i < this.N; ++i) this.nn.trainBatch(boards, targets); // train a few times
  }

  getScoremap(player: Player): number[] {
    const l = this.N * this.N;
    const scoremap = new Array<number>(l).fill(0);
    const currentTT = this.#tt.get(this.#bitboard);
    for (let i = 0; i < l; ++i) {
      const p = BigInt(i * 2);
      if (((this.#bitboard >> p) & CELL_MASK) !== CELL_EMPTY || !this.isValidPosInConnect4(i)) continue;

      this.#bitboard |= player << p;
      const tt = this.#tt.get(this.#bitboard);
      scoremap[i] = tt ? -tt.score : currentTT?.bestMove === i ? currentTT.score : this.evaluatePos(player);
      this.#bitboard &= ~(CELL_MASK << p);
    }
    return scoremap;
  }
}

// Sample training code
// function main() {
//   const engine = new Engine(3, 3);

//   let eps = 0.5;
//   for (let _ = 0; _ < 5000; ++_) {
//     if (_ % 100 === 0) console.log(_);
//     engine.reset();

//     let currentPlayer: Player = Math.random() < 0.5 ? CELL_O : CELL_X;
//     while (!(engine.isFull() || engine.checkWinner())) {
//       if (Math.random() < eps) {
//         engine.doWork(currentPlayer);
//         const result = engine.doWork(currentPlayer);
//         engine.makeMove(result.bestMove!, currentPlayer);
//       } else {
//         const emptyPos = engine.getEmptyPos();
//         engine.makeMove(emptyPos[Math.floor(Math.random() * emptyPos.length)], currentPlayer);
//       }
//       engine.resetSearch();

//       currentPlayer = (currentPlayer ^ CELL_MASK) as Player;
//     }

//     engine.trainNN(engine.checkWinner());
//     if (eps > 0.1) eps *= 0.9995;
//   }

//   console.log(
//     JSON.stringify(Array.from(engine.nn.getWeights()), (_, v) => (typeof v === 'number' ? Number(v.toFixed(5)) : v)),
//   );
// }
// main();
