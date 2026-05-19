const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// ==========================================
// 1. MEMUAT ASET GAMBAR & AUDIO BGM
// ==========================================
const bgImg = new Image();
bgImg.src = "assets/pink.jpeg"; 

const birdImg = new Image();
birdImg.src = "assets/bird.png"; 

const pipeImg = new Image();
pipeImg.src = "assets/pipe.jpg"; 

const bgmMusic = new Audio("assets/bgm.mp3");
bgmMusic.loop = true;  
bgmMusic.volume = 0.4; 

// ==========================================
// 2. VARIABEL GAME & KONTROL
// ==========================================
const STATES = { START: 0, PLAYING: 1, GAMEOVER: 2 };
let gameState = STATES.START;
let isGameStarted = false; 
let score = 0;
let highScore = localStorage.getItem("gemoyHighScore") || 0;
let frameCount = 0;
const gameSpeed = 2.5;
let isMuted = false;
let bgX = 0; 
const bgSpeed = 0.5; 
let hasPlayedHighScoreSound = false; // Penanda agar suara highscore tidak bunyi terus-menerus

const btnWidth = 160;
const btnHeight = 45;
const startBtn = { x: canvas.width/2 - btnWidth/2, y: 380, w: btnWidth, h: btnHeight };
const retryBtn = { x: canvas.width/2 - btnWidth/2, y: 350, w: btnWidth, h: btnHeight };
const menuBtn  = { x: canvas.width/2 - btnWidth/2, y: 410, w: btnWidth, h: btnHeight };
const muteBtn  = { x: canvas.width - 55, y: 15, w: 40, h: 40 };

// ==========================================
// 3. EFEK SUARA (MP3)
// ==========================================
const jumpSound = new Audio("assets/jump.mp3");
const scoreSound = new Audio("assets/score.mp3");
const deathSound = new Audio("assets/death.mp3");      // Suara baru saat kalah
const highscoreSound = new Audio("assets/highscore.mp3"); // Suara baru saat pecah rekor

// Atur Volume (0.0 sampai 1.0)
jumpSound.volume = 0.8;
scoreSound.volume = 0.7;
deathSound.volume = 1.0;
highscoreSound.volume = 0.9;

function playSound(type) {
    if (isMuted) return;
    try {
        let s;
        if (type === "jump") s = jumpSound;
        else if (type === "score") s = scoreSound;
        else if (type === "death") s = deathSound;
        else if (type === "highscore") s = highscoreSound;

        if (s) {
            s.currentTime = 0;
            s.play().catch(e => console.log("Audio play ditunda:", e));
        }
    } catch (e) {
        console.log("Gagal memutar suara:", e);
    }
}

// ==========================================
// 4. BURUNG GEMOY
// ==========================================
const bird = {
    x: 60, y: 240, width: 45, height: 32,
    gravity: 0.35, velocity: 0, jump: -6,

    update: function() {
        if (gameState === STATES.PLAYING) {
            if (isGameStarted) {
                this.velocity += this.gravity;
                this.y += this.velocity;
            } else {
                this.y = 240 + Math.sin(frameCount * 0.1) * 10;
            }
        } else if (gameState === STATES.START) {
            this.y = 200 + Math.sin(frameCount * 0.1) * 10;
        }
    },

    draw: function() {
        ctx.save();
        if (gameState === STATES.PLAYING || gameState === STATES.GAMEOVER) {
            ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
            if (isGameStarted) {
                ctx.rotate(Math.min(Math.max(this.velocity * 0.05, -0.4), 0.8));
            }
            if (birdImg.complete) ctx.drawImage(birdImg, -this.width / 2, -this.height / 2, this.width, this.height);
        } else {
            if (birdImg.complete) ctx.drawImage(birdImg, this.x, this.y, this.width, this.height);
        }
        ctx.restore();
    }
};

