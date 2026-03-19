import { ChangeDetectorRef, Component, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CELL_MASK, CELL_O, CELL_X, Engine, Player } from '../../tacfish/engine';
import { compress, decompress } from '../../tacfish/quant';
import { AlignPopoverDirective } from './popover.directive';

function yieldToMain() {
  return new Promise(resolve => setTimeout(resolve));
}

function playerToString(player: Player | number): string {
  return player == CELL_X ? 'X' : player == CELL_O ? 'O' : '';
}

@Component({
  selector: 'ttf-game',
  standalone: true,
  imports: [FormsModule, AlignPopoverDirective],
  templateUrl: './game.html',
  styleUrl: './game.scss',
})
export class Game {
  N = 3;
  K = 3;
  connect4 = false;
  engine = new Engine(this.N, this.K, this.connect4, true);
  nnRatio = this.engine.nnRatio;

  settingUp = false;
  updateAIRatio = true;
  trainAI = true;
  autoAI = false;
  showScoremap = false;
  currentPlayer: Player = CELL_X;

  starPoints = new Set<number>();
  analysis: ReturnType<Engine['doWork']> | null = null;

  #lastWonByAI = false;

  constructor(private cdr: ChangeDetectorRef) {}

  updateConfig() {
    const n = Math.max(3, Math.min(Math.round(parseInt(this.N.toString())), 15)),
      k = Math.max(3, Math.min(Math.round(parseInt(this.K.toString())), n));
    this.N = n;
    this.K = k;

    this.engine = new Engine(this.N, this.K, this.connect4, true);
    this.engine.nnRatio = this.nnRatio;

    this.generateStarPoints();

    this.analysis = null;
  }
  makeConnect4() {
    if (this.connect4) {
      this.N = 7;
      this.K = 4;
    }
    this.updateConfig();
  }
  updateNNRatio() {
    this.nnRatio = Math.round(Math.max(0, Math.min(this.nnRatio, 1)) * 100) / 100;
    this.engine.nnRatio = this.nnRatio;
  }
  onSetup() {
    this.settingUp = !this.settingUp;
    this.analysis = null;
  }
  reset() {
    this.engine.reset();
    this.engine.resetSearch();
    this.analysis = null;
  }

  private generateStarPoints() {
    this.starPoints.clear();
    const n = this.N;
    if (n < 5) return;

    const d = n >= 12 ? 3 : 2,
      f = n - 1 - d;

    this.starPoints.add(d * n + d);
    this.starPoints.add(f * n + d);
    this.starPoints.add(d * n + f);
    this.starPoints.add(f * n + f);

    if (n % 2) {
      const m = (n - 1) / 2;
      this.starPoints.add(m * n + m);

      if (n >= 18) {
        this.starPoints.add(d * n + m);
        this.starPoints.add(f * n + m);
        this.starPoints.add(m * n + d);
        this.starPoints.add(m * n + f);
      }
    }
  }

  @HostListener('window:keydown', ['$event'])
  handleKeydown(event: KeyboardEvent) {
    const key = event.key.toLowerCase();

    // checkboxes gets triggered by space
    if (key === ' ' && event.target instanceof HTMLInputElement && event.target.type === 'checkbox') return;

    if (key === 'e' || key === 'r' || key === 'u' || key === 't' || key === 's' || key === 'a' || key === ' ')
      event.preventDefault();

    if (key === 'e') this.onSetup();
    if (key === 'r') this.reset();
    if (key === 'u') this.updateAIRatio = !this.updateAIRatio;
    if (key === 't') this.trainAI = !this.trainAI;
    if (key === 's') this.showScoremap = !this.showScoremap;
    if (key === 'a') this.runAnalysis(true);
    if (key === ' ' && this.analysis?.bestMove != null) this.makeMove(this.analysis.bestMove);
  }
  runAnalysis(getPV: boolean = false) {
    this.analysis = this.engine.doWork(this.currentPlayer, getPV);
  }

  flipPlayer() {
    this.currentPlayer = (this.currentPlayer ^ CELL_MASK) as Player;
  }
  flipBoard() {
    this.engine.flipBoard();
    this.flipPlayer();
  }

