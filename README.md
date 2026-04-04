# Tic Tac Fish

**Tic Tac Fish** is like Stockfish, but for Tic Tac Toe!

## How to Play & Controls

### Game Configuration Menu

* **Board Size**: Change the size of the grid. You can play on the classic 3x3 board, or expand it all the way up to a massive 15x15 grid!
* **Win Condition**: Set how many pieces in a row (horizontally, vertically, or diagonally) you need to win. Want to play 5-in-a-row on a 10x10 board? You can do that here!
* **Connect 4**: Checking this box instantly transforms the game into a Connect-4 style game. The board size defaults to 6x7, the win condition becomes 4, and pieces will "fall" to the bottom of the column you click, just like real Connect 4! (Note: The very top row of the grid is hidden in Connect 4 mode to represent the 6x7 board).
* **Setup / Done**: Click the "Setup" button to enter a custom editing mode. While in Setup mode, clicking on cells lets you place 'X' or 'O' pieces manually anywhere on the board, or click again to remove them. This is great for setting up specific scenarios or puzzles! Click "Done" when you are finished setting up the board to resume normal play.
* **Reset**: Clears the board and restarts the current game completely from scratch.

### AI and Advanced Settings

* **AI Ratio**: This slider controls how "smart" the AI is by blending traditional heuristic logic with a Neural Network (NN). A ratio of `0` means it relies entirely on basic logic, while `1` means it relies fully on its learned neural network experience. Values in between blend the two approaches. The current learning rate (AI LR) is shown above the analysis button.
* **Update AI Ratio**: If checked, the AI Ratio will automatically adjust itself as you play and as the AI learns from wins and losses.
* **Train AI**: If checked, the AI learns from every finished game automatically, trying to get better over time. Leave this on to watch the AI adapt to your playstyle!
* **Show Scoremap**: Checking this turns the game board into a heat-map! Cells will light up green for good moves and red for bad moves based on what the AI thinks.
* **Auto AI**: When checked, the AI will automatically play its turn against you as soon as you make a move. The small text next to it shows how many "steps" or "thoughts" it takes per turn.
* **Run Analysis**: Click this to force the AI to analyze the current board state and find the best move.

### Info Section

* **Player Turn Indicator**: Located just below the settings, this tells you whose turn it is to play.
* **Flip Player**: You can click directly on the current player's symbol (the 'X' or 'O') in the info section to change to the other player.
* **Game Over Message**: Once a game concludes, this section will declare the winner (or a draw) and highlight the text in their respective colors.

### The Game Board & Analysis

* **Analysis Details**: Right above the board, you will see the `Analysis:` readout. If you have run an analysis, it will display the `Depth` (how many moves ahead the AI looked) and `Moves` (the sequence of best predicted moves, also known as the Principal Variation or PV).
* **Cell Numbers**: Each cell has a small number in the top-left corner indicating its index on the board.
* **Star Points (Dots)**: On larger boards (5x5 and up), you will see small dots next to some cell numbers. These are "star points" (borrowed from games like Go), which help you visually orient yourself on large grids.
* **Last Move Marker**: The most recently placed piece will have a subtle ring marker around its center so you can easily see what your opponent just did.
* **Best Move Indicator**: If you run an analysis, the AI's chosen best move will be highlighted with a blue border and will pop out slightly.
* **Winning Line Pulse**: When the game is won, the pieces that form the winning line will pulse with a glowing animation.

### More Options (The `...` Menu)

Clicking the small three-dots button in the top-right of the controls opens a menu with some extra tools:

* **Undo**: Take back the very last move made.
* **Flip board**: Swaps all the pieces! Your pieces become the opponent's and vice-versa, and it swaps whose turn it is.
* **Load 3x3 AI**: Instantly loads a pre-trained AI specifically for the classic 3x3 mode so you can play against an experienced opponent immediately.
* **Download weights**: Saves the AI's current "brain" (neural network weights) as a JSON file to your computer.
* **Upload weights**: Load a previously saved AI brain file back into the game.
* **Save to local storage**: Saves the AI's brain to your web browser so it remembers how to play even if you close the tab.
* **Load from local storage**: Loads the saved AI brain from your web browser.

### Keyboard Shortcuts

For quick access, you can use the following keyboard shortcuts while playing:

* `e`: Toggle Setup mode (Edit mode)
* `r`: Reset the board
* `u`: Toggle 'Update AI Ratio' setting
* `t`: Toggle 'Train AI' setting
* `s`: Toggle 'Show Scoremap'
* `a`: Run Analysis
* `Spacebar`: Automatically make the AI's suggested best move (only works if you have already run an Analysis).

