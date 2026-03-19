# Tic Tac Fish

Welcome to **Tic Tac Fish**, an advanced, customizable version of the classic Tic-Tac-Toe game! It features adjustable board sizes, variable win conditions, an AI you can train or play against, and even a Connect-4 mode!

This guide will walk you through all the features, controls, and visual indicators available in the game so you can customize your experience exactly how you want it.

## How to Play & Controls

Here is a comprehensive breakdown of all the controls, indicators, and shortcuts available in the game:

### Game Configuration Menu
* **Board Size**: Change the size of the grid. You can play on the classic 3x3 board, or expand it all the way up to a massive 15x15 grid!
* **Win Condition**: Set how many pieces in a row (horizontally, vertically, or diagonally) you need to win. Want to play 5-in-a-row on a 10x10 board? You can do that here!
* **Connect 4**: Checking this box instantly transforms the game into a Connect-4 style game. The board size defaults to 7x7, the win condition becomes 4, and pieces will "fall" to the bottom of the column you click, just like real Connect 4! (Note: The very top row of the grid is hidden in Connect 4 mode as it represents the "drop zone" above the board).
* **Setup / Done**: Click the "Setup" button to enter a custom editing mode. While in Setup mode, clicking on cells lets you place 'X' or 'O' pieces manually anywhere on the board, or click again to remove them. This is great for setting up specific scenarios or puzzles! Click "Done" when you are finished setting up the board to resume normal play.
* **Reset**: Clears the board and restarts the current game completely from scratch.

### AI and Advanced Settings
* **AI Ratio**: This slider controls how "smart" the AI is by blending traditional heuristic logic with a Neural Network (NN). A ratio of `0` means it relies entirely on basic logic, while `1` means it relies fully on its learned neural network experience. Values in between blend the two approaches. The current learning rate (AI LR) is shown above the analysis button.
* **Update AI Ratio**: If checked, the AI Ratio will automatically adjust itself as you play and as the AI learns from wins and losses.
* **Train AI**: If checked, the AI learns from every finished game automatically, trying to get better over time. Leave this on to watch the AI adapt to your playstyle!
* **Show Scoremap**: Checking this turns the game board into a heat-map! Cells will light up green for good moves and red for bad moves based on what the AI thinks.
* **Auto AI**: When checked, the AI will automatically play its turn against you as soon as you make a move. The small text next to it shows how many "steps" or "thoughts" it takes per turn.
* **Run Analysis**: Click this to force the AI to analyze the current board state and find the absolute best move.

### Info Section
* **Player Turn Indicator**: Located just below the settings, this tells you whose turn it is to play.
* **Flip Player**: You can click directly on the current player's symbol (e.g., the 'X' or 'O') in the info section to skip their turn and let the other player go.
* **Game Over Message**: Once a game concludes, this section will declare the winner (or a draw) and highlight the text in their respective colors.

### The Game Board & Analysis
* **Analysis Details**: Right above the board, you will see the `Analysis:` readout. If you have run an analysis, it will display the `Depth` (how many moves ahead the AI looked) and `Moves` (the sequence of best predicted moves, also known as the Principal Variation or PV).
* **Cell Numbers**: Each cell has a small number in the top-left corner indicating its index on the board.
* **Star Points (Dots)**: On larger boards (5x5 and up), you will see small dots next to some cell numbers. These are "star points" (borrowed from games like Go), which help you visually orient yourself on large grids.
* **Last Move Marker**: The most recently placed piece will have a subtle ring marker around its center so you can easily see what your opponent just did.
* **Best Move Indicator**: If you run an analysis, the AI's chosen best move will be highlighted with a glowing border and will pop out slightly.
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

Enjoy tweaking the settings and training your AI opponent to become a Tic Tac Fish master!