// ==========================================
// 5. SISTEM PIPA TUNGGAL
// ==========================================
let pipes = [];
function spawnPipe() {
    let celahTinggi = 140; 
    let minCelahY = 150;
    let maxCelahY = canvas.height - 230;
    let celahY = Math.floor(Math.random() * (maxCelahY - minCelahY)) + minCelahY;
    pipes.push({ x: canvas.width, celahY: celahY, celahTinggi: celahTinggi, width: 65, passed: false });
}

function updateAndDrawPipes() {
    if (gameState === STATES.PLAYING && isGameStarted) {
        if (frameCount % 100 === 0) spawnPipe();
    }
    
    for (let i = pipes.length - 1; i >= 0; i--) {
        if (gameState === STATES.PLAYING && isGameStarted) pipes[i].x -= gameSpeed;
        
        let p = pipes[i];
        let pipaAtasBottom = p.celahY - (p.celahTinggi / 2);
        let pipaBawahTop = p.celahY + (p.celahTinggi / 2);
        
        if (pipeImg.complete) {
            ctx.save();
            ctx.translate(p.x, pipaAtasBottom);
            ctx.scale(1, -1);
            ctx.drawImage(pipeImg, 0, 0, p.width, pipaAtasBottom);
            ctx.restore();
            ctx.drawImage(pipeImg, p.x, pipaBawahTop, p.width, canvas.height - pipaBawahTop);
        }

        if (gameState === STATES.PLAYING) {
            if (bird.x + bird.width > p.x && bird.x < p.x + p.width) {
                if (bird.y < pipaAtasBottom || bird.y + bird.height > pipaBawahTop) {
                    triggerGameOver();
                }
            }

            if (!p.passed && p.x + (p.width / 2) < bird.x) {
                score++; 
                p.passed = true;
                
                // Logika Suara Skor & Highscore
                if (score > highScore && highScore > 0 && !hasPlayedHighScoreSound) {
                    playSound("highscore");
                    hasPlayedHighScoreSound = true;
                } else {
                    playSound("score");
                }

                if (score > highScore) { 
                    highScore = score; 
                    localStorage.setItem("gemoyHighScore", highScore); 
                }
            }
        }
        if (gameState === STATES.PLAYING && p.x + p.width < 0) pipes.splice(i, 1);
    }
}

// ==========================================
// 6. FUNGSI HELPER
// ==========================================
function triggerGameOver() {
    if (gameState !== STATES.GAMEOVER) {
        gameState = STATES.GAMEOVER;
        bgmMusic.pause();
        bgmMusic.currentTime = 0;
        playSound("death");
    }
}

function drawWorld() {
    if (gameState === STATES.PLAYING && isGameStarted) {
        bgX -= bgSpeed;
        if (bgX <= -canvas.width) bgX = 0; 
    }
    if (bgImg.complete) {
        ctx.drawImage(bgImg, bgX, 0, canvas.width, canvas.height);
        ctx.drawImage(bgImg, bgX + canvas.width, 0, canvas.width, canvas.height);
    }
}

function drawButton(btn, text, bgColor) {
    ctx.fillStyle = bgColor;
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 20); 
    ctx.fill(); ctx.stroke();
    ctx.font = "20px 'Fredoka', sans-serif";
    ctx.fillStyle = "#FFF";
    ctx.textAlign = "center";
    ctx.fillText(text, btn.x + btn.w/2, btn.y + 28);
}

