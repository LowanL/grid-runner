// server-next.js — Custom server: Next.js + WebSocket on the same port
const { createServer } = require('http');
const { parse } = require('url');
const fs = require('fs');
const path = require('path');
const next = require('next');
const { WebSocketServer } = require('ws');
const os = require('os');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const PORT = process.env.PORT || 3000;

const app = next({ dev, hostname, port: PORT });
const handle = app.getRequestHandler();

// ─── Game constants ────────────────────────────────────────────────────────────
const GRID_COLS = 10;
const GRID_ROWS = 8;
const DEFAULT_ROUND_TIME = 8;

const QUESTIONS = [
  { text: "NE TOUCHEZ PAS LES CASES ROUGES", type: "avoid_color", dangerColor: "red" },
  { text: "NE TOUCHEZ PAS LES CASES BLEUES", type: "avoid_color", dangerColor: "blue" },
  { text: "NE TOUCHEZ PAS LES CASES VERTES", type: "avoid_color", dangerColor: "green" },
  { text: "2 + 2 = ?", type: "quiz", answers: ["3", "4", "5", "6"], correct: "4" },
  { text: "Capitale de la France ?", type: "quiz", answers: ["Londres", "Berlin", "Paris", "Rome"], correct: "Paris" },
  { text: "7 × 8 = ?", type: "quiz", answers: ["54", "56", "58", "64"], correct: "56" },
  { text: "Planète la plus proche du Soleil ?", type: "quiz", answers: ["Vénus", "Mercure", "Mars", "Terre"], correct: "Mercure" },
  { text: "√144 = ?", type: "quiz", answers: ["10", "11", "12", "14"], correct: "12" },
  { text: "RESTEZ SUR LES CASES PAIRES (colonnes 2,4,6,8,10)", type: "position", condition: "even_col" },
  { text: "RESTEZ SUR LES CASES IMPAIRES (colonnes 1,3,5,7,9)", type: "position", condition: "odd_col" },
  { text: "RESTEZ DANS LA MOITIÉ SUPÉRIEURE (lignes A-D)", type: "position", condition: "top_half" },
  { text: "RESTEZ DANS LA MOITIÉ INFÉRIEURE (lignes E-H)", type: "position", condition: "bottom_half" },
  { text: "Combien de continents ?", type: "quiz", answers: ["5", "6", "7", "8"], correct: "7" },
  { text: "Quelle couleur mélange rouge et bleu ?", type: "quiz", answers: ["Orange", "Vert", "Violet", "Marron"], correct: "Violet" },

  // Couleurs à éviter
  { text: "NE TOUCHEZ PAS LES CASES VIOLETTES", type: "avoid_color", dangerColor: "purple" },

  // Mathématiques
  { text: "3² + 4² = ?", type: "quiz", answers: ["20", "25", "30", "35"], correct: "25" },
  { text: "2³ = ?", type: "quiz", answers: ["6", "8", "9", "12"], correct: "8" },
  { text: "√81 = ?", type: "quiz", answers: ["7", "8", "9", "11"], correct: "9" },
  { text: "13 × 7 = ?", type: "quiz", answers: ["81", "89", "91", "97"], correct: "91" },
  { text: "15% de 200 = ?", type: "quiz", answers: ["20", "25", "30", "35"], correct: "30" },
  { text: "Combien de faces a un cube ?", type: "quiz", answers: ["4", "6", "8", "12"], correct: "6" },
  { text: "Combien de côtés a un hexagone ?", type: "quiz", answers: ["5", "6", "7", "8"], correct: "6" },

  // Géographie
  { text: "Capitale de l'Allemagne ?", type: "quiz", answers: ["Munich", "Berlin", "Hambourg", "Francfort"], correct: "Berlin" },
  { text: "Capitale de l'Espagne ?", type: "quiz", answers: ["Barcelone", "Valence", "Madrid", "Séville"], correct: "Madrid" },
  { text: "Capitale du Japon ?", type: "quiz", answers: ["Osaka", "Kyoto", "Tokyo", "Hiroshima"], correct: "Tokyo" },
  { text: "Capitale du Brésil ?", type: "quiz", answers: ["Rio", "São Paulo", "Brasilia", "Salvador"], correct: "Brasilia" },
  { text: "Quel est le plus grand océan ?", type: "quiz", answers: ["Atlantique", "Indien", "Arctique", "Pacifique"], correct: "Pacifique" },
  { text: "Combien de pays dans l'UE (2024) ?", type: "quiz", answers: ["24", "25", "27", "30"], correct: "27" },
  { text: "Sur quel continent est l'Égypte ?", type: "quiz", answers: ["Asie", "Afrique", "Europe", "Océanie"], correct: "Afrique" },
  { text: "Plus haute montagne du monde ?", type: "quiz", answers: ["K2", "Mont Blanc", "Everest", "Aconcagua"], correct: "Everest" },

  // Sciences
  { text: "Plus grande planète du système solaire ?", type: "quiz", answers: ["Saturne", "Jupiter", "Uranus", "Neptune"], correct: "Jupiter" },
  { text: "Combien d'os dans le corps humain adulte ?", type: "quiz", answers: ["196", "206", "216", "226"], correct: "206" },
  { text: "Formule chimique de l'eau ?", type: "quiz", answers: ["HO", "H2O", "H3O", "OH2"], correct: "H2O" },
  { text: "Vitesse de la lumière (km/s) ?", type: "quiz", answers: ["100 000", "200 000", "300 000", "400 000"], correct: "300 000" },
  { text: "Combien de chromosomes chez l'humain ?", type: "quiz", answers: ["42", "44", "46", "48"], correct: "46" },
  { text: "Quelle est la planète rouge ?", type: "quiz", answers: ["Vénus", "Jupiter", "Mars", "Saturne"], correct: "Mars" },

  // Histoire & Culture
  { text: "Année de la Révolution française ?", type: "quiz", answers: ["1789", "1791", "1799", "1804"], correct: "1789" },
  { text: "Qui a peint la Joconde ?", type: "quiz", answers: ["Michel-Ange", "Raphaël", "Léonard de Vinci", "Botticelli"], correct: "Léonard de Vinci" },
  { text: "Auteur des Misérables ?", type: "quiz", answers: ["Zola", "Balzac", "Victor Hugo", "Flaubert"], correct: "Victor Hugo" },
  { text: "Année du premier homme sur la Lune ?", type: "quiz", answers: ["1965", "1967", "1969", "1971"], correct: "1969" },

  // Sport
  { text: "Joueurs dans une équipe de football ?", type: "quiz", answers: ["9", "10", "11", "12"], correct: "11" },
  { text: "Joueurs dans une équipe de basketball ?", type: "quiz", answers: ["4", "5", "6", "7"], correct: "5" },
  { text: "Sets max en Grand Chelem (homme) ?", type: "quiz", answers: ["3", "4", "5", "7"], correct: "5" },
  { text: "Quel pays a inventé le judo ?", type: "quiz", answers: ["Chine", "Corée", "Japon", "Thaïlande"], correct: "Japon" },

  // Animaux
  { text: "Combien de pattes a une araignée ?", type: "quiz", answers: ["6", "8", "10", "12"], correct: "8" },
  { text: "Combien de cœurs a une pieuvre ?", type: "quiz", answers: ["1", "2", "3", "4"], correct: "3" },
  { text: "Plus grand mammifère marin ?", type: "quiz", answers: ["Requin baleine", "Dauphin", "Baleine bleue", "Orque"], correct: "Baleine bleue" },
  { text: "Animal terrestre le plus rapide ?", type: "quiz", answers: ["Lion", "Guépard", "Zèbre", "Autruche"], correct: "Guépard" },

  // Divers
  { text: "Quelle couleur mélange rouge et jaune ?", type: "quiz", answers: ["Violet", "Vert", "Orange", "Rose"], correct: "Orange" },
  { text: "Quelle couleur mélange bleu et jaune ?", type: "quiz", answers: ["Violet", "Vert", "Orange", "Turquoise"], correct: "Vert" },
  { text: "Combien de bits dans un octet ?", type: "quiz", answers: ["4", "8", "16", "32"], correct: "8" },
  { text: "Qui a fondé Microsoft ?", type: "quiz", answers: ["Steve Jobs", "Bill Gates", "Mark Zuckerberg", "Jeff Bezos"], correct: "Bill Gates" },
];

