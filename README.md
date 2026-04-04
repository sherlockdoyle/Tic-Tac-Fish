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

The codebase is built using Angular and TypeScript. The logic is separated into an AI engine, a basic neural network, and a quantization utility, while the visual layer handles the user interface.

### Game State and Engine

The game engine relies on a mathematical abstraction to stay fast. The parameters $N$ (grid size) and $K$ (win condition) define the rules. Connect 4 functions as a variant of the standard game, simply enforcing a "gravity" rule where placing a piece automatically falls to the lowest available space in that column.

To maintain extremely high performance during the deep analysis searches, the board state is packed into a 64-bit integer, known as a **bitboard**.
Since a cell can be empty, an 'X', or an 'O', it requires two bits. This limits the maximum board size to $32$ cells using a single 64-bit integer. However, thanks to BigInt support in modern JavaScript, operations on the bitboard can scale up to larger sizes while remaining highly optimized using bitwise shifts and masks.

Checking for a winner is accomplished elegantly through bitwise operations that scan the entire board for $K$ consecutive pieces horizontally, vertically, or diagonally in just a handful of iterations.

### Search Algorithm: Negamax and Transposition Table

The core search algorithm driving the AI is **Negamax**, a streamlined variant of Minimax. The Negamax algorithm recursively simulates future game states. It assumes both players are playing perfectly and attempts to maximize its own score while minimizing the opponent's.

To prune the search tree and vastly improve performance, **Alpha-Beta pruning** is used. If a move is found to be worse than a previously examined move, the engine stops exploring that branch.

Because many different sequences of moves can lead to the exact same board state, evaluating the same state repeatedly would be wasteful. To solve this, a **Transposition Table (TT)** is employed. The bitboard state acts as a unique key for the TT, which caches the depth analyzed, the score, and the best move found.
When checking the TT, the score can be an exact value, a lower bound, or an upper bound depending on whether Alpha-Beta pruning previously cut off the search.

When the search concludes, the optimal sequence of anticipated moves—the **Principal Variation (PV)**—is extracted by following the best moves cached in the Transposition Table.

### Heuristic Evaluation

When the search reaches its maximum depth limit before finding a definitive win or loss, it must estimate how favorable the position is. This is where the static heuristic evaluation function is used.

The heuristic iterates over all possible winning lines on the board. For any line that contains only one player's pieces and empty spaces (meaning it could still become a winning line), it calculates a score based on how close it is to $K$ pieces.

The formula for evaluating a single line is:
$$ S = \frac{5^{num}}{2^{floating}} $$

* $num$: The number of pieces the player has in that line. The score increases exponentially as the player gets closer to $K$.
* $floating$: Used primarily in Connect 4 mode, this counts how many empty cells in the line are "floating" (meaning they cannot be immediately played because the cells below them are also empty). A line requiring many floating pieces is much harder to complete, hence the penalty.

There are additional multipliers. For instance, if a player is just one piece away from winning ($num = K - 1$) and there are no floating pieces, the score is drastically multiplied to prioritize the immediate threat or win.

Finally, the total accumulated score is scaled down into a range between $-1$ and $1$ to match the output range of the neural network using a hyperbolic tangent function:
$$ Score_{final} = \tanh\left(\frac{S_{total}}{5^{K - 0.25}}\right) $$

### Neural Network

To supplement the rigid mathematical heuristic, a lightweight Neural Network (NN) is integrated. The architecture is straightforward:
* **Input Layer**: Size $N \times N$, where each cell is passed as $1$ (current player), $-1$ (opponent), or $0$ (empty). Symmetries of the board are considered to feed the network a canonical, simplified representation.
* **Hidden Layer**: Dynamically sized based on the board, using a leaky ReLU activation function.
* **Output Layer**: A single output node returning a value between $-1$ and $1$ using a $\tanh$ activation function, predicting the evaluation score.

The AI is capable of online training. During training, batches of board states generated during self-play or user matches are evaluated. The backpropagation algorithm updates the weights and biases using gradient descent to minimize the error between the network's prediction and the actual final outcome of the game ($1$ for a win, $-1$ for a loss, $0$ for a draw).

When the user selects an **AI Ratio** between $0$ and $1$, the final evaluation blends the two approaches:
$$ Score = Heuristic \times (1 - Ratio) + NN \times Ratio $$

### Quantization and Sharing

To allow users to easily download, upload, or save the neural network's learned weights, a quantization method is used to compress the floating-point arrays into compact strings.

The quantization process finds the minimum and maximum weight values and maps the range to printable Unicode characters. Because standard Unicode provides thousands of distinct characters, a high degree of precision can be maintained while aggressively compressing the byte size of the network's "brain", making it small enough to store in local browser storage or a compact JSON file.