  makeMove(pos: number) {
    if (this.settingUp) this.engine.togglePos(pos);
    else {
      const actualPos = this.engine.getGravitizedPos(pos);
      if (actualPos >= 0 && this.engine.makeMove(actualPos, this.currentPlayer)) {
        // A move will be made even if the game is over, but we disable the board, so it doesn't matter. Moreover, this is demo, not a real game, so making extra moves to analyze the AI is fine.
        if (this.trainAI) this.trainIfOver(actualPos);

        this.flipPlayer();

        this.makeAIMove(actualPos);
      }
    }

    this.engine.resetSearch();
    this.analysis = null;
  }
  private async makeAIMove(userMove: number) {
    if (
      this.autoAI &&
      /* isUserMove= */ userMove !== this.analysis?.bestMove && // we assume that if this move isn't the best move, it's the user's move
      !this.engine.checkWinner() &&
      !this.engine.isFull()
    ) {
      for (let i = 0, l = this.getNumSteps(); i < l; ++i) {
        await yieldToMain();
        this.runAnalysis();
      }

      if (this.analysis?.bestMove != null) {
        this.makeMove(this.analysis.bestMove);
        this.cdr.detectChanges();
      }
    }
  }

  undoMove() {
    this.engine.undoMove();
    this.flipPlayer();
    this.engine.resetSearch();
    this.analysis = null;
  }

  getNumSteps(): number {
    let numSteps = 25.3125 / this.N + 0.0625; // this formula was experimentally derived to give the most number of steps for different board sizes under a reasonable time
    if (this.connect4) numSteps *= 2;
    return Math.round(numSteps);
  }
  getBoard(): string[] {
    return this.engine.board.map(playerToString);
  }
  getCurrentPlayer(): string {
    return playerToString(this.currentPlayer);
  }

  trainIfOver(pos: number) {
    const winner = this.engine.checkWinner();
    // game over
    if (winner || this.engine.isFull()) {
      this.engine.trainNN(winner);

      const wonByAI = Boolean(winner && pos === this.analysis?.bestMove);
      if (this.updateAIRatio) {
        const step = Math.max(this.nnRatio * 0.1, 0.01); // handle for small nnRatio
        this.nnRatio += wonByAI ? step : -step;
        this.updateNNRatio();
      }

      this.engine.nn.updateLR(wonByAI && this.#lastWonByAI ? 0.99 : 1.01);
      this.#lastWonByAI = wonByAI;
    }
  }

  getScoremap(): number[] {
    const scoremap = this.engine.getScoremap(this.currentPlayer);
    let absMax = scoremap.reduce((a, b) => Math.max(a, Math.abs(b)));
    // If all values are <0.75, scale to 0.5, else scale to 1.
    if (absMax < 0.75) absMax *= 2;
    return scoremap.map(x => x / absMax);
  }

  getWinner(): [winner: string, pos: Set<number>] | null {
    const winner = this.engine.checkWinner();
    if (winner) return [playerToString(winner), this.engine.getWinningPos()];

    if (this.engine.isFull()) return ['Draw', new Set()];

    return null;
  }

  #weight3_3: Float32Array | null = null;
  async load3_3AI() {
    this.N = this.K = 3;
    this.updateConfig();

    if (!this.#weight3_3) this.#weight3_3 = new Float32Array((await import('../../assets/3_3.json')).default);
    this.engine.nn.setWeights(this.#weight3_3);
    this.cdr.markForCheck();
  }
  downloadWeights() {
    const blob = new Blob([JSON.stringify(Array.from(this.engine.nn.getWeights()))], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.N}_${this.K}${this.connect4 ? 'c' : ''}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
  uploadWeights() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = () => {
          this.engine.nn.setWeights(new Float32Array(JSON.parse(reader.result as string)));
          this.cdr.markForCheck();
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }
  saveToLS() {
    localStorage.setItem(`${this.N}_${this.K}${this.connect4 ? 'c' : ''}`, compress(this.engine.nn.getWeights()));
  }
  loadFromLS() {
    const weights = localStorage.getItem(`${this.N}_${this.K}${this.connect4 ? 'c' : ''}`);
    if (weights) {
      this.engine.nn.setWeights(decompress(weights));
      this.cdr.markForCheck();
    }
  }
}