const MALUS_LIST = [
  { id: "freeze", label: "❄️ Gel",     desc: "Bloque un joueur 2 secondes" },
  { id: "swap",   label: "🔀 Swap",    desc: "Échange 2 joueurs aléatoires" },
  { id: "blind",  label: "🙈 Aveugle", desc: "Cache les joueurs 2 secondes" },
  { id: "slow",   label: "🐢 Ralenti", desc: "Ralentit les déplacements" },
];

const MALUS_COOLDOWN_ROUNDS = MALUS_LIST.length - 1; // 3

const EMOJIS = ['🚀','⚡','🔥','💎','🌟','👾','🎯','🏆','🦊','🐉','🌊','⚔️'];

// ─── Game state ────────────────────────────────────────────────────────────────
let gameState = {
  phase: 'lobby',
  players: {},
  grid: [],
  gridRows: GRID_ROWS,
  gridCols: GRID_COLS,
  currentQuestion: null,
  isColorQuestion: false,
  round: 0,
  timer: 0,
  timerInterval: null,
  roundTime: DEFAULT_ROUND_TIME,
  eliminatedThisRound: [],
  scores: {},
  winner: null,
  malusUsedThisRound: false,
  malusCooldowns: {},
  malusActivators: {},
  usedQuestions: [],
};

