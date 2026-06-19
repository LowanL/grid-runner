'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useGameSocket } from '@/lib/useGameSocket';
import PlayerSprite from '@/lib/PlayerSprite';

// ── Audio (mobile: sound effects only, no background music to avoid echo) ─────
// Feature 11: sound effects for key player events
function useSfx() {
  function play(name) {
    const srcs = {
      tick:      '/assets/audio/soundEffects/timerTick.mp3',
      blast:     '/assets/audio/soundEffects/timerEndBlast.mp3',
    };
    const src = srcs[name];
    if (!src) return;
    const a = new Audio(src);
    a.volume = 0.5;
    a.play().catch(() => {});
  }
  return { play };
}

// ── Orientation / fullscreen ──────────────────────────────────────────────────
// Feature 5: detect landscape orientation for fullscreen button
function useFullscreen() {
  const [isLandscape, setIsLandscape] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    function check() {
      setIsLandscape(window.innerWidth > window.innerHeight);
      setIsFullscreen(!!document.fullscreenElement);
    }
    check();
    window.addEventListener('resize', check);
    document.addEventListener('fullscreenchange', check);
    return () => {
      window.removeEventListener('resize', check);
      document.removeEventListener('fullscreenchange', check);
    };
  }, []);

  function toggle() {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  }

  return { isLandscape, isFullscreen, toggle };
}

// ── D-Pad Button ──────────────────────────────────────────────────────────────
function DPadBtn({ dir, icon, onPress }) {
  const pressRef = useRef(false);
  const intervalRef = useRef(null);

  const startPress = useCallback(() => {
    if (pressRef.current) return;
    pressRef.current = true;
    onPress(dir);
    intervalRef.current = setInterval(() => onPress(dir), 160);
  }, [dir, onPress]);

  const stopPress = useCallback(() => {
    pressRef.current = false;
    clearInterval(intervalRef.current);
  }, []);

  return (
    <button
      className="dpad-btn select-none"
      onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); startPress(); }}
      onPointerUp={stopPress}
      onPointerLeave={stopPress}
      onPointerCancel={stopPress}
      style={{
        width: 100,
        height: 100,
        borderRadius: 20,
        background: 'rgba(0,240,255,0.07)',
        border: '1.5px solid rgba(0,240,255,0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 38,
        cursor: 'pointer',
        touchAction: 'none',
        WebkitUserSelect: 'none',
        transition: 'background 0.08s, transform 0.08s, box-shadow 0.08s',
        boxShadow: '0 0 12px rgba(0,240,255,0.08)',
      }}
    >
      {icon}
    </button>
  );
}

// ── Malus Button ──────────────────────────────────────────────────────────────
function MalusBtn({ malus, onSend, slotTaken, cooldownRoundsLeft }) {
  const isLocked = slotTaken || cooldownRoundsLeft > 0;

  function handle() {
    if (isLocked) return;
    onSend(malus.id);
  }

  let lockReason = '';
  if (slotTaken) lockReason = 'UTILISÉ';
  else if (cooldownRoundsLeft > 0) lockReason = `${cooldownRoundsLeft}R`;

  return (
    <button
      onClick={handle}
      disabled={isLocked}
      className="malus-btn flex flex-col items-center gap-1 px-3 py-3 rounded-xl transition-all"
      style={{
        background: isLocked ? 'rgba(255,255,255,0.04)' : 'rgba(188,19,254,0.18)',
        border: `1.5px solid ${isLocked ? 'rgba(255,255,255,0.1)' : 'rgba(188,19,254,0.5)'}`,
        opacity: isLocked ? 0.4 : 1,
        boxShadow: isLocked ? 'none' : '0 0 16px rgba(188,19,254,0.25)',
        minWidth: 72,
        cursor: isLocked ? 'not-allowed' : 'pointer',
        position: 'relative',
      }}
    >
      <span style={{ fontSize: 26 }}>{malus.label.split(' ')[0]}</span>
      <span style={{
        fontFamily: "'Orbitron', monospace",
        fontSize: 9,
        color: isLocked ? 'rgba(255,255,255,0.3)' : '#BC13FE',
        letterSpacing: 1,
        textTransform: 'uppercase',
      }}>
        {lockReason || malus.label.split(' ').slice(1).join(' ') || malus.id}
      </span>
    </button>
  );
}

