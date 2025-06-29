class Minesweeper {
  grid = [];
  cols = 0;
  rows = 0;
  mines = [];
  start = true;
  mineDensity = 0;
  markedMines = 0;
  revealedSafe = 0;
  revealedMines = 0;

  gridDiv;

  endGameBlocker = (event) => {
    event.stopImmediatePropagation();
    event.preventDefault();
  };

  constructor(gridDiv) {
    this.gridDiv = gridDiv;
    this.filterDiv = gridDiv.querySelector(".filter");
  }

  initiateGrid(cols, rows, mineDensity) {
    this.start = true;
    this.grid.length = 0;
    this.mines.length = 0;
    this.markedMines = 0;
    this.revealedSafe = 0;
    this.revealedMines = 0;

    this.gridDiv.removeEventListener("click", this.endGameBlocker, true);
    this.gridDiv.removeEventListener("contextmenu", this.endGameBlocker, true);
    this.gridDiv.classList.remove("gameover", "win", "lose");

    this.rows = rows;
    this.cols = cols;
    this.mineDensity = mineDensity;

    const tiles = this.gridDiv.querySelectorAll(".tile");
    tiles.forEach((tile) => tile.remove());

    this.gridDiv.style.setProperty("--rows", rows);
    this.gridDiv.style.setProperty("--cols", cols);

    for (let r = 0; r < rows; r++) {
      this.grid[r] = [];
      for (let c = 0; c < cols; c++) {
        const tile = {
          row: r,
          col: c,
          mine: false,
          revealed: false,
          flagged: false,
          nearbyMines: 0,
          nearbyFlagged: 0,
          nearbyRevealedMines: 0,
        };

        const tileDiv = document.createElement("div");
        tile.div = tileDiv;
        tileDiv.classList.add("tile");

        tileDiv.dataset.row = r;
        tileDiv.dataset.col = c;
        tileDiv.style.gridRow = r + 1;
        tileDiv.style.gridColumn = c + 1;

        tileDiv.addEventListener("click", () => this.guessTile(r, c));
        tileDiv.addEventListener("contextmenu", (event) => {
          event.preventDefault();
          this.guessTile(r, c, true);
        });

        const tileText = document.createElement("div");
        tile.text = tileText;

        tileDiv.appendChild(tileText);
        this.gridDiv.appendChild(tileDiv);

        this.updateTileDiv(tile);
        this.grid[r][c] = tile;
      }
    }
  }

  guessTile(row, col, flag = false) {
    const tile = this.grid[row][col];

    if (this.start) {
      this.start = false;
      const mineCount = Math.min(
        Math.ceil(this.rows * this.cols * this.mineDensity),
        this.rows * this.cols - 1
      );
      this.placeMines(mineCount, tile);
    }

    if (tile.revealed) {
      if (!tile.mine) this.clearChunk(tile);
    } else if (flag || tile.flagged) {
      const wasFlagged = tile.flagged;
      tile.flagged = !tile.flagged;
      this.updateTileDiv(tile);

      for (const t of this.surroundingTiles(row, col)) {
        if (wasFlagged) t.nearbyFlagged--;
        else t.nearbyFlagged++;
      }

      if (!wasFlagged && tile.mine) this.markedMines++;
      else if (wasFlagged && tile.mine) this.markedMines--;
    } else {
      if (!tile.mine) {
        this.clearChunk(tile, true);
      } else {
        tile.revealed = true;
        this.revealedMines++;
        this.updateTileDiv(tile);
        for (const tile of this.surroundingTiles(row, col))
          tile.nearbyRevealedMines++;
      }
    }

    this.checkWin();
  }

  updateTileDiv(tile) {
    if (tile.flagged) {
      tile.div.style.setProperty("--colour", "var(--tile-flag)");
      tile.text.textContent = "⚑";
    } else if (!tile.revealed) {
      tile.div.style.setProperty("--colour", "var(--tile-unknown)");
      tile.text.textContent = "?";
    } else if (tile.mine) {
      tile.div.style.setProperty("--colour", "var(--tile-mine)");
      tile.text.textContent = "X";
    } else {
      tile.div.style.setProperty("--colour", "var(--tile-safe)");
      tile.text.textContent = tile.nearbyMines ? tile.nearbyMines : "";
    }
  }

  *surroundingTiles(row, col) {
    for (let r = row - 1; r <= row + 1; r++) {
      for (let c = col - 1; c <= col + 1; c++) {
        if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) continue;
        if (r === row && c === col) continue;
        yield this.grid[r][c];
      }
    }
  }

  clearChunk(startTile, zerosOnly = false) {
    const tilesToCheck = [startTile];
    const checked = new Set([startTile]);

    while (tilesToCheck.length > 0) {
      const tile = tilesToCheck.pop();

      if (tile.revealed && !startTile.revealed) continue;
      else if (!tile.revealed) {
        tile.revealed = true;

        if (!tile.mine) this.revealedSafe++;
        else {
          this.revealedMines++;
          for (const tile of this.surroundingTiles(
            startTile.row,
            startTile.col
          ))
            tile.nearbyRevealedMines++;
        }
      }
      this.updateTileDiv(tile);

      if (
        tile.nearbyFlagged + tile.nearbyRevealedMines === tile.nearbyMines ||
        tile.nearbyMines === 0
      ) {
        for (const t of this.surroundingTiles(tile.row, tile.col)) {
          if (
            (!t.flagged || (t.flagged && tile.nearbyMines === 0)) &&
            !checked.has(t) &&
            !t.revealed &&
            !(zerosOnly && tile.nearbyMines > 0)
          ) {
            if (t.flagged && tile.nearbyMines === 0) t.flagged = false;
            tilesToCheck.push(t);
            checked.add(t);
          }
        }
      }
    }
  }

  placeMines(amount, startingTile = { x: -1, y: -1 }) {
    const randomTiles = [];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const tile = this.grid[r][c];
        if (
          r !== startingTile.row &&
          c !== startingTile.col &&
          !tile.mine &&
          !tile.revealed
        )
          randomTiles.push([r, c]);
      }
    }

    for (let i = randomTiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [randomTiles[i], randomTiles[j]] = [randomTiles[j], randomTiles[i]];
    }

    const mineSet = new Set(
      randomTiles.slice(0, amount).map(([r, c]) => `${r},${c}`)
    );

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (mineSet.has(`${r},${c}`)) {
          this.grid[r][c].mine = true;
          this.mines.push([r, c]);

          for (const t of this.surroundingTiles(r, c)) {
            t.nearbyMines++;
          }
        }
      }
    }
  }

  checkWin() {
    const markedRevealedMines = this.markedMines + this.revealedMines;
    const win =
      markedRevealedMines === this.mines.length ||
      markedRevealedMines === this.totalTiles - this.revealedSafe - 1;
    const lose = this.revealedMines > 0;

    if (win || lose) {
      this.gridDiv.addEventListener("click", this.endGameBlocker, true);
      this.gridDiv.addEventListener("contextmenu", this.endGameBlocker, true);
      this.gridDiv.classList.add("gameover");
      if (win) this.gridDiv.classList.add("win");
      else this.gridDiv.classList.add("lose");
    }
  }

  get totalTiles() {
    return this.rows * this.cols;
  }
}

const ms = new Minesweeper(document.getElementById("grid"));

const rowsInput = document.getElementById("rows");
const colsInput = document.getElementById("cols");
const minesInput = document.getElementById("mines");
const startButton = document.getElementById("start");

function generateGrid() {
  ms.initiateGrid(rowsInput.value, colsInput.value, minesInput.value / 100);
}

function limitNumberInput(input) {
  input.value =
    localStorage.getItem(`rememberInput-${input.id}`, input.value) ||
    input.value;
  input.addEventListener("input", () => {
    input.value = Math.min(Math.max(input.value, input.min), input.max);
    localStorage.setItem(`rememberInput-${input.id}`, input.value);
  });
}

limitNumberInput(rowsInput);
limitNumberInput(colsInput);
limitNumberInput(minesInput);

startButton.onclick = generateGrid;
generateGrid();