// Display (main screen) — only one allowed at a time
let displayWs = null;

function randomCellColor() {
  return ['red','blue','green','purple'][Math.floor(Math.random() * 4)];
}

function createGrid(shrink = 0) {
  const cols = Math.max(4, GRID_COLS - shrink * 2);
  const rows = Math.max(4, GRID_ROWS - shrink * 2);
  const grid = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      grid.push({ row: r, col: c, color: randomCellColor(), answer: null, safe: true });
  return { grid, rows, cols };
}

// Feature 1: shuffle array in place (Fisher-Yates)
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function computeSafeCells(question, grid, rows) {
  grid.forEach(cell => {
    if (question.type === 'avoid_color') {
      cell.safe = cell.color !== question.dangerColor;
    } else if (question.type === 'position') {
      const c = cell.col + 1;
      const r = cell.row;
      if (question.condition === 'even_col') cell.safe = c % 2 === 0;
      else if (question.condition === 'odd_col') cell.safe = c % 2 !== 0;
      else if (question.condition === 'top_half') cell.safe = r < Math.floor(rows / 2);
      else if (question.condition === 'bottom_half') cell.safe = r >= Math.floor(rows / 2);
    }
  });
}

function broadcast(data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === 1) client.send(msg);
  });
}

function broadcastState() {
  const cooldownInfo = {};
  MALUS_LIST.forEach(m => {
    const lastRound = gameState.malusCooldowns[m.id] || 0;
    const remaining = Math.max(0, MALUS_COOLDOWN_ROUNDS - (gameState.round - lastRound));
    cooldownInfo[m.id] = remaining;
  });

  broadcast({
    type: 'state',
    phase: gameState.phase,
    players: gameState.players,
    grid: gameState.grid,
    gridRows: gameState.gridRows,
    gridCols: gameState.gridCols,
    question: gameState.currentQuestion,
    isColorQuestion: gameState.isColorQuestion,
    round: gameState.round,
    timer: gameState.timer,
    eliminatedThisRound: gameState.eliminatedThisRound,
    scores: gameState.scores,
    winner: gameState.winner,
    roundTime: gameState.roundTime,
    totalPlayers: Object.values(gameState.players).filter(p => p.connected).length,
    alivePlayers: Object.values(gameState.players).filter(p => !p.eliminated && p.connected).length,
    malusUsedThisRound: gameState.malusUsedThisRound,
    malusCooldowns: cooldownInfo,
  });
}

function sendTo(ws, data) {
  if (ws.readyState === 1) ws.send(JSON.stringify(data));
}

function findWS(playerId) {
  for (const c of wss.clients)
    if (c.playerId === playerId && c.readyState === 1) return c;
  return null;
}

function startGame() {
  if (gameState.timerInterval) clearInterval(gameState.timerInterval);
  gameState.phase = 'countdown';
  gameState.round = 0;
  gameState.winner = null;
  gameState.eliminatedThisRound = [];
  gameState.malusUsedThisRound = false;
  gameState.malusCooldowns = {};
  gameState.malusActivators = {};
  gameState.isColorQuestion = false;
  gameState.usedQuestions = [];

  const { grid, rows, cols } = createGrid(0);
  gameState.grid = grid;
  gameState.gridRows = rows;
  gameState.gridCols = cols;

  const players = Object.values(gameState.players).filter(p => p.connected);
  const usedCells = new Set();
  players.forEach(p => {
    p.eliminated = false;
    p.frozenUntil = 0;
    p.slowUntil = 0;
    gameState.scores[p.id] = 0;
    let r, c;
    do {
      r = Math.floor(Math.random() * rows);
      c = Math.floor(Math.random() * cols);
    } while (usedCells.has(`${r},${c}`));
    usedCells.add(`${r},${c}`);
    p.row = r;
    p.col = c;
  });

  broadcastState();
  setTimeout(startRound, 3000);
}