function drawUI() {
    ctx.textAlign = "center";
    if (gameState === STATES.START) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
        ctx.beginPath(); ctx.roundRect(muteBtn.x, muteBtn.y, muteBtn.w, muteBtn.h, 12); ctx.fill();
        ctx.font = "22px Arial";
        ctx.fillText(isMuted ? "🔇" : "🔊", muteBtn.x + muteBtn.w/2, muteBtn.y + 28);
        ctx.font = "46px 'Fredoka', sans-serif";
        ctx.fillStyle = "#ff5c8a"; ctx.strokeStyle = "#fff"; ctx.lineWidth = 6;
        ctx.strokeText("Flappy Gemoy", canvas.width/2, 150);
        ctx.fillText("Flappy Gemoy", canvas.width/2, 150);
        ctx.font = "18px 'Fredoka', sans-serif";
        ctx.fillStyle = "#000";
        ctx.fillText(" Skor Tertinggi: " + highScore + " ", canvas.width/2, 280);
        drawButton(startBtn, "Mulai!", "#ff8fab");
    } else if (gameState === STATES.PLAYING) {
        ctx.font = "60px 'Fredoka', sans-serif";
        ctx.fillStyle = "#fff"; ctx.strokeStyle = "#7d31a6"; ctx.lineWidth = 5;
        ctx.strokeText(score, canvas.width/2, 80);
        ctx.fillText(score, canvas.width/2, 80);
        if (!isGameStarted) {
            ctx.font = "20px 'Fredoka', sans-serif";
            ctx.fillStyle = "#ff4d6d"; ctx.strokeStyle = "#fff"; ctx.lineWidth = 4;
            ctx.strokeText(" Tekan SPASI untuk Terbang!", canvas.width / 2, canvas.height / 2 + 50);
            ctx.fillText(" Tekan SPASI untuk Terbang!", canvas.width / 2, canvas.height / 2 + 50);
        }
    } else if (gameState === STATES.GAMEOVER) {
        ctx.font = "40px 'Fredoka', sans-serif";
        ctx.fillStyle = "#ff5c8a"; ctx.strokeStyle = "#fff"; ctx.lineWidth = 6;
        ctx.strokeText("Aww, Jatuh! 😭", canvas.width/2, 180);
        ctx.fillText("Aww, Jatuh! 😭", canvas.width/2, 180);
        ctx.font = "22px 'Fredoka', sans-serif";
        ctx.fillStyle = "#000";
        ctx.fillText("Skor Akhir: " + score, canvas.width/2, 240);
        drawButton(retryBtn, "Coba Lagi Yuk ", "#ff8fab");
        drawButton(menuBtn, "Balik Menu ", "#fb6f92");
    }
}

// ==========================================
// 7. INPUT HANDLING
// ==========================================
function isClick(m, btn) { return (m.x >= btn.x && m.x <= btn.x + btn.w && m.y >= btn.y && m.y <= btn.y + btn.h); }

canvas.addEventListener("click", function(e) {
    const rect = canvas.getBoundingClientRect();
    const mouse = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    if (gameState === STATES.START && isClick(mouse, muteBtn)) {
        isMuted = !isMuted;
        isMuted ? bgmMusic.pause() : bgmMusic.play().catch(() => {});
        return;
    }
    if (gameState === STATES.START && isClick(mouse, startBtn)) { 
        gameState = STATES.PLAYING; resetGame(); 
        if (!isMuted) { bgmMusic.currentTime = 0; bgmMusic.play().catch(() => {}); }
    } else if (gameState === STATES.PLAYING) {
        isGameStarted = true; bird.velocity = bird.jump; playSound("jump");
    } else if (gameState === STATES.GAMEOVER) {
        if (isClick(mouse, retryBtn)) { 
            gameState = STATES.PLAYING; resetGame(); 
            if (!isMuted) { bgmMusic.currentTime = 0; bgmMusic.play().catch(() => {}); }
        }
        if (isClick(mouse, menuBtn)) gameState = STATES.START;
    }
});

document.addEventListener("keydown", (e) => {
    if (e.code === "Space" && gameState === STATES.PLAYING) {
        isGameStarted = true; bird.velocity = bird.jump; playSound("jump");
    }
});

function resetGame() {
    bird.y = 240; bird.velocity = 0; pipes = []; score = 0; bgX = 0;
    isGameStarted = false; hasPlayedHighScoreSound = false; 
}

// ==========================================
// 8. LOOP UTAMA
// ==========================================
function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawWorld(); bird.update(); updateAndDrawPipes();
    if (gameState === STATES.PLAYING && isGameStarted) {
        if (bird.y + bird.height >= canvas.height - 90) {
            bird.y = canvas.height - 90 - bird.height;
            triggerGameOver();
        }
        if (bird.y < 0) bird.y = 0;
    }
    bird.draw(); drawUI(); frameCount++;
    requestAnimationFrame(loop);
}
setTimeout(loop, 100);