document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('tetris');
    const ctx = canvas.getContext('2d');
    const nextCanvas = document.getElementById('next');
    const nextCtx = nextCanvas.getContext('2d');
    const scoreElement = document.getElementById('score');
    const levelElement = document.getElementById('level');
    const powerUpsElement = document.getElementById('power-ups');
    
    // Scale the canvas
    ctx.scale(30, 30);
    nextCtx.scale(20, 20);
    
    // Game speed configuration
    const SPEED = {
        INITIAL_DROP_INTERVAL: 1000,  // Normal speed (ms between drops)
        LEVEL_SPEED_INCREMENT: 100,   // How much faster each level (ms reduction)
        MINIMUM_INTERVAL: 100,        // Fastest possible speed
        SOFT_DROP_MULTIPLIER: 0.2,    // Soft drop speed (fraction of normal speed)
        SLOW_TIME_MULTIPLIER: 2,      // How much slow power-up reduces speed
        SLOW_TIME_DURATION: 10000     // How long slow power-up lasts (ms)
    };

    // Game state
    let score = 0;
    let level = 1;
    let lines = 0;
    let dropCounter = 0;
    let dropInterval = SPEED.INITIAL_DROP_INTERVAL;
    let lastTime = 0;
    let gameOver = false;
    let activePowerUps = [];
    
    // Board setup
    const board = createMatrix(12, 20);
    const borderColor = '#555';
    
    // Player setup
    const player = {
        pos: {x: 0, y: 0},
        matrix: null,
        next: null
    };
    
    // Power-up types
    const POWER_UPS = {
        CLEAR_ROW: {name: 'Row Clear', scoreThreshold: 500, active: false},
        CLEAR_COL: {name: 'Column Clear', scoreThreshold: 1000, active: false},
        SLOW_TIME: {name: 'Slow Time', scoreThreshold: 1500, active: false},
        EXTRA_POINTS: {name: 'Double Points', scoreThreshold: 2000, active: false}
    };
    
    // Tetrimino pieces
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
        '#FF0D72', // I
        '#0DC2FF', // J
        '#0DFF72', // L
        '#F538FF', // O
        '#FF8E0D', // S
        '#FFE138', // T
        '#3877FF'  // Z
    ];
    
    // Power-up colors
    const powerUpColors = {
        CLEAR_ROW: '#FF0000',
        CLEAR_COL: '#00FF00',
        SLOW_TIME: '#0000FF',
        EXTRA_POINTS: '#FFFF00'
    };
    
    // Initialize game
    function init() {
        playerReset();
        updateScore();
        updateLevel();
        updatePowerUps();
    }
    
    // Create matrix for board
    function createMatrix(w, h) {
        const matrix = [];
        while (h--) {
            matrix.push(new Array(w).fill(0));
        }
        return matrix;
    }
    
    // Create piece
    function createPiece(type) {
        return pieces[type];
    }
    
    // Draw the matrix (board or piece)
    function drawMatrix(matrix, offset, ctx, isPowerUp = false) {
        matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    if (isPowerUp) {
                        ctx.fillStyle = powerUpColors[value] || '#FFFFFF';
                    } else {
                        ctx.fillStyle = colors[value];
                    }
                    ctx.fillRect(x + offset.x, y + offset.y, 1, 1);
                    
                    // Add border to each block
                    ctx.strokeStyle = '#000';
                    ctx.lineWidth = 0.03;
                    ctx.strokeRect(x + offset.x, y + offset.y, 1, 1);
                }
            });
        });
    }
    
    // Draw the game board with borders
    function draw() {
        // Clear the canvas
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw the game board with borders
        drawMatrix(board, {x: 0, y: 0}, ctx);
        
        // Draw the player piece
        drawMatrix(player.matrix, player.pos, ctx);
        
        // Draw borders
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 0.1;
        
        // Outer border
        ctx.strokeRect(0, 0, 10, 20);
        
        // Inner grid lines
        for (let i = 1; i < 10; i++) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, 20);
            ctx.stroke();
        }
        
        for (let i = 1; i < 20; i++) {
            ctx.beginPath();
            ctx.moveTo(0, i);
            ctx.lineTo(10, i);
            ctx.stroke();
        }
    }
    
    // Draw the next piece preview
    function drawNext() {
        nextCtx.fillStyle = '#111';
        nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
        
        if (player.next) {
            // Center the piece in the preview
            const offsetX = (6 - player.next[0].length) / 2;
            const offsetY = (6 - player.next.length) / 2;
            drawMatrix(player.next, {x: offsetX, y: offsetY}, nextCtx);
        }
    }
    
    // Merge the player piece with the board
    function merge() {
        player.matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    board[y + player.pos.y][x + player.pos.x] = value;
                }
            });
        });
    }
    
    // Rotate the player piece
    function rotate(matrix, dir) {
        for (let y = 0; y < matrix.length; ++y) {
            for (let x = 0; x < y; ++x) {
                [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
            }
        }
        
        if (dir > 0) {
            matrix.forEach(row => row.reverse());
        } else {
            matrix.reverse();
        }
    }
    
    // Check for collisions
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
    
    // Move the player piece
    function playerMove(dir) {
        player.pos.x += dir;
        if (collide()) {
            player.pos.x -= dir;
        }
    }
    
    // Rotate the player piece
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
    
    // Reset player position and get next piece
    function playerReset() {
        if (!player.next) {
            player.next = createPiece(Math.floor(Math.random() * pieces.length));
        }
        
        player.matrix = player.next;
        player.next = createPiece(Math.floor(Math.random() * pieces.length));
        player.pos.y = 0;
        player.pos.x = (board[0].length / 2 | 0) - (player.matrix[0].length / 2 | 0);
        
        drawNext();
        
        if (collide()) {
            gameOver = true;
            alert('Game Over! Your score: ' + score);
            resetGame();
        }
    }
    
    // Drop the player piece
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
    
    // Hard drop
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
    
    // Soft drop
    function playerSoftDrop() {
        player.pos.y++;
        if (collide()) {
            player.pos.y--;
            merge();
            playerReset();
            arenaSweep();
            updateScore();
        }
        dropCounter = dropInterval * SPEED.SOFT_DROP_MULTIPLIER;
    }
    
    // Clear completed lines and add score
    function arenaSweep() {
        let linesCleared = 0;
        outer: for (let y = board.length - 1; y >= 0; --y) {
            for (let x = 0; x < board[y].length; ++x) {
                if (board[y][x] === 0) {
                    continue outer;
                }
            }
            
            // Remove the line
            const row = board.splice(y, 1)[0].fill(0);
            board.unshift(row);
            ++y;
            
            linesCleared++;
        }
        
        if (linesCleared > 0) {
            // Calculate score
            const linePoints = [0, 40, 100, 300, 1200];
            let points = linePoints[linesCleared] * level;
            
            // Check for double points power-up
            if (activePowerUps.includes('EXTRA_POINTS')) {
                points *= 2;
            }
            
            score += points;
            lines += linesCleared;
            
            // Level up every 10 lines
            if (lines >= level * 10) {
                level++;
                dropInterval = Math.max(SPEED.MINIMUM_INTERVAL, dropInterval - SPEED.LEVEL_SPEED_INCREMENT);
                updateLevel();
            }
            
            // Check for power-ups
            checkPowerUps();
        }
    }
    
    // Update score display
    function updateScore() {
        scoreElement.textContent = score;
    }
    
    // Update level display
    function updateLevel() {
        levelElement.textContent = level;
    }
    
    // Check if player earned any power-ups
    function checkPowerUps() {
        const newPowerUps = [];
        
        for (const [key, powerUp] of Object.entries(POWER_UPS)) {
            if (score >= powerUp.scoreThreshold && !activePowerUps.includes(key)) {
                newPowerUps.push(key);
                activePowerUps.push(key);
            }
        }
        
        if (newPowerUps.length > 0) {
            updatePowerUps();
            
            // Visual effect for new power-up
            const powerUpNames = newPowerUps.map(pu => POWER_UPS[pu].name).join(', ');
            showPowerUpMessage(`New Power-up: ${powerUpNames}!`);
        }
    }
    
    // Show power-up message
    function showPowerUpMessage(message) {
        const msgElement = document.createElement('div');
        msgElement.textContent = message;
        msgElement.style.position = 'absolute';
        msgElement.style.top = '50%';
        msgElement.style.left = '50%';
        msgElement.style.transform = 'translate(-50%, -50%)';
        msgElement.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        msgElement.style.color = 'white';
        msgElement.style.padding = '20px';
        msgElement.style.borderRadius = '10px';
        msgElement.style.zIndex = '100';
        msgElement.style.fontSize = '24px';
        msgElement.style.textAlign = 'center';
        
        document.body.appendChild(msgElement);
        
        setTimeout(() => {
            document.body.removeChild(msgElement);
        }, 2000);
    }
    
    // Update power-ups display
    function updatePowerUps() {
        if (activePowerUps.length === 0) {
            powerUpsElement.textContent = 'None';
            return;
        }
        
        const powerUpNames = activePowerUps.map(pu => POWER_UPS[pu].name);
        powerUpsElement.textContent = powerUpNames.join(', ');
    }
    
    // Use a power-up
    function usePowerUp(powerUp) {
        if (!activePowerUps.includes(powerUp)) return;
        
        switch (powerUp) {
            case 'CLEAR_ROW':
                clearRandomRow();
                break;
            case 'CLEAR_COL':
                clearRandomColumn();
                break;
            case 'SLOW_TIME':
                slowTime();
                break;
            // EXTRA_POINTS is passive and doesn't need activation
        }
        
        // Remove the power-up after use
        activePowerUps = activePowerUps.filter(pu => pu !== powerUp);
        updatePowerUps();
    }
    
    // Clear a random row
    function clearRandomRow() {
        const row = Math.floor(Math.random() * board.length);
        board[row].fill(0);
        showPowerUpMessage('Row cleared!');
    }
    
    // Clear a random column
    function clearRandomColumn() {
        const col = Math.floor(Math.random() * board[0].length);
        for (let row = 0; row < board.length; row++) {
            board[row][col] = 0;
        }
        showPowerUpMessage('Column cleared!');
    }
    
    // Slow down time
    function slowTime() {
        dropInterval *= SPEED.SLOW_TIME_MULTIPLIER;
        showPowerUpMessage('Time slowed!');
        
        setTimeout(() => {
            dropInterval /= SPEED.SLOW_TIME_MULTIPLIER;
        }, SPEED.SLOW_TIME_DURATION);
    }
    
    // Reset the game
    function resetGame() {
        // Clear the board
        for (let y = 0; y < board.length; y++) {
            for (let x = 0; x < board[y].length; x++) {
                board[y][x] = 0;
            }
        }
        
        // Reset game state
        score = 0;
        level = 1;
        lines = 0;
        dropInterval = SPEED.INITIAL_DROP_INTERVAL;
        activePowerUps = [];
        
        // Update displays
        updateScore();
        updateLevel();
        updatePowerUps();
        
        // Reset player
        playerReset();
        gameOver = false;
    }
    
    // Game loop
    function update(time = 0) {
        if (gameOver) return;
        
        const deltaTime = time - lastTime;
        lastTime = time;
        
        dropCounter += deltaTime;
        if (dropCounter > dropInterval) {
            playerSoftDrop();
        }
        
        draw();
        requestAnimationFrame(update);
    }
    
    // Keyboard controls
    document.addEventListener('keydown', event => {
        if (gameOver) return;
        
        switch (event.keyCode) {
            case 37: // Left arrow
                playerMove(-1);
                break;
            case 39: // Right arrow
                playerMove(1);
                break;
            case 40: // Down arrow
                playerSoftDrop();
                break;
            case 38: // Up arrow
                playerRotate(1);
                break;
            case 32: // Space
                playerHardDrop();
                break;
            case 49: // 1 - Use row clear
                usePowerUp('CLEAR_ROW');
                break;
            case 50: // 2 - Use column clear
                usePowerUp('CLEAR_COL');
                break;
            case 51: // 3 - Use slow time
                usePowerUp('SLOW_TIME');
                break;
        }
    });
    
    // Start the game
    init();
    update();
    
    // Touch controls for mobile
    let touchStartX = 0;
    let touchStartY = 0;
    
    canvas.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        e.preventDefault();
    }, false);
    
    canvas.addEventListener('touchmove', (e) => {
        if (!touchStartX || !touchStartY || gameOver) return;
        
        const touchEndX = e.touches[0].clientX;
        const touchEndY = e.touches[0].clientY;
        
        const dx = touchEndX - touchStartX;
        const dy = touchEndY - touchStartY;
        
        if (Math.abs(dx) > Math.abs(dy)) {
            if (dx > 0) {
                playerMove(1);
            } else {
                playerMove(-1);
            }
        } else {
            if (dy > 0) {
                playerSoftDrop();
            } else {
                playerRotate(1);
            }
        }
        
        touchStartX = touchEndX;
        touchStartY = touchEndY;
        e.preventDefault();
    }, false);
    
    canvas.addEventListener('touchend', (e) => {
        if (gameOver) return;
        playerHardDrop();
        e.preventDefault();
    }, false);
});