function startRound() {
  const alive = Object.values(gameState.players).filter(p => !p.eliminated && p.connected);
  if (alive.length <= 1) { endGame(); return; }

  gameState.round++;
  gameState.eliminatedThisRound = [];
  gameState.malusUsedThisRound = false;
  gameState.malusActivators = {};

  const shrink = Math.min(Math.floor((gameState.round - 1) / 3), 3);
  const { grid, rows, cols } = createGrid(shrink);
  gameState.gridRows = rows;
  gameState.gridCols = cols;

  // No question yet — cells are neutral so players can locate themselves
  grid.forEach(cell => { cell.safe = true; cell.answer = null; });
  gameState.grid = grid;
  gameState.currentQuestion = null;
  gameState.isColorQuestion = false;

  Object.values(gameState.players).forEach(p => {
    if (!p.eliminated) {
      p.row = Math.min(p.row, rows - 1);
      p.col = Math.min(p.col, cols - 1);
    }
  });

  if (gameState.round === 1) {
    gameState.phase = 'placement';
    gameState.timer = 10;
    broadcastState();

    if (gameState.timerInterval) clearInterval(gameState.timerInterval);
    gameState.timerInterval = setInterval(() => {
      gameState.timer--;
      broadcastState();
      if (gameState.timer <= 0) {
        clearInterval(gameState.timerInterval);
        startQuestion();
      }
    }, 1000);
  } else {
    startQuestion();
  }
}

function startQuestion() {
  const alive = Object.values(gameState.players).filter(p => !p.eliminated && p.connected);
  if (alive.length <= 1) { endGame(); return; }

  let available = QUESTIONS.map((_, i) => i).filter(i => !gameState.usedQuestions.includes(i));
  if (available.length === 0) {
    gameState.usedQuestions = [];
    available = QUESTIONS.map((_, i) => i);
  }
  const qIdx = available[Math.floor(Math.random() * available.length)];
  gameState.usedQuestions.push(qIdx);
  const q = QUESTIONS[qIdx];
  gameState.currentQuestion = q;
  gameState.isColorQuestion = q.type === 'avoid_color';

  if (q.type === 'quiz') {
    const totalCells = gameState.grid.length;
    const answers = [];
    for (let i = 0; i < totalCells; i++) {
      answers.push(q.answers[i % q.answers.length]);
    }
    shuffle(answers);
    gameState.grid.forEach((cell, i) => {
      cell.answer = answers[i];
      cell.safe = cell.answer === q.correct;
    });
  } else {
    computeSafeCells(q, gameState.grid, gameState.gridRows);
  }

  gameState.phase = 'question';
  gameState.timer = gameState.roundTime;
  broadcastState();

  if (gameState.timerInterval) clearInterval(gameState.timerInterval);
  const tickMs = gameState.isColorQuestion ? 500 : 1000;
  gameState.timerInterval = setInterval(() => {
    gameState.timer--;
    broadcastState();
    if (gameState.timer <= 0) {
      clearInterval(gameState.timerInterval);
      eliminatePlayers();
    }
  }, tickMs);
}

function eliminatePlayers() {
  gameState.phase = 'eliminating';
  const eliminated = [];

  Object.values(gameState.players).forEach(p => {
    if (p.eliminated || !p.connected) return;
    const cell = gameState.grid.find(c => c.row === p.row && c.col === p.col);
    if (!cell || !cell.safe) {
      p.eliminated = true;
      eliminated.push(p.id);
      gameState.scores[p.id] = (gameState.scores[p.id] || 0) + (gameState.round - 1) * 10;

      const activatorId = gameState.malusActivators[p.id];
      if (activatorId && gameState.players[activatorId]) {
        gameState.scores[activatorId] = (gameState.scores[activatorId] || 0) + 150;
        const activatorWs = findWS(activatorId);
        if (activatorWs) sendTo(activatorWs, { type: 'malus_bonus', targetName: p.name, points: 150 });
      }
    } else {
      gameState.scores[p.id] = (gameState.scores[p.id] || 0) + 100 + gameState.timer * 5;
    }
  });

  gameState.eliminatedThisRound = eliminated;

  const cooldownInfo = {};
  MALUS_LIST.forEach(m => {
    const lastRound = gameState.malusCooldowns[m.id] || 0;
    const remaining = Math.max(0, MALUS_COOLDOWN_ROUNDS - (gameState.round - lastRound));
    cooldownInfo[m.id] = remaining;
  });

  eliminated.forEach(id => {
    const ws = findWS(id);
    if (ws) sendTo(ws, {
      type: 'eliminated',
      malusList: MALUS_LIST,
      malusCooldowns: cooldownInfo,
      malusUsedThisRound: gameState.malusUsedThisRound,
    });
  });

  broadcastState();

  setTimeout(() => {
    const alive = Object.values(gameState.players).filter(p => !p.eliminated && p.connected);
    alive.length <= 1 ? endGame() : startRound();
  }, 3000);
}

