# Tic Tac Fish

Welcome to **Tic Tac Fish**, an advanced, customizable version of the classic Tic-Tac-Toe game! It features adjustable board sizes, variable win conditions, an AI you can train or play against, and even a Connect-4 mode!

This guide will walk you through all the features and controls available in the game so you can customize your experience exactly how you want it.

## How to Play & Controls

Here is a breakdown of all the controls available in the Game Configuration menu:

### Game Setup
* **Board Size**: Change the size of the grid. You can play on the classic 3x3 board, or expand it all the way up to a massive 15x15 grid!
* **Win Condition**: Set how many pieces in a row (horizontally, vertically, or diagonally) you need to win. Want to play 5-in-a-row on a 10x10 board? You can do that here!
* **Connect 4**: Checking this box instantly transforms the game into a Connect-4 style game. The board size becomes 7x7, the win condition becomes 4, and pieces will "fall" to the bottom of the column you click, just like real Connect 4!
* **Setup / Done**: Click the "Setup" button to enter a custom editing mode. While in Setup mode, clicking on cells lets you place 'X' or 'O' pieces manually anywhere on the board (or remove them). This is great for setting up specific scenarios or puzzles! Click "Done" when you are finished setting up the board to resume normal play.
* **Reset**: Clears the board and restarts the current game completely from scratch.

### AI and Advanced Settings
* **AI Ratio**: This slider controls how "smart" the AI is by blending traditional heuristic logic with a Neural Network (NN). A ratio of `0` means it relies entirely on basic logic, while `1` means it relies fully on its learned neural network experience. Values in between blend the two approaches.
* **Update AI Ratio**: If checked, the AI Ratio will automatically adjust itself as you play and as the AI learns from wins and losses.
* **Train AI**: If checked, the AI learns from every finished game automatically, trying to get better over time. Leave this on to watch the AI adapt to your playstyle!
* **Show Scoremap**: Checking this turns the game board into a heat-map! Cells will light up green for good moves and red for bad moves based on what the AI thinks.
* **Auto AI**: When checked, the AI will automatically play its turn against you as soon as you make a move. The small text next to it shows how many "steps" or "thoughts" it takes per turn.
* **Run Analysis**: Click this to force the AI to analyze the current board state and find the absolute best move.

### More Options (The 3 Dots Menu)
Clicking the small three-dots button (`...`) opens a menu with some extra tools:
* **Undo**: Take back the very last move made.
* **Flip board**: Swaps all the pieces! Your pieces become the opponent's and vice-versa, and it swaps whose turn it is.
* **Load 3x3 AI**: Instantly loads a pre-trained AI specifically for the classic 3x3 mode so you can play against an experienced opponent immediately.
* **Download weights**: Saves the AI's current "brain" (neural network weights) as a file to your computer.
* **Upload weights**: Load a previously saved AI brain file back into the game.
* **Save to local storage**: Saves the AI's brain to your web browser so it remembers how to play even if you close the tab.
* **Load from local storage**: Loads the saved AI brain from your web browser.

Enjoy tweaking the settings and training your AI opponent to become a Tic Tac Fish master!
