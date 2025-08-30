// Variables 
        const player1 = document.getElementById('player1');
        const cloudPlayer = document.getElementById('cloudPlayer');
        const scoreElement = document.getElementById('score');
        const timeElement = document.getElementById('time');
        const comboElement = document.getElementById('combo');
        const comboMeter = document.getElementById('comboMeter');
        const victory = document.getElementById('victory');
        const gcwidth = document.querySelector('.game-container);
        
        
        let gameState = {
            score: 0,
            combo: 0,
            time: 60,
            //playerX: 375, // Posición horizontal del jugador
            playerX: (gcwidth.width/2),
            gameActive: true,
            keys: {},
            hearts: [], // Array para múltiples corazones cayendo
            lastHeartTime: 0,
            heartSpawnRate: 1500, // Milisegundos entre corazones
            comboTimer: 0,
            playerState: 'idle', // 'idle', 'running-left', 'running-right'
            animationTimeout: null
        };
        
        // CREAR CORAZÓN QUE CAE
        function createFallingHeart() {
            console.log('nuevo corazon')
            const heart = document.createElement('div');
            heart.classList.add('falling-heart');
            
            // Posición X aleatoria pero cerca de donde está la nube
            const cloudRect = cloudPlayer.getBoundingClientRect();
            const gameRect = document.querySelector('.game-world').getBoundingClientRect();
            const cloudRelativeX = cloudRect.left - gameRect.left;
            
            // Corazón cae desde la nube con un poco de variación
            const heartX = Math.max(20, Math.min(750, cloudRelativeX + Math.random() * 60 - 30));
            heart.style.left = heartX + 'px';
            
            // Duración de caída aleatoria
            const fallDuration = 3 + Math.random() * 2; // 3-5 segundos
            heart.style.animationDuration = fallDuration + 's';
            
            // Agregar al mundo y al array
            document.querySelector('.game-world').appendChild(heart);
            gameState.hearts.push({
                element: heart,
                x: heartX,
                startTime: Date.now(),
                duration: fallDuration * 1000,
                caught: false
            });
            
            // Remover corazón cuando termine la animación
            setTimeout(() => {
                if (heart.parentNode && !heart.caught) {
                    heart.remove();
                    // Remover del array
                    gameState.hearts = gameState.hearts.filter(h => h.element !== heart);
                    // Romper combo si no se atrapó
                    if (gameState.combo > 0) {
                        gameState.combo = 0;
                        comboElement.textContent = gameState.combo;
                        comboMeter.style.display = 'none';
                    }
                }
            }, fallDuration * 1000);
        }
        
        //  DETECTAR COLISIÓN JUGADOR-CORAZÓN
        function checkHeartCollisions() {
            const playerRect = {
                x: gameState.playerX,
                y: 520, // Posición Y fija del jugador
                width: 50,
                height: 50
            };
            //const playerRect = player1.getBoundingClientRect();
            
            gameState.hearts.forEach((heartData, index) => {
                if (heartData.caught) return;
                
                const elapsed = Date.now() - heartData.startTime;
                const progress = elapsed / heartData.duration;
                //const progress = Math.min(1, elapsed / heartData.duration);
                
                // Calcular posición Y actual del corazón
                const heartY = 140 + (460 * progress); // De 140px a 600px
                
                const heartRect = {
                    x: heartData.x,
                    y: heartY,
                    width: 25,
                    height: 25
                };
                //const heartRect = heartData.getBoundingClientRect();
                
                // Verificar colisión
                if (playerRect.x < heartRect.x + heartRect.width &&
                    playerRect.x + playerRect.width > heartRect.x &&
                    playerRect.y < heartRect.y + heartRect.height &&
                    playerRect.y + playerRect.height > heartRect.y) {
                    
                    // atrapado
                    catchHeart(heartData, index);
                }
            });
        }
        
        // ATRAPAR CORAZÓN
        function catchHeart(heartData, index) {
            heartData.caught = true;
            gameState.score++;
            gameState.combo++;
            
            // Actualizar UI
            scoreElement.textContent = gameState.score;
            comboElement.textContent = gameState.combo;
            
            // Efecto visual de puntuación
            showScorePopup(heartData.x, 200);
            
            // Mostrar combo meter si hay combo
            if (gameState.combo > 2) {
                comboMeter.style.display = 'block';
                document.getElementById('comboCount').textContent = gameState.combo;
            }
            
            // Efecto especial en el corazón
            heartData.element.style.transform = 'scale(2)';
            heartData.element.style.opacity = '0';
            
            setTimeout(() => {
                if (heartData.element.parentNode) {
                    heartData.element.remove();
                }
            }, 200);
            
            // Remover del array
            gameState.hearts.splice(index, 1);
            
            // Aumentar dificultad gradualmente
            if (gameState.score % 5 === 0 && gameState.heartSpawnRate > 800) {
                gameState.heartSpawnRate -= 100;
            }
            
            // Verificar victoria
            if (gameState.score >= 25) {
                endGame(true);
            }
        }
        
        // MOSTRAR POPUP DE PUNTUACIÓN
        function showScorePopup(x, y) {
            const popup = document.createElement('div');
            popup.classList.add('score-popup');
            popup.style.left = x + 'px';
            popup.style.top = y + 'px';
            popup.textContent = gameState.combo > 1 ? `+${gameState.combo}` : '+1';
            
            document.querySelector('.game-world').appendChild(popup);
            
            setTimeout(() => {
                if (popup.parentNode) {
                    popup.remove();
                }
            }, 1000);
        }
        
        // CAMBIAR ANIMACIÓN DEL JUGADOR
        function setPlayerAnimation(state) {
            if (gameState.playerState === state) return; // No cambiar si ya está en ese estado
            
            // Limpiar clases anteriores
            player1.classList.remove('running-left', 'running-right');
            
            // Limpiar timeout anterior
            if (gameState.animationTimeout) {
                clearTimeout(gameState.animationTimeout);
            }
            
            gameState.playerState = state;
            
            switch(state) {
                case 'running-right':
                    player1.classList.add('running-right');
                    break;
                case 'running-left':
                    player1.classList.add('running-left');
                    break;
                case 'idle':
                default:
                    // Volver al sprite frontal
                    player1.style.backgroundImage = "url('assets/BrynFont.png')";
                    break;
            }
        }
        
        // ACTUALIZAR POSICIÓN 
        function updatePlayerPosition() {
            if (!gameState.gameActive) return;
            
            let isMoving = false;
            let movingRight = false;
            let movingLeft = false;
            
            // Movimiento horizontal
            if (gameState.keys['a'] || gameState.keys['A'] || gameState.keys['ArrowLeft']) {
                gameState.playerX = Math.max(20, gameState.playerX - 5);
                isMoving = true;
                movingLeft = true;
                setPlayerAnimation('running-left');
            }
            if (gameState.keys['d'] || gameState.keys['D'] || gameState.keys['ArrowRight']) {
                gameState.playerX = Math.min(730, gameState.playerX + 5);
                isMoving = true;
                movingRight = true;
                setPlayerAnimation('running-right');
            }
            
            // IDLEEEEEE Para cuando papi no se mueve
            if (!isMoving && gameState.playerState !== 'idle') {
                // timer
                gameState.animationTimeout = setTimeout(() => {
                    setPlayerAnimation('idle');
                }, 100);
            }
            
            
            player1.style.left = gameState.playerX + 'px';
        }
        
        // LOOP PRINCIPAL 
        function gameLoop() {
            if (!gameState.gameActive) return;
            
            updatePlayerPosition();
            checkHeartCollisions();
            
            // Crear corazones 
            const now = Date.now();
            if (now - gameState.lastHeartTime > gameState.heartSpawnRate) {
                createFallingHeart();
                gameState.lastHeartTime = now;
            }
            
            requestAnimationFrame(gameLoop);
        }
        
        // TIMER 
        function startTimer() {
            const timer = setInterval(() => {
                if (!gameState.gameActive) {
                    clearInterval(timer);
                    return;
                }
                
                gameState.time--;
                timeElement.textContent = gameState.time;
                
                if (gameState.time <= 0) {
                    endGame(false);
                    clearInterval(timer);
                }
            }, 1000);
        }
        
        // TERMINAR JUEGO
        function endGame(isVictory) {
            gameState.gameActive = false;
            
            // Limpiar corazoness
            gameState.hearts.forEach(heartData => {
                if (heartData.element.parentNode) {
                    heartData.element.remove();
                }
            });
            
            document.getElementById('finalScore').textContent = gameState.score;
            
            if (isVictory) {
                victory.innerHTML = `
                    <div>🎉 Wonderful papiii you did it! 🎉</div>
                    <div style="margin: 10px 0; font-size: 12px;">
                        You catched all ${gameState.score} of my hearts!<br>
                        Max combo: ${Math.max(...[gameState.combo, 0])}x 🔥
                    </div>
                    <button onclick="restartGame()" style="
                        font-family: 'Press Start 2P'; 
                        padding: 10px 20px; 
                        background: var(--rosa-principal); 
                        color: white; 
                        border: none; 
                        border-radius: 10px; 
                        cursor: pointer;
                        font-size: 8px;
                        margin-top: 10px;
                    ">Play again</button>
                `;
            } else {
                victory.innerHTML = `
                    <div>⏰ Time's over! ⏰</div>
                    <div style="margin: 10px 0; font-size: 12px;">
                        You catched ${gameState.score} hearts out of 25 💕<br>
                        ${gameState.score >= 15 ? 'Well done!' : 'do better next time papi!'}
                    </div>
                    <button onclick="restartGame()" style="
                        font-family: 'Press Start 2P'; 
                        padding: 10px 20px; 
                        background: var(--rosa-principal); 
                        color: white; 
                        border: none; 
                        border-radius: 10px; 
                        cursor: pointer;
                        font-size: 8px;
                        margin-top: 10px;
                    ">Try Again</button>
                `;
            }
            
            victory.style.display = 'block';
        }
        
        // REINICIAR JUEGO
        function restartGame() {
            // limpiueza
            document.querySelectorAll('.falling-heart').forEach(heart => heart.remove());
            document.querySelectorAll('.score-popup').forEach(popup => popup.remove());
            
            // Reset
            gameState = {
                score: 0,
                combo: 0,
                time: 60,
                playerX: 375,
                gameActive: true,
                keys: {},
                hearts: [],
                lastHeartTime: 0,
                heartSpawnRate: 1500,
                comboTimer: 0,
                playerState: 'idle',
                animationTimeout: null
            };
            
            // Resetear UI
            scoreElement.textContent = '0';
            timeElement.textContent = '60';
            comboElement.textContent = '0';
            victory.style.display = 'none';
            comboMeter.style.display = 'none';
            
            
            player1.style.left = '375px';
            setPlayerAnimation('idle');
            
            
            gameLoop();
            startTimer();
        }
        
        // EVENT LISTENERS
                
        document.addEventListener('keyup', (e) => {
            gameState.keys[e.key] = false;
        });
        
    
        document.addEventListener('keydown', (e) => {
            if(['ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault();
            }
            gameState.keys[e.key] = true;
        });
        
        // starttt
        gameLoop();

        startTimer();