function applyMalus(malusId, activatorId) {
  if (gameState.malusUsedThisRound) return;

  const lastRound = gameState.malusCooldowns[malusId] || 0;
  const roundsElapsed = gameState.round - lastRound;
  if (lastRound > 0 && roundsElapsed <= MALUS_COOLDOWN_ROUNDS) return;

  const alive = Object.values(gameState.players).filter(p => !p.eliminated && p.connected);
  if (!alive.length) return;

  gameState.malusUsedThisRound = true;
  gameState.malusCooldowns[malusId] = gameState.round;

  if (malusId === 'freeze') {
    const t = alive[Math.floor(Math.random() * alive.length)];
    t.frozenUntil = Date.now() + 2000;
    gameState.malusActivators[t.id] = activatorId;
    broadcast({ type: 'malus_applied', malus: 'freeze', targetName: t.name });

  } else if (malusId === 'swap' && alive.length >= 2) {
    const i1 = Math.floor(Math.random() * alive.length);
    let i2; do { i2 = Math.floor(Math.random() * alive.length); } while (i2 === i1);
    const p1 = alive[i1], p2 = alive[i2];
    [p1.row, p2.row] = [p2.row, p1.row];
    [p1.col, p2.col] = [p2.col, p1.col];
    gameState.malusActivators[p1.id] = activatorId;
    gameState.malusActivators[p2.id] = activatorId;
    broadcast({ type: 'malus_applied', malus: 'swap', targetName: `${p1.name} & ${p2.name}` });

  } else if (malusId === 'blind') {
    broadcast({ type: 'malus_applied', malus: 'blind', targetName: 'tous les joueurs', duration: 2000 });
    alive.forEach(p => { gameState.malusActivators[p.id] = activatorId; });

  } else if (malusId === 'slow') {
    const t = alive[Math.floor(Math.random() * alive.length)];
    t.slowUntil = Date.now() + 5000;
    gameState.malusActivators[t.id] = activatorId;
    broadcast({ type: 'malus_applied', malus: 'slow', targetName: t.name });
  }

  broadcastState();
}

function endGame() {
  gameState.phase = 'gameover';
  if (gameState.timerInterval) clearInterval(gameState.timerInterval);
  const alive = Object.values(gameState.players).filter(p => !p.eliminated && p.connected);
  if (alive.length === 1) {
    gameState.scores[alive[0].id] = (gameState.scores[alive[0].id] || 0) + 500;
    gameState.winner = alive[0].id;
  } else {
    let best = null, bestScore = -1;
    Object.entries(gameState.scores).forEach(([id, s]) => {
      if (s > bestScore) { bestScore = s; best = id; }
    });
    gameState.winner = best;
  }
  broadcastState();
}

function resetGame() {
  if (gameState.timerInterval) clearInterval(gameState.timerInterval);
  gameState.phase = 'lobby';
  gameState.round = 0;
  gameState.grid = [];
  gameState.currentQuestion = null;
  gameState.isColorQuestion = false;
  gameState.timer = 0;
  gameState.eliminatedThisRound = [];
  gameState.scores = {};
  gameState.winner = null;
  gameState.malusUsedThisRound = false;
  gameState.malusCooldowns = {};
  gameState.malusActivators = {};
  gameState.usedQuestions = [];
  Object.values(gameState.players).forEach(p => {
    p.eliminated = false; p.row = 0; p.col = 0;
    p.frozenUntil = 0; p.slowUntil = 0;
  });
  broadcastState();
}

// ─── Boot ──────────────────────────────────────────────────────────────────────
let wss;