// ── Join Screen ───────────────────────────────────────────────────────────────
function JoinScreen({ onJoin }) {
  const [name, setName] = useState('');
  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 px-6 animate-fadeIn">
      <div className="text-center">
        <div className="grad-text font-orbitron font-black text-4xl tracking-[6px] mb-2">GRID</div>
        <div className="grad-text font-orbitron font-black text-4xl tracking-[6px]">RUNNER</div>
        <div className="mt-3 w-16 h-0.5 mx-auto" style={{ background: 'linear-gradient(90deg, #00F0FF, #BC13FE)' }} />
      </div>
      <div className="w-full max-w-xs flex flex-col gap-3">
        <label className="font-michroma text-xs tracking-[3px] text-white">VOTRE PSEUDO</label>
        <input
          type="text"
          maxLength={20}
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && name.trim() && onJoin(name.trim())}
          placeholder="Ex: Joueur42"
          autoFocus
          style={{
            background: '#0d1a2a',
            border: '1.5px solid rgba(0,240,255,0.4)',
            borderRadius: 12,
            padding: '14px 18px',
            color: '#fff',
            fontFamily: "'Orbitron', monospace",
            fontSize: 16,
            outline: 'none',
            width: '100%',
            letterSpacing: 2,
          }}
        />
        <button
          onClick={() => name.trim() && onJoin(name.trim())}
          disabled={!name.trim()}
          className="relative overflow-hidden rounded-xl py-4 font-orbitron font-black text-sm tracking-[4px] transition-all disabled:opacity-30"
          style={{
            background: name.trim() ? 'linear-gradient(90deg, #00F0FF, #BC13FE)' : 'rgba(255,255,255,0.08)',
            color: '#fff',
            textShadow: name.trim() ? '0 0 10px rgba(0,240,255,0.5)' : 'none',
            boxShadow: name.trim() ? '0 0 30px rgba(0,240,255,0.3)' : 'none',
            border: 'none',
            cursor: name.trim() ? 'pointer' : 'not-allowed',
          }}
        >
          REJOINDRE
        </button>
      </div>
    </div>
  );
}