## Why?

Somewhere around the end of 2025, I was visiting my relatives and saw my cousins playing Tic Tac Toe on their phone. The app they were using included other two-player games, but notably featured different sized Tic Tac Toe boards, each requiring a different number of pieces in a line to win.

While the classic 3x3 game is easily winnable or drawable, the other sizes are not. At the time, for some reason which I have now forgotten, I had either chess or Stockfish on my mind. I thought, why not build something similar to play Tic Tac Toe?

Later on, I also added Connect-4. The game is pretty similar, so adding it didn't need many code changes.

## How?

The codebase is built using Angular and TypeScript. The underlying engine operates efficiently by packing board states into integers using bitwise math, relying a dynamic neural network for positional evaluation, and utilizing a custom algorithm for quantization.

### Game State and Engine

The core game logic relies on three primary parameters:

* $N$: The size of the $N \times N$ grid.
* $K$: The required consecutive pieces to win.
* `connect4`: A boolean modifying the rules. If true, pieces fall to the lowest empty row in the selected column. Connect 4 functionally hides the top row (row 0), operating on an $N \times (N-1)$ visible grid.

To ensure extreme performance during tree search, the board state is packed mathematically rather than using objects or arrays. Each cell requires 2 bits to represent its state:

* Empty: `0b00` ($0$)
* Player X: `0b01` ($1$)
* Player O: `0b10` ($2$)

To store the entire grid, a single JavaScript `BigInt` (referred to as a `bitboard`) is used, consuming exactly $2N^2$ bits.

#### Reading and Writing State

The state of a cell at a specific $\mathrm{pos}$ (where $\mathrm{pos} \in [0, N^2 - 1]$) is located at bit offset $\mathrm{pos} \times 2$. To extract a cell:

```typescript
const shift = BigInt(pos * 2);
const cell = (bitboard >> shift) & 0b11n; // 0b11n is CELL_MASK
```

Setting a cell for a `player` involves a bitwise OR, assuming the cell is currently empty:

```typescript
bitboard |= player << shift;
```

Removing a piece is achieved via a bitwise AND with a negated mask:

```typescript
bitboard &= ~(0b11n << shift);
```

### Winner Calculation via Bitwise Operations

Checking for a winner is executed globally across the entire board simultaneously using consecutive bitwise shifts and AND operations, bypassing slow loops.

To search for $K$ consecutive pieces, the board is iteratively AND-ed with a shifted version of itself. If $K$ consecutive bits exist in a target direction, those specific bits will survive $K-1$ shifts.

The necessary bit shifts for a grid of size $N$ are:

* **Horizontal (`hShift`)**: $2$ bits (1 cell right)
* **Vertical (`vShift`)**: $2N$ bits (1 row down)
* **Diagonal (`dShift`)**: $2N + 2$ bits (1 row down, 1 cell right)
* **Anti-Diagonal (`adShift`)**: $2N - 2$ bits (1 row down, 1 cell left)

Because the 1D bitboard logically wraps from the end of one row to the beginning of the next, horizontal and diagonal shifts must not "bleed" across row boundaries. This is prevented using column masks:

* `colMask`: A mask with `0b11` at every cell in column 0.
* `leftMask`: `~colMask`. Used to clear bits that wrap from the left edge.
* `rightMask`: `~(colMask << adShift)`. Used to clear bits that wrap from the right edge.

#### Example Algorithm

For a given player, their isolated board is isolated using a player mask. Then, the $K-1$ iterations look like this:

```typescript
let h = board, v = board, d = board, ad = board;

for (let i = 1; i < K && (h || v || d || ad); ++i) {
    h &= (h >> hShift) & rightMask;
    v &= (v >> vShift);
    d &= (d >> dShift) & rightMask;
    ad &= (ad >> adShift) & leftMask;
}
if (h || v || d || ad) return true; // Winner found
```

If any bits remain non-zero in `h`, `v`, `d`, or `ad` after the loop, a winning line of $K$ exists.

### Search Algorithm: Negamax and Transposition Table

The core search engine uses **Negamax** with **Alpha-Beta pruning**. Negamax simplifies Minimax by recognizing that $\max(a, b) = -\min(-a, -b)$, calculating the board score strictly from the perspective of the current player.

#### Transposition Table (TT)

Because different move orders lead to identical board configurations, a TT caches evaluations to prevent redundant work.
The TT uses the full $2N^2$-bit `bitboard` as the key. Each entry stores:

* `depth`: The remaining depth searched from this node.
* `score`: The evaluated score.
* `flag`: Indicates if the score is exact (`exact`), bounded from below due to an alpha cutoff (`lower`), or bounded from above due to failing to exceed alpha (`upper`).
* `bestMove`: The optimal move found, crucial for extracting the **Principal Variation (PV)** (the optimal predicted move sequence).

#### Move Sorting Optimizations

Alpha-Beta pruning is exponentially faster when it evaluates the strongest moves first. Move generation generates a legal move array prioritizing:

1. **TT Best Move**: If the TT recorded a `bestMove` for the current state in a previous shallower search, it is checked first.
2. **Adjacent Neighbors**: Moves immediately adjacent to an existing piece are investigated next. To find all neighbors instantaneously without loops, the engine utilizes a bitwise "smear".
    * First, all occupied pieces (`occ`) are smeared horizontally to create `hSmear`:  
    `hSmear = occ | ((occ & rightMask) << hShift) | ((occ & leftMask) >> hShift)`
    * Then, `hSmear` is smeared vertically to identify all adjacent cells:  
    `neighbors = hSmear | (hSmear << vShift) | (hSmear >> vShift)`
3. **Distance to Center**: Before the game begins, all board positions are pre-sorted based on their geometric squared distance to the center: $(x - \mathrm{center})^2 + (y - \mathrm{center})^2$. If a cell isn't a neighbor, it falls back to this ordering, inherently prioritizing central control.

### Heuristic Evaluation

When the Negamax search hits its maximum depth without finding a terminal state (win/loss/draw), it relies on a static heuristic function. The engine isolates every possible winning line (rows, columns, diagonals of length $K$) and evaluates them independently.

* If a line is blocked (contains pieces from both players), it scores $0$.
* If a line is uncontested (contains $\mathrm{num}$ pieces of the current player and empty spaces), it is evaluated. For Connect 4 mode, empty spaces are further categorized. An empty space is "floating" if the space immediately below it is also empty, meaning it cannot be played in immediately.

The base line score ($S$) is calculated as:
$$ S = \frac{5^\mathrm{num}}{2^\mathrm{floating}} $$
This exponentially rewards lines closer to completion, while heavily penalizing lines requiring multiple setup moves in Connect 4.

#### Threat Modifiers

If a player is one move away from a win ($\mathrm{num} = K - 1$) and the winning cell is not floating ($\mathrm{floating} = 0$), the threat is imminent.

* In standard mode, the threat score is drastically scaled: $S = S \times 3$.
* In Connect 4 mode, the multiplier depends on the parity of the empty cell's row. In Connect 4, due to the alternating turn structure, a threat on an odd row strongly favors the first player, while a threat on an even row favors the second player. If the empty cell's row parity aligns with the player's turn advantage, the threat is highly lethal and multiplied by $2$. Otherwise, it is only multiplied by $1.25$.

Finally, the heuristic sums the scores of all lines for the current player, subtracts the sum of the opponent's lines, and squashes the result into the $[-1, 1]$ range using a hyperbolic tangent. To align the scale properly with $K$, a fractional constant is used:
$$ \mathrm{Score}_\mathrm{final} = \tanh\left(\frac{Score_{total}}{5^{K - 0.25}}\right) $$

### Neural Network Integration

Because the static mathematical heuristic struggles with long-term positional sacrifices, a lightweight multi-layer perceptron (Neural Network) runs in tandem.

#### Architecture Details

1. **Input Canonicalization**: The input layer has $N^2$ nodes. Each cell is mapped to $1$ (current player), $-1$ (opponent), or $0$ (empty). To vastly reduce the required training time, the input board is canonicalized. The engine generates all 8 mathematical symmetries of the board (rotations of 90, 180, 270 degrees, plus horizontal, vertical, and diagonal reflections). The symmetry that forms the numerically smallest binary value is fed into the network.
2. **Hidden Layer**: A single hidden layer utilizes a Leaky ReLU activation function ($\alpha = 0.01$). The size of this layer dynamically adjusts based on the complexity of the grid using the formula: $\max(32, 2^{\lfloor \log_2(N^2 \times K) \rfloor})$.
3. **Output Layer**: A single output node uses a $\tanh$ activation to predict the position's evaluation between $[-1, 1]$.

#### Training via Self-Play