app.prepare().then(() => {
  const ASSETS_DIR = path.join(__dirname, 'assets');
  const MIME = { mp3: 'audio/mpeg', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', svg: 'image/svg+xml' };

  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);

    // Serve web/assets/ folder at /assets/
    if (parsedUrl.pathname && parsedUrl.pathname.startsWith('/assets/')) {
      const rel = parsedUrl.pathname.slice('/assets/'.length);
      const filePath = path.join(ASSETS_DIR, rel);
      if (filePath.startsWith(ASSETS_DIR) && fs.existsSync(filePath)) {
        const ext = path.extname(filePath).slice(1).toLowerCase();
        res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
        res.setHeader('Cache-Control', 'public, max-age=3600');
        fs.createReadStream(filePath).pipe(res);
        return;
      }
      res.writeHead(404); res.end(); return;
    }

    handle(req, res, parsedUrl);
  });

  wss = new WebSocketServer({ server: httpServer, path: '/game' });

  wss.on('connection', (ws) => {
    ws.on('message', (raw) => {
      let msg;
      try { msg = JSON.parse(raw); } catch { return; }

      if (msg.type === 'join') {
        const name = (msg.name || 'Joueur').slice(0, 20);
        const id = 'p' + Date.now() + Math.random().toString(36).slice(2, 5);
        ws.playerId = id;
        ws.isDisplay = false;
        const spriteIndex = Object.keys(gameState.players).length % 12;
        const emoji = EMOJIS[spriteIndex];
        gameState.players[id] = { id, name, emoji, spriteIndex, row: 0, col: 0, eliminated: false, connected: true, frozenUntil: 0, slowUntil: 0 };
        sendTo(ws, { type: 'joined', id, name, emoji, spriteIndex });
        broadcastState();
      }

      else if (msg.type === 'display_connect') {
        if (displayWs && displayWs.readyState === 1) {
          sendTo(ws, { type: 'display_taken' });
          return;
        }
        ws.isDisplay = true;
        ws.playerId = null;
        displayWs = ws;
        broadcastState();
      }

      else if (msg.type === 'start_game') {
        const players = Object.values(gameState.players).filter(p => p.connected);
        if ((gameState.phase === 'lobby' || gameState.phase === 'gameover')) {
          if (players.length < 2) {
            sendTo(ws, { type: 'error', message: 'Il faut au moins 2 joueurs pour démarrer.' });
          } else {
            startGame();
          }
        }
      }

      else if (msg.type === 'reset_game') {
        resetGame();
      }

      else if (msg.type === 'move') {
        const player = gameState.players[ws.playerId];
        if (!player || player.eliminated || (gameState.phase !== 'question' && gameState.phase !== 'placement')) return;
        if (Date.now() < player.frozenUntil) return;
        const delay = Date.now() < player.slowUntil ? 500 : 0;
        setTimeout(() => {
          let { row, col } = player;
          if (msg.dir === 'up') row = Math.max(0, row - 1);
          else if (msg.dir === 'down') row = Math.min(gameState.gridRows - 1, row + 1);
          else if (msg.dir === 'left') col = Math.max(0, col - 1);
          else if (msg.dir === 'right') col = Math.min(gameState.gridCols - 1, col + 1);

          // Feature 10: block moves to occupied cells
          const occupied = Object.values(gameState.players).some(
            other => !other.eliminated && other.connected && other.id !== player.id
              && other.row === row && other.col === col
          );
          if (!occupied) {
            player.row = row;
            player.col = col;
            broadcastState();
          }
        }, delay);
      }

      else if (msg.type === 'malus') {
        const player = gameState.players[ws.playerId];
        if (!player || !player.eliminated) return;
        applyMalus(msg.malusId, ws.playerId);
      }

      else if (msg.type === 'set_time') {
        if (gameState.phase === 'lobby')
          gameState.roundTime = Math.max(3, Math.min(30, parseInt(msg.value) || DEFAULT_ROUND_TIME));
        broadcastState();
      }
    });

    ws.on('close', () => {
      if (ws.isDisplay && displayWs === ws) {
        displayWs = null;
      }
      if (ws.playerId && gameState.players[ws.playerId]) {
        gameState.players[ws.playerId].connected = false;
        broadcastState();
      }
    });
  });

  httpServer.listen(PORT, hostname, () => {
    console.log(`\n🚀 Grid Runner running on port ${PORT}`);
    const nets = os.networkInterfaces();
    const addresses = [];
    Object.keys(nets).forEach((name) => {
      nets[name].forEach((net) => {
        if (net.family === 'IPv4' && !net.internal) addresses.push(net.address);
      });
    });

    if (addresses.length) {
      console.log('Accessible at:');
      addresses.forEach(a => console.log(` - http://${a}:${PORT}/play`));
    } else {
      console.log(` - http://localhost:${PORT}/play`);
    }
    console.log('');
  });
});