// ── Waiting Screen ────────────────────────────────────────────────────────────
function WaitingScreen({ player, state }) {
  const players = Object.values(state?.players || {}).filter(p => p.connected);
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 px-6 animate-fadeIn">
      <div className="text-center flex flex-col items-center">
        <PlayerSprite spriteIndex={player?.spriteIndex} size={64} />
        <div className="font-orbitron font-black text-xl text-[#00F0FF] mb-1 mt-2">{player?.name}</div>
        <div className="font-michroma text-xs tracking-[3px] text-white">CONNECTÉ</div>
      </div>
      <div
        className="w-full max-w-xs rounded-2xl p-5"
        style={{ background: '#0d1422', border: '1px solid rgba(0,240,255,0.25)' }}
      >
        <div className="font-michroma text-xs tracking-[3px] text-white mb-3">
          SALLE D'ATTENTE — {players.length} joueur{players.length > 1 ? 's' : ''}
        </div>
        <div className="flex flex-wrap gap-2">
          {players.map(p => (
            <div
              key={p.id}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
              style={{
                background: p.id === player?.id ? 'rgba(0,240,255,0.15)' : 'rgba(255,255,255,0.07)',
                border: `1px solid ${p.id === player?.id ? 'rgba(0,240,255,0.4)' : 'rgba(255,255,255,0.12)'}`,
              }}
            >
              <PlayerSprite spriteIndex={p.spriteIndex} size={20} />
              <span className="font-orbitron text-xs" style={{ color: p.id === player?.id ? '#00F0FF' : '#fff' }}>
                {p.name}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="font-michroma text-xs tracking-[4px] text-white/50 animate-blink text-center">
        EN ATTENTE DU LANCEMENT…
      </div>
    </div>
  );
}

// ── Eliminated Screen (malus panel) ──────────────────────────────────────────
function EliminatedScreen({ player, state, malusList, onMalus }) {
  const alive = Object.values(state?.players || {}).filter(p => !p.eliminated && p.connected);
  const slotTaken = state?.malusUsedThisRound || false;
  const cooldowns = state?.malusCooldowns || {};

  return (
    <div className="flex flex-col items-center justify-center h-full gap-5 px-6 animate-fadeIn">
      <div className="text-center">
        <div className="text-6xl mb-2">💀</div>
        <div className="font-orbitron font-black text-2xl tracking-widest mb-1" style={{ color: '#FF003C' }}>
          ÉLIMINÉ
        </div>
        <div className="font-michroma text-xs tracking-[3px] text-white">
          ROUND {state?.round}
        </div>
      </div>

      {malusList?.length > 0 && (
        <div className="w-full max-w-xs">
          <div
            className="font-michroma text-xs tracking-[3px] mb-3 text-center"
            style={{ color: slotTaken ? 'rgba(255,255,255,0.4)' : '#BC13FE' }}
          >
            {slotTaken ? '⛔ MALUS DÉJÀ UTILISÉ CE ROUND' : '⚡ APPLIQUER UN MALUS'}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {malusList.map(m => (
              <MalusBtn
                key={m.id}
                malus={m}
                onSend={onMalus}
                slotTaken={slotTaken}
                cooldownRoundsLeft={cooldowns[m.id] || 0}
              />
            ))}
          </div>
          <div
            className="mt-3 font-michroma text-[10px] tracking-widest text-center"
            style={{ color: 'rgba(255,255,255,0.4)' }}
          >
            PERTURBEZ LES SURVIVANTS
          </div>
        </div>
      )}

      <div className="font-michroma text-xs tracking-[3px] text-white/60 animate-blink">
        SURVIVANTS : {alive.length}
      </div>
    </div>
  );
}

// ── Active Play Screen ────────────────────────────────────────────────────────
function PlayScreen({ player, state, onMove }) {
  const myPlayer = state?.players?.[player?.id];
  const myCell = state?.grid?.find(c => c.row === myPlayer?.row && c.col === myPlayer?.col);

  let cellLabel = myPlayer ? `${String.fromCharCode(65 + myPlayer.row)}${myPlayer.col + 1}` : '—';
  if (myCell) {
    if (myCell.answer) {
      cellLabel = myCell.answer;
    } else if (state?.question?.type === 'avoid_color' && myCell.color) {
      cellLabel = myCell.color.toUpperCase();
    }
  }

  const cellSafeColor = '#00F0FF';

  return (
    <div className="flex flex-col h-full">
      {/* Question */}
      <div className="flex-shrink-0 px-4 pt-4 pb-2">
        {state?.question && (
          <div
            className="rounded-xl px-4 py-2 text-center font-michroma text-sm tracking-wider text-white leading-relaxed"
            style={{ background: '#1a0828', border: '1.5px solid #BC13FE' }}
          >
            {state.question.text}
          </div>
        )}
      </div>

      {/* Contenu de la case — affiché en haut de la manette */}
      <div className="flex-shrink-0 px-4 pb-3">
        <div
          className="rounded-xl px-4 py-3 flex items-center gap-3"
          style={{ background: '#0d1422', border: `1.5px solid ${cellSafeColor}`, boxShadow: `0 0 14px ${cellSafeColor}33` }}
        >
          <PlayerSprite spriteIndex={player?.spriteIndex} size={32} />
          <div
            className="font-orbitron font-black text-base text-center leading-snug flex-1"
            style={{ color: cellSafeColor, wordBreak: 'break-word' }}
          >
            {cellLabel}
          </div>
        </div>
      </div>

      {/* D-pad avec boutons agrandis */}
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <DPadBtn dir="up" icon="▲" onPress={onMove} />
          <div className="flex gap-3 items-center">
            <DPadBtn dir="left" icon="◀" onPress={onMove} />
            <div
              className="w-[100px] h-[100px] rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(0,240,255,0.04)', border: '1px solid rgba(0,240,255,0.1)' }}
            >
              <PlayerSprite spriteIndex={player?.spriteIndex} size={40} />
            </div>
            <DPadBtn dir="right" icon="▶" onPress={onMove} />
          </div>
          <DPadBtn dir="down" icon="▼" onPress={onMove} />
        </div>
      </div>
    </div>
  );
}

// ── Game Over Screen ──────────────────────────────────────────────────────────
function GameoverScreen({ player, state }) {
  const isWinner = state?.winner === player?.id;
  const sorted = Object.values(state?.players || {})
    .filter(p => p.connected)
    .sort((a, b) => (state.scores[b.id] || 0) - (state.scores[a.id] || 0));
  const myRank = sorted.findIndex(p => p.id === player?.id) + 1;

  return (
    <div className="flex flex-col items-center justify-center h-full gap-5 px-6 animate-fadeIn">
      <div className="text-center flex flex-col items-center">
        {isWinner
          ? <div className="text-6xl mb-2">🏆</div>
          : <PlayerSprite spriteIndex={player?.spriteIndex} size={64} />
        }
        <div
          className="font-orbitron font-black text-2xl tracking-widest mb-1 mt-2"
          style={{ color: isWinner ? '#00F0FF' : '#fff' }}
        >
          {isWinner ? 'VICTOIRE !' : `#${myRank}`}
        </div>
        <div className="font-michroma text-xs tracking-[3px] text-white">
          {state?.scores?.[player?.id] || 0} POINTS
        </div>
      </div>
      <div className="w-full max-w-xs flex flex-col gap-2">
        {sorted.map((p, i) => (
          <div
            key={p.id}
            className="flex items-center justify-between px-4 py-2.5 rounded-xl"
            style={{
              background: p.id === player?.id ? 'rgba(0,240,255,0.12)' : '#0d1020',
              border: `1px solid ${p.id === player?.id ? 'rgba(0,240,255,0.4)' : 'rgba(255,255,255,0.1)'}`,
            }}
          >
            <div className="flex items-center gap-3">
              <span className="text-white font-michroma text-xs">#{i + 1}</span>
              <PlayerSprite spriteIndex={p.spriteIndex} size={20} />
              <span className="font-orbitron text-sm" style={{ color: i === 0 ? '#00F0FF' : p.id === player?.id ? '#fff' : '#ccc' }}>
                {p.name}
              </span>
            </div>
            <span className="font-orbitron font-bold text-xs" style={{ color: i === 0 ? '#BC13FE' : '#ffffff99' }}>
              {state.scores[p.id] || 0}
            </span>
          </div>
        ))}
      </div>
      <div className="font-michroma text-xs tracking-[3px] text-white/50 animate-blink text-center">
        EN ATTENTE DE LA PROCHAINE PARTIE…
      </div>
    </div>
  );
}

// ── Main Play Page ────────────────────────────────────────────────────────────
export default function PlayPage() {
  const [player, setPlayer] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [debugState, setDebugState] = useState(null);
  const [malusList, setMalusList] = useState([]);
  const [myEliminated, setMyEliminated] = useState(false);
  const [notif, setNotif] = useState(null);
  const notifTimer = useRef(null);
  const sfx = useSfx();
  const { isLandscape, isFullscreen, toggle: toggleFullscreen } = useFullscreen();

  function showNotif(text) {
    setNotif(text);
    clearTimeout(notifTimer.current);
    notifTimer.current = setTimeout(() => setNotif(null), 2500);
  }

  const { send, connected } = useGameSocket(
    useCallback((msg) => {
      if (msg.type === 'joined') {
        setPlayer({ id: msg.id, name: msg.name, emoji: msg.emoji, spriteIndex: msg.spriteIndex });
        setMyEliminated(false);
      } else if (msg.type === 'state') {
        setGameState(prev => {
          if (prev?.phase === 'question' && msg.phase === 'eliminating') {
            sfx.play('blast');
          }
          return msg;
        });
        if (msg.phase === 'lobby' || msg.phase === 'countdown') {
          setMyEliminated(false);
          setMalusList([]);
        }
      } else if (msg.type === 'eliminated') {
        setMyEliminated(true);
        setMalusList(msg.malusList || []);
        showNotif('💀 Tu es éliminé !');
      } else if (msg.type === 'malus_applied') {
        const icons = { blind: '🙈', freeze: '❄️', swap: '🔀', slow: '🐢' };
        showNotif(`${icons[msg.malus] || '⚡'} ${msg.targetName}`);
      } else if (msg.type === 'malus_bonus') {
        showNotif(`+${msg.points}pts 🎯 ${msg.targetName} éliminé !`);
      }
    }, [])
  );

  // Debug mode
  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search);
      if (params.get('debug') === '1') {
        const fake = {
          phase: 'question',
          players: {
            p1: { id: 'p1', name: 'Alice', emoji: '🦊', spriteIndex: 0, row: 0, col: 0, connected: true, eliminated: false },
            p2: { id: 'p2', name: 'Bob',   emoji: '🐉', spriteIndex: 1, row: 1, col: 2, connected: true, eliminated: false },
          },
          grid: (function(){
            const g = [];
            for (let r=0;r<8;r++) for (let c=0;c<10;c++) g.push({ row:r, col:c, safe:true, color:'grey' });
            return g;
          })(),
          gridRows: 8, gridCols: 10,
          question: { text: 'MODE DEBUG — Exemple de question' },
          round: 1, timer: 999, roundTime: 8,
          scores: { p1: 0, p2: 0 },
        };
        setDebugState(fake);
      }
    } catch (e) {}
  }, []);

  const handleJoin = useCallback((name) => send({ type: 'join', name }), [send]);
  const handleMove = useCallback((dir) => send({ type: 'move', dir }), [send]);
  const handleMalus = useCallback((malusId) => send({ type: 'malus', malusId }), [send]);

  const activeState = debugState || gameState;
  const phase = activeState?.phase;

  let screen;
  if (!player) {
    screen = <JoinScreen onJoin={handleJoin} />;
  } else if (phase === 'gameover') {
    screen = <GameoverScreen player={player} state={activeState} />;
  } else if (myEliminated) {
    screen = (
      <EliminatedScreen
        player={player}
        state={activeState}
        malusList={malusList}
        onMalus={handleMalus}
      />
    );
  } else if (phase === 'question' || phase === 'eliminating' || phase === 'placement') {
    screen = <PlayScreen player={player} state={activeState} onMove={handleMove} />;
  } else if (phase === 'countdown') {
    screen = (
      <div className="flex flex-col items-center justify-center h-full gap-4 animate-fadeIn">
        <PlayerSprite spriteIndex={player.spriteIndex} size={64} />
        <div className="grad-text font-orbitron font-black text-5xl animate-pulse-glow mt-2">GO!</div>
        <div className="font-michroma text-xs tracking-[4px] text-white mt-2">PRÉPAREZ-VOUS…</div>
      </div>
    );
  } else {
    screen = <WaitingScreen player={player} state={gameState} />;
  }

  return (
    <main
      className="relative z-10 w-full h-screen flex flex-col overflow-hidden"
      style={{ background: 'transparent', maxWidth: 480, margin: '0 auto' }}
    >
      {/* Connection dot */}
      <div className="absolute top-3 right-4 z-20">
        <div
          className="w-1.5 h-1.5 rounded-full"
          style={{
            background: connected ? '#00F0FF' : '#FF003C',
            boxShadow: connected ? '0 0 6px #00F0FF' : '0 0 6px #FF003C',
          }}
        />
      </div>

      {/* Feature 5: fullscreen button when landscape */}
      {isLandscape && (
        <button
          onClick={toggleFullscreen}
          className="absolute top-2 left-3 z-20 font-michroma text-[10px] tracking-widest px-2 py-1 rounded"
          style={{
            background: 'rgba(0,240,255,0.1)',
            border: '1px solid rgba(0,240,255,0.3)',
            color: '#00F0FF',
          }}
        >
          {isFullscreen ? '⛶ Quitter' : '⛶ Plein écran'}
        </button>
      )}

      {/* Toast notification */}
      {notif && (
        <div
          className="absolute top-4 left-1/2 z-50 px-5 py-2.5 rounded-full font-orbitron text-xs tracking-widest notif-enter"
          style={{
            transform: 'translateX(-50%)',
            background: '#05050A',
            border: '1.5px solid rgba(0,240,255,0.5)',
            color: '#00F0FF',
            whiteSpace: 'nowrap',
            boxShadow: '0 0 20px rgba(0,240,255,0.3)',
          }}
        >
          {notif}
        </div>
      )}

      <div className="flex-1 min-h-0">{screen}</div>
    </main>
  );
}