The AI supports live online training. It records the sequences of states visited during a match. When the game ends with a terminal condition (win = $1$, loss = $-1$, draw = $0$), it creates training batches.
The network updates its weights using Gradient Descent with Momentum. The gradients of the weights ($\nabla W$) are updated using:
$$ V_t = \mu V_{t-1} - \eta \frac{1}{B} \sum_{b=1}^{B} \nabla W_b $$
$$ W_{t+1} = W_t + V_t $$
Where $\mu = 0.9$ (momentum), $\eta$ is the learning rate, and $B$ is the batch size.

When generating moves in the application, the user controls an "AI Ratio" slider (from $0$ to $1$) to dictate what percentage of the evaluation is driven by the network versus the static heuristic:
$$ \mathrm{Score}_\mathrm{blended} = \mathrm{Heuristic} \times (1 - \mathrm{Ratio}) + \mathrm{NN} \times \mathrm{Ratio} $$

### Application Game Loop & Settings

The UI interacts with the engine via several heuristic quality-of-life algorithms designed to make the AI feel dynamic and responsive to play.

#### AI Auto-Move (`numSteps`)

When `Auto AI` is enabled, the game calculates how many iterations ("steps") of Negamax search the AI should perform before acting. Because the search tree grows exponentially, a hardcoded iteration count would either be too fast on small boards or unplayably slow on large ones.
The number of steps is computed via the experimentally derived formula:
$$ \mathrm{Steps} = \operatorname{round}\left( \frac{25.3125}{N} + 0.0625 \right) $$
If Connect 4 mode is enabled, this iteration count is doubled, sinnce the search space is much smaller, giving the AI more time to think. The engine executes `doWork` this many times, yielding to the browser's main thread between iterations so the UI doesn't freeze.

#### Dynamic AI Ratio Updates

If `Update AI Ratio` is checked, the engine adjusts how much it relies on the Neural Network versus the math heuristic after every game. If the AI wins the game (i.e., the final winning move matches the AI's predicted `bestMove`), it assumes its current ratio configuration is good and slightly reinforces the Neural Network's influence.
The ratio adjustment step is proportional:
$$ \mathrm{step} = \max(\mathrm{Ratio} \times 0.1, 0.01) $$
The $\mathrm{Ratio}$ is incremented by $\mathrm{step}$ if the AI won, and decremented by $\mathrm{step}$ if the AI lost.

#### Dynamic Learning Rate (LR)

Similarly, the neural network's learning rate ($\eta$) adapts based on performance. If the AI wins consecutive games, it is performing well and the learning rate is reduced ($\eta_\mathrm{new} = \eta_\mathrm{old} \times 0.99$) to fine-tune the weights without drastically changing them. If it loses or draws, the learning rate is increased ($\eta_\mathrm{new} = \eta_\mathrm{old} \times 1.01$) to encourage faster adaptation and plasticity.

#### Scoremap Visualization

When `Show Scoremap` is enabled, every empty cell on the board is temporarily played, evaluated by the engine, and then reverted. The resulting scores are normalized for visual heat-mapping.
To prevent the colors from looking too deep, the algorithm calculates the absolute maximum score ($\mathrm{absMax}$) and divides all scores by it. If all calculated moves are somewhat mediocre ($\mathrm{absMax} < 0.75$), the $\mathrm{absMax}$ is artificially doubled so that after normalization, the highest score appears dull signifying a not-so-good move.

### AI Weight Quantization and Sharing

To allow users to store the neural network's learned behavior in local storage without generating massive JSON arrays of 32-bit floats, the weights are subjected to a custom uniform quantization algorithm. The resulting compressed model is a compact Unicode string.

The standard printable Unicode characters range from `0x20` (Space) up to `0xD800` (the start of the surrogate pairs). This yields a `RANGE` of exactly $55,264$ distinct integer values per character.

The algorithm calculates the global minimum (`min`) and maximum (`max`) of the entire weight array and determines a fixed scaling `step`:
$$ \mathrm{step} = \frac{\mathrm{max} - \mathrm{min}}{\mathrm{RANGE}} $$

Every floating-point weight $W_i$ is mapped into a base-55264 integer index, which is then mapped to its corresponding Unicode character:
$$ \mathrm{Char}_i = \texttt{String.fromCharCode}\left( \left\lfloor \frac{W_i - \mathrm{min}}{\mathrm{step}} \right\rfloor + \text{0x20} \right) $$

To allow decompression later, the `min` and `step` values (two 32-bit floats) are packed into a single 64-bit header. That 64-bit integer is subsequently divided down by $55,264$ and written out as the first characters of the string. The rest of the string represents the array of weights.

---

**Note**: This documentation was generated with AI from the codebase. It has been manually verified and edited for correctness.
