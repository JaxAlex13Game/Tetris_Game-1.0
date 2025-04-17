document.addEventListener('DOMContentLoaded', () => {
    // Get canvas elements
    const canvas = document.getElementById('tetris');
    const nextPieceCanvas = document.getElementById('next-piece');
    
    // Check if canvases exist
    if (!canvas || !nextPieceCanvas) {
        console.error("Canvas elements not found!");
        return;
    }

    const ctx = canvas.getContext('2d');
    const nextPieceCtx = nextPieceCanvas.getContext('2d');
    const scoreElement = document.getElementById('score');
    const levelElement = document.getElementById('level');
    const linesElement = document.getElementById('lines');
    const startButton = document.getElementById('start-btn');

    // Scale the canvas
    ctx.scale(30, 30);
    nextPieceCtx.scale(20, 20);

    // Game state
    let score = 0;
    let level = 1;
    let lines = 0;
    let gameOver = false;
    let paused = false;
    let dropCounter = 0;
    let dropInterval = 1000;
    let lastTime = 0;
    let gameId = null;

    // Board (12 wide x 20 tall)
    const board = Array.from({length: 20}, () => Array(12).fill(0));

    // Player
    const player = {
        pos: {x: 0, y: 0},
        matrix: null,
        next: null,
        score: 0
    };

    // Tetrimino pieces with colors
    const pieces = [
        // I
        [
            [0, 0, 0, 0],
            [1, 1, 1, 1],
            [0, 0, 0, 0],
            [0, 0, 0, 0]
        ],
        // J
        [
            [1, 0, 0],
            [1, 1, 1],
            [0, 0, 0]
        ],
        // L
        [
            [0, 0, 1],
            [1, 1, 1],
            [0, 0, 0]
        ],
        // O
        [
            [1, 1],
            [1, 1]
        ],
        // S
        [
            [0, 1, 1],
            [1, 1, 0],
            [0, 0, 0]
        ],
        // T
        [
            [0, 1, 0],
            [1, 1, 1],
            [0, 0, 0]
        ],
        // Z
        [
            [1, 1, 0],
            [0, 1, 1],
            [0, 0, 0]
        ]
    ];

    // Colors for pieces
    const colors = [
        null,
        '#FF0D72', // I (pink)
        '#0DC2FF', // J (blue)
        '#0DFF72', // L (green)
        '#F538FF', // O (purple)
        '#FF8E0D', // S (orange)
        '#FFE138', // T (yellow)
        '#3877FF'  // Z (dark blue)
    ];

    // Initialize game
    function init() {
        resetGame();
        startButton.addEventListener('click', startGame);
        document.addEventListener('keydown', handleKeyPress);
        console.log("Game initialized");
    }

    function resetGame() {
        score = 0;
        level = 1;
        lines = 0;
        gameOver = false;
        updateScore();
        
        // Clear board
        for (let y = 0; y < board.length; y++) {
            for (let x = 0; x < board[y].length; x++) {
                board[y][x] = 0;
            }
        }
        
        // Reset player
        playerReset();
    }

    function startGame() {
        if (gameId) {
            cancelAnimationFrame(gameId);
        }
        resetGame();
        gameId = requestAnimationFrame(update);
        startButton.textContent = 'Restart Game';
    }

    function update(time = 0) {
        if (gameOver) {
            if (confirm(`Game Over! Score: ${score}\nPlay again?`)) {
                startGame();
            }
            return;
        }
        
        const deltaTime = time - lastTime;
        lastTime = time;
        
        if (!paused) {
            dropCounter += deltaTime;
            if (dropCounter > dropInterval) {
                playerDrop();
                dropCounter = 0;
            }
            
            draw();
        }
        
        gameId = requestAnimationFrame(update);
    }

    function draw() {
        // Clear main canvas
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw board
        for (let y = 0; y < board.length; y++) {
            for (let x = 0; x < board[y].length; x++) {
                if (board[y][x]) {
                    ctx.fillStyle = colors[board[y][x]];
                    ctx.fillRect(x, y, 1, 1);
                    ctx.strokeStyle = '#000';
                    ctx.lineWidth = 0.05;
                    ctx.strokeRect(x, y, 1, 1);
                }
            }
        }
        
        // Draw current piece
        if (player.matrix) {
            for (let y = 0; y < player.matrix.length; y++) {
                for (let x = 0; x < player.matrix[y].length; x++) {
                    if (player.matrix[y][x]) {
                        ctx.fillStyle = colors[player.matrix[y][x]];
                        ctx.fillRect(x + player.pos.x, y + player.pos.y, 1, 1);
                        ctx.strokeStyle = '#000';
                        ctx.lineWidth = 0.05;
                        ctx.strokeRect(x + player.pos.x, y + player.pos.y, 1, 1);
                    }
                }
            }
        }
        
        // Draw next piece
        nextPieceCtx.fillStyle = '#111';
        nextPieceCtx.fillRect(0, 0, nextPieceCanvas.width, nextPieceCanvas.height);
        if (player.next) {
            for (let y = 0; y < player.next.length; y++) {
                for (let x = 0; x < player.next[y].length; x++) {
                    if (player.next[y][x]) {
                        nextPieceCtx.fillStyle = colors[player.next[y][x]];
                        nextPieceCtx.fillRect(x + 0.5, y + 0.5, 1, 1);
                    }
                }
            }
        }
    }

    function playerReset() {
        if (!player.next) {
            player.next = randomPiece();
        }
        player.matrix = player.next;
        player.next = randomPiece();
        player.pos.y = -2; // Start above the board
        player.pos.x = Math.floor((board[0].length - player.matrix[0].length) / 2);
        
        // Game over if collision immediately
        if (collide()) {
            gameOver = true;
        }
    }

    function playerDrop() {
        player.pos.y++;
        if (collide()) {
            player.pos.y--;
            merge();
            playerReset();
            arenaSweep();
            updateScore();
        }
        dropCounter = 0;
    }

    function playerMove(dir) {
        player.pos.x += dir;
        if (collide()) {
            player.pos.x -= dir;
        }
    }

    function playerRotate(dir) {
        const pos = player.pos.x;
        let offset = 1;
        rotate(player.matrix, dir);
        
        while (collide()) {
            player.pos.x += offset;
            offset = -(offset + (offset > 0 ? 1 : -1));
            if (offset > player.matrix[0].length) {
                rotate(player.matrix, -dir);
                player.pos.x = pos;
                return;
            }
        }
    }

    function rotate(matrix, dir) {
        // Transpose matrix
        for (let y = 0; y < matrix.length; ++y) {
            for (let x = 0; x < y; ++x) {
                [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
            }
        }
        
        // Reverse rows for clockwise rotation
        if (dir > 0) {
            matrix.forEach(row => row.reverse());
        } else {
            matrix.reverse();
        }
    }

    function collide() {
        const [m, o] = [player.matrix, player.pos];
        for (let y = 0; y < m.length; ++y) {
            for (let x = 0; x < m[y].length; ++x) {
                if (m[y][x] !== 0 &&
                    (board[y + o.y] === undefined ||
                    board[y + o.y][x + o.x] === undefined ||
                    board[y + o.y][x + o.x] !== 0)) {
                    return true;
                }
            }
        }
        return false;
    }

    function merge() {
        player.matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    board[y + player.pos.y][x + player.pos.x] = value;
                }
            });
        });
    }

    function arenaSweep() {
        let rowCount = 0;
        outer: for (let y = board.length - 1; y >= 0; --y) {
            for (let x = 0; x < board[y].length; ++x) {
                if (board[y][x] === 0) {
                    continue outer;
                }
            }
            
            const row = board.splice(y, 1)[0].fill(0);
            board.unshift(row);
            ++y;
            
            rowCount++;
        }
        
        if (rowCount > 0) {
            // Update score
            const points = [0, 40, 100, 300, 1200];
            score += points[rowCount] * level;
            lines += rowCount;
            
            // Level up every 10 lines
            level = Math.floor(lines / 10) + 1;
            
            // Increase speed
            dropInterval = 1000 / level;
        }
    }

    function updateScore() {
        scoreElement.textContent = score;
        levelElement.textContent = level;
        linesElement.textContent = lines;
    }

    function randomPiece() {
        const piece = pieces[Math.floor(Math.random() * pieces.length)];
        const pieceIndex = pieces.indexOf(piece) + 1;
        return piece.map(row => row.map(value => value ? pieceIndex : 0));
    }

    function handleKeyPress(e) {
        if (gameOver) return;
        
        switch (e.keyCode) {
            case 37: // Left
                playerMove(-1);
                break;
            case 39: // Right
                playerMove(1);
                break;
            case 40: // Down
                playerDrop();
                break;
            case 38: // Up
                playerRotate(1);
                break;
            case 32: // Space
                playerHardDrop();
                break;
            case 80: // P
                togglePause();
                break;
        }
    }

    function playerHardDrop() {
        while (!collide()) {
            player.pos.y++;
        }
        player.pos.y--;
        merge();
        playerReset();
        arenaSweep();
        updateScore();
    }

    function togglePause() {
        paused = !paused;
        if (paused) {
            startButton.textContent = 'Resume Game';
        } else {
            startButton.textContent = 'Restart Game';
            if (!gameOver) {
                gameId = requestAnimationFrame(update);
            }
        }
    }

    // Start the game
    init();
    draw();
});
