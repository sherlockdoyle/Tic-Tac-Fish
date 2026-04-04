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

The codebase is built using Angular and TypeScript. The underlying engine operates efficiently by packing board states into integers using bitwise math, relying on a basic neural network for dynamic evaluation, and utilizing a custom algorithm for quantization.

### Bitboard State Representation

To ensure the AI tree searches run fast, the board state is packed mathematically rather than using objects or multidimensional arrays. Each cell on the grid takes up 2 bits, representing Empty (`0b00`), X (`0b01`), or O (`0b10`).

Rather than using a fixed 64-bit integer—which would cap the grid size to 32 cells (a roughly 5x5 board)—the game leverages JavaScript's `BigInt` capability. The total number of bits required to store the board is $2 \times N^2$, where $N$ is the board size. A 15x15 board utilizes 450 bits, safely maintained within a single BigInt.

Positions are read or toggled using simple shifts and masks. For a position $pos$, the bits can be extracted by shifting the board down by $pos \times 2$:
```typescript
const p = BigInt(pos * 2);
const cell = (bitboard >> p) & CELL_MASK;
```

### Winner Calculation via Bitwise Operations

Finding a winner isn't done by slowly crawling through loops checking adjacent cells. Instead, winning lines are found by applying consecutive bitwise shifts.

To check if there are $K$ pieces in a row horizontally, the board is repeatedly bitwise AND-ed with itself, shifted by $2$ bits (one cell to the right). If there are $K$ consecutive pieces, the specific bit segment will survive $K-1$ shifts.
For vertical wins, the shift is $2 \times N$ bits (one entire row).
For diagonals and anti-diagonals, the shifts are $2 \times N + 2$ and $2 \times N - 2$, respectively.

Since Connect 4 boards logically "wrap" in memory but not physically, edge cases crossing row boundaries are handled by masking out the specific columns during the shift step:
```typescript
const rightMask = ~(colMask << adShift);
h &= (h >> 2n) & rightMask; // Shift horizontally, mask out the jump to the next row
```

### Move Sorting Optimization

During a depth-first search like Negamax, investigating the strongest moves early dramatically improves the efficiency of Alpha-Beta pruning, as it forces earlier cutoffs on worse branches.

When generating a list of legal moves, the engine prioritizes:
1. **The TT Best Move**: If a previous partial search found a best move, it is always considered first.
2. **Neighbors**: Cells adjacent to an already placed piece are highly preferred. To find adjacent cells extremely quickly across the entire board, the engine "smears" the occupied bits horizontally by shifting them right and left, and then vertically shifting that result. All cells caught in the "smear" are prioritized.
3. **Distance to Center**: Before the game begins, all coordinates on the board are pre-sorted based on their geometric distance to the center of the board, using $(x - center)^2 + (y - center)^2$. This naturally biases play towards controlling the center.

### Heuristic Evaluation

When the search stops and a definitive win is not found, the static heuristic assesses the raw strength of the board configuration. The heuristic iterates through all valid horizontal, vertical, and diagonal lines of length $K$.

If a line has a mix of X and O pieces, it's considered "blocked" and scores $0$.
If a line is uncontested (contains pieces for only one player and empty spaces), it is scored using an exponential formula that heavily rewards nearing a full connection, while penalizing lines with pieces that are "floating" (empty spaces requiring multiple moves in Connect 4 to fill underneath):

$$ S = \frac{5^{num}}{2^{floating}} $$

**Modifiers to the line score:**
* If $num = K - 1$ and there are no floating pieces, a player is 1 step away from an immediate win.
* In Tic Tac Toe, this threat is tripled: $S = S \times 3$.
* In Connect 4, a parity check is applied. Because pieces can only be played from the bottom up, an empty space on an *even* row from the bottom behaves very differently than an odd row depending on whose turn it is. If the row alignment matches the first-player advantage, the score is doubled: $S = S \times 2$. Otherwise, it gets a smaller bump: $S = S \times 1.25$.

The raw board score is a sum of these line evaluations. It is then normalized and squeezed into a $[-1, 1]$ range using a hyperbolic tangent to match the range of the neural network:
$$ Score_{final} = \tanh\left(\frac{S_{total}}{5^{K - 0.25}}\right) $$

### Transposition Table & Search Details

A Transposition Table (TT) caches explored board states so they aren't recalculated.
The TT stores:
* The depth evaluated.
* The score.
* The flag indicating what the score represents (`exact` if fully evaluated, `lower` if a cut-off occurred causing a lower bound, and `upper` for an upper bound).
* The best move found (used to extract the Principal Variation or PV).

### Neural Network (NN) Integration

The heuristic alone cannot fully grasp complex strategic setups or long-term sacrifices, so it is paired with a neural network.

* **Inputs**: The raw board configuration. X is passed as $1$, O as $-1$, and Empty as $0$. To accelerate learning, the board is canonicalized by rotating and flipping it through all 8 mathematical symmetries and passing the numerically smallest resulting board. This ensures structurally identical setups aren't learned twice.
* **Hidden Layer**: A single hidden layer using Leaky ReLU. The size dynamically scales up based on the inputs to ensure enough capacity for larger boards.
* **Output**: A single value passed through $\tanh$, projecting evaluation on the $[-1, 1]$ spectrum.

The network performs backpropagation using Gradient Descent. When a game completes, it takes the sequence of moves made and applies the win value to the loss function, shifting its weights and biases to more accurately score similar configurations in the future.

The user interface slider allows a blend of standard math logic versus neural network learned logic:
$$ Score_{blended} = Heuristic \times (1 - Ratio) + NN \times Ratio $$

### String Quantization

Rather than saving or sharing massive raw arrays of 32-bit floats, the weights of the AI are quantized into heavily compressed strings.
The system identifies the absolute minimum float and the maximum float in the network's layers. It then partitions this range into distinct slices based on the number of available printable characters in Unicode (`0x20` space up to `0xD800` surrogate ranges). This yields over $55,264$ distinct points of precision.

Each weight is converted into an integer index representing its "slice" and mapped to the corresponding Unicode character. A small header packs the `min` and `step` floats into the string, allowing rapid decompression when importing a saved model.