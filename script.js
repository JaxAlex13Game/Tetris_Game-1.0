const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');
const scale = 30; // Size of each block
const rows = canvas.height / scale;
const columns = canvas.width / scale;
let score = 0;

// Create the game grid
const createGrid = (rows, columns) => Array.from({ length: rows }, () => Array(columns).fill(0));

let grid = createGrid(rows, columns);

// Tetromino shapes
const tetrominoes = {
  I: [[1, 1, 1, 1]],
  O: [[1, 1], [1, 1]],
  T: [[0, 1, 0], [1, 1, 1]],
  S: [[0, 1, 1], [1, 1, 0]],
  Z: [[1, 1, 0], [0, 1, 1]],
  J: [[1, 0, 0], [1, 1, 1]],
  L: [[0, 0, 1], [1, 1, 1]]
};

// Randomly select a tetromino
const randomTetromino = () => {
  const keys = Object.keys(tetrominoes);
  const randomKey = keys[Math.floor(Math.random() * keys.length)];
  return tetrominoes[randomKey];
};

let tetromino = randomTetromino();
let position = { x: Math.floor(columns / 2) - 1, y: 0 };

// Game tick variables
let lastTime = 0;
const dropInterval = 10000; // Tetromino drops every 1000ms (1 second)
let dropCounter = 0;

// Draw the grid and tetromino
const draw = () => {
  context.clearRect(0, 0, canvas.width, canvas.height);

  // Draw the grid
  grid.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) {
        context.fillStyle = 'blue';
        context.fillRect(x * scale, y * scale, scale, scale);
        context.strokeStyle = '#000';
        context.strokeRect(x * scale, y * scale, scale, scale);
      }
    });
  });

  // Draw the current tetromino
  tetromino.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) {
        context.fillStyle = 'red';
        context.fillRect((position.x + x) * scale, (position.y + y) * scale, scale, scale);
        context.strokeStyle = '#000';
        context.strokeRect((position.x + x) * scale, (position.y + y) * scale, scale, scale);
      }
    });
  });
};

// Move the tetromino down
const drop = () => {
  position.y++;
  if (collide()) {
    position.y--;
    merge();
    clearRows();
    tetromino = randomTetromino();
    position = { x: Math.floor(columns / 2) - 1, y: 0 };
    if (collide()) {
      alert('Game Over!');
      grid = createGrid(rows, columns);
      score = 0;
      document.getElementById('score').innerText = score;
    }
  }
};

// Check for collisions
const collide = () => {
  for (let y = 0; y < tetromino.length; y++) {
    for (let x = 0; x < tetromino[y].length; x++) {
      if (tetromino[y][x] && (grid[position.y + y] && grid[position.y + y][position.x + x]) !== 0) {
        return true;
      }
    }
  }
  return false;
};

// Merge the tetromino into the grid
const merge = () => {
  tetromino.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) {
        grid[position.y + y][position.x + x] = value;
      }
    });
  });
};

// Clear completed rows
const clearRows = () => {
  grid.forEach((row, y) => {
    if (row.every(cell => cell !== 0)) {
      grid.splice(y, 1);
      grid.unshift(Array(columns).fill(0));
      score += 10;
      document.getElementById('score').innerText = score;
    }
  });
};

// Handle keyboard input
document.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowLeft') {
    position.x--;
    if (collide()) position.x++;
  }
  if (event.key === 'ArrowRight') {
    position.x++;
    if (collide()) position.x--;
  }
  if (event.key === 'ArrowDown') {
    drop();
  }
  if (event.key === 'ArrowUp') {
    rotate();
  }
});

// Rotate the tetromino
const rotate = () => {
  const prev = tetromino;
  tetromino = tetromino[0].map((_, i) => tetromino.map(row => row[i])).reverse();
  if (collide()) {
    tetromino = prev;
  }
};

// Game loop
const update = (time = 0) => {
  const deltaTime = time - lastTime;
  lastTime = time;

  dropCounter += deltaTime;
  if (dropCounter > dropInterval) {
    drop();
    dropCounter = 0;
  }

  draw();
  requestAnimationFrame(update);
};

update();