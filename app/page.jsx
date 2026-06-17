'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useGameSocket } from '@/lib/useGameSocket';
import PlayerSprite from '@/lib/PlayerSprite';

// ── Audio manager ─────────────────────────────────────────────────────────────
function useAudio() {
  const bgRef = useRef(null);
  const started = useRef(false);
  const currentTrack = useRef(null);
  const tickRef = useRef(null);

  function start() {
    if (started.current) return;
    started.current = true;
    const bg = new Audio('/assets/audio/backgroundMusic/mainTheme.mp3');
    bg.loop = true;
    bg.volume = 0.35;
    bg.play().catch(() => {});
    bgRef.current = bg;
    currentTrack.current = 'main';
  }

  function playTrack(name) {
    if (!bgRef.current) return;
    const srcs = {
      main:  '/assets/audio/backgroundMusic/mainTheme.mp3',
      final: '/assets/audio/backgroundMusic/finalRounds.mp3',
      end:   '/assets/audio/backgroundMusic/endOfParty.mp3',
    };
    const src = srcs[name];
    if (!src) return;
    if (currentTrack.current === name) {
      // Same track — just resume if paused
      bgRef.current.play().catch(() => {});
      return;
    }
    currentTrack.current = name;
    bgRef.current.pause();
    bgRef.current.src = src;
    bgRef.current.loop = name !== 'end';
    bgRef.current.play().catch(() => {});
  }

  function pauseBg() {
    if (bgRef.current) bgRef.current.pause();
  }

  function sfx(name) {
    if (name === 'tick') {
      if (tickRef.current) {
        tickRef.current.pause();
        tickRef.current = null;
      }
      const a = new Audio('/assets/audio/soundEffects/timerTick.mp3');
      a.volume = 0.15;
      a.play().catch(() => {});
      tickRef.current = a;
      a.onended = () => { if (tickRef.current === a) tickRef.current = null; };
    } else if (name === 'blast') {
      if (tickRef.current) {
        tickRef.current.pause();
        tickRef.current = null;
      }
      const a = new Audio('/assets/audio/soundEffects/timerEndBlast.mp3');
      a.volume = 0.6;
      a.play().catch(() => {});
    }
  }

  return { start, playTrack, pauseBg, sfx };
}

// ── QR Code component ─────────────────────────────────────────────────────────
function QRDisplay({ url }) {
  const [qrSrc, setQrSrc] = useState('');
  useEffect(() => {
    setQrSrc(`/api/qr?url=${encodeURIComponent(url)}`);
  }, [url]);
  return (
    <div className="flex flex-col items-center gap-6 animate-fadeIn">
      <div className="text-center">
        <div className="text-xs font-michroma tracking-[4px] text-white/40 mb-1">SCANNEZ POUR JOUER</div>
        <div className="grad-text font-orbitron font-black text-2xl tracking-widest">GRID RUNNER</div>
      </div>

      <div className="relative">
        <div className="absolute -top-2 -left-2 w-6 h-6 border-t-2 border-l-2 border-[#00F0FF]" />
        <div className="absolute -top-2 -right-2 w-6 h-6 border-t-2 border-r-2 border-[#00F0FF]" />
        <div className="absolute -bottom-2 -left-2 w-6 h-6 border-b-2 border-l-2 border-[#00F0FF]" />
        <div className="absolute -bottom-2 -right-2 w-6 h-6 border-b-2 border-r-2 border-[#00F0FF]" />
        <div
          className="w-56 h-56 rounded-2xl flex items-center justify-center overflow-hidden animate-pulse-glow"
          style={{ background: 'rgba(0,240,255,0.04)', border: '1px solid rgba(0,240,255,0.2)' }}
        >
          {qrSrc ? (
            <img src={qrSrc} alt="QR Code" className="w-48 h-48 rounded-xl" />
          ) : (
            <div className="text-[#00F0FF]/40 font-michroma text-xs tracking-widest">LOADING…</div>
          )}
        </div>
      </div>

      <div className="text-center">
        <div className="font-michroma text-xs tracking-[3px] text-white/30 mb-1">OU ACCÉDEZ À</div>
        <div className="text-[#00F0FF] font-orbitron text-sm tracking-wider">
          {url.replace(/^https?:\/\//, '')}
        </div>
      </div>
    </div>
  );
}

// ── Lobby screen ──────────────────────────────────────────────────────────────
function LobbyScreen({ state, playUrl, onStart, onSetTime }) {
  const players = Object.values(state.players).filter(p => p.connected);

  return (
    <div className="flex h-full gap-8 items-center justify-center px-8">
      <div className="flex-shrink-0">
        <QRDisplay url={playUrl} />
      </div>

      <div className="w-px self-stretch" style={{ background: 'linear-gradient(180deg, transparent, #00F0FF44, transparent)' }} />

      <div className="flex-1 flex flex-col gap-6 max-w-md">
        <div>
          <div className="font-michroma text-xs tracking-[4px] text-white mb-3">JOUEURS CONNECTÉS ({players.length})</div>
          <div className="flex flex-wrap gap-3">
            {players.length === 0 ? (
              <div className="text-white/20 font-michroma text-xs tracking-widest animate-blink">
                EN ATTENTE DE JOUEURS…
              </div>
            ) : (
              players.map(p => (
                <div
                  key={p.id}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg animate-appear"
                  style={{ background: 'rgba(0,240,255,0.08)', border: '1px solid rgba(0,240,255,0.25)' }}
                >
                  <PlayerSprite spriteIndex={p.spriteIndex} size={28} />
                  <span className="font-orbitron text-sm text-[#00F0FF]">{p.name}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <div className="font-michroma text-xs tracking-[3px] text-white mb-2">TEMPS PAR ROUND</div>
          <div className="flex gap-2">
            {[5, 8, 12, 20].map(t => (
              <button
                key={t}
                onClick={() => onSetTime(t)}
                className="px-4 py-2 rounded-lg font-orbitron text-sm font-bold transition-all"
                style={{
                  background: state.roundTime === t
                    ? 'linear-gradient(90deg, #00F0FF, #BC13FE)'
                    : 'rgba(255,255,255,0.06)',
                  border: `1px solid ${state.roundTime === t ? 'transparent' : 'rgba(255,255,255,0.12)'}`,
                  color: state.roundTime === t ? '#05050A' : '#ffffff99',
                }}
              >
                {t}s
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={onStart}
          disabled={players.length < 1}
          className="relative overflow-hidden rounded-xl py-4 font-orbitron font-black text-lg tracking-[3px] transition-all disabled:opacity-30"
          style={{
            background: players.length >= 1 ? 'linear-gradient(90deg, #00F0FF, #BC13FE)' : 'rgba(255,255,255,0.1)',
            boxShadow: players.length >= 1 ? '0 0 30px #00F0FF44' : 'none',
            color: '#fff',
            textShadow: '0 0 10px rgba(0,240,255,0.6)',
          }}
        >
          <span className="relative z-10">LANCER LA PARTIE</span>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </button>
      </div>
    </div>
  );
}

// ── Game grid ─────────────────────────────────────────────────────────────────
import GameGrid from '@/lib/GameGrid';

// ── Game screen (display) ─────────────────────────────────────────────────────
function GameScreen({ state, blind, onReset, malusNotif }) {
  const alive = Object.values(state.players).filter(p => !p.eliminated && p.connected);
  const timerPct = Math.max(0, (state.timer / (state.roundTime || 8)) * 100);
  const urgent = state.timer <= 3;

  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="flex flex-col gap-3" style={{ width: '85%', maxHeight: '90%', height: '100%' }}>

        {/* Header */}
        <div className="flex items-center justify-between flex-shrink-0">
          <div className="grad-text font-orbitron font-black text-xl tracking-widest">GRID RUNNER</div>
          <div className="flex items-center gap-4">
            <div className="font-michroma text-xs tracking-[3px] text-white">
              ROUND <span className="text-[#00F0FF]">{state.round}</span>
            </div>
            <div className="font-michroma text-xs tracking-[3px] text-white">
              SURVIVANTS <span className="text-[#BC13FE]">{alive.length}</span>
            </div>
            {state.phase === 'gameover' && (
              <button
                onClick={onReset}
                className="px-4 py-1.5 rounded-lg font-orbitron text-xs font-bold tracking-widest transition-all"
                style={{ background: 'linear-gradient(90deg, #FF003C, #ff6600)', boxShadow: '0 0 15px #FF003C66' }}
              >
                REJOUER
              </button>
            )}
          </div>
        </div>

        {/* Feature 6: malus notification banner */}
        {malusNotif && (
          <div
            className="flex-shrink-0 rounded-xl px-5 py-2.5 text-center font-orbitron font-black text-base tracking-[2px] animate-fadeIn"
            style={{
              background: 'rgba(188,19,254,0.22)',
              border: '1.5px solid rgba(188,19,254,0.7)',
              color: '#BC13FE',
              boxShadow: '0 0 24px rgba(188,19,254,0.4)',
            }}
          >
            {malusNotif.icon} MALUS ACTIVÉ : {malusNotif.label}
            {malusNotif.target && (
              <span className="text-white/80 font-michroma font-normal text-sm ml-2">— {malusNotif.target}</span>
            )}
          </div>
        )}

        {/* Placement phase banner */}
        {state.phase === 'placement' && (
          <div
            className="flex-shrink-0 rounded-xl px-5 py-3 text-center font-orbitron font-black text-lg tracking-[3px] animate-fadeIn"
            style={{ background: 'rgba(0,240,255,0.08)', border: '1.5px solid rgba(0,240,255,0.5)', color: '#00F0FF' }}
          >
            📍 REPÉREZ-VOUS — {state.timer}s
          </div>
        )}

        {/* Question box */}
        {state.question && state.phase !== 'gameover' && (
          <div
            className="rounded-xl px-6 py-4 text-center font-michroma text-xl tracking-widest text-white leading-relaxed flex-shrink-0"
            style={{ background: '#1a0828', border: '2px solid #BC13FE', boxShadow: '0 0 20px rgba(188,19,254,0.3)' }}
          >
            {state.question.text}
            {blind && <span className="ml-3 text-[#00F0FF]">— 🙈 JOUEURS CACHÉS</span>}
          </div>
        )}

        {/* Timer */}
        {state.phase === 'question' && (
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <div
                className="timer-bar h-full rounded-full"
                style={{
                  width: `${timerPct}%`,
                  background: urgent ? 'linear-gradient(90deg, #FF003C, #ff6600)' : 'linear-gradient(90deg, #00F0FF, #BC13FE)',
                }}
              />
            </div>
            <div
              className="font-orbitron font-black text-2xl w-10 text-right"
              style={{ color: urgent ? '#FF003C' : '#00F0FF' }}
            >
              {state.timer}
            </div>
          </div>
        )}

        {/* Main content area */}
        <div className="flex-1 min-h-0 flex items-center justify-center">
          {state.phase === 'countdown' ? (
            <div className="flex flex-col items-center gap-4">
              <div className="grad-text font-orbitron font-black text-6xl animate-pulse-glow">GO!</div>
              <div className="font-michroma text-xs tracking-[4px] text-white">PRÉPAREZ-VOUS…</div>
            </div>
          ) : state.phase === 'gameover' ? (
            <GameoverDisplay state={state} />
          ) : (
            <GameGrid state={state} blind={blind} />
          )}
        </div>

        {/* Scoreboard */}
        {state.phase !== 'gameover' && (
          <div className="flex gap-2 flex-wrap justify-center flex-shrink-0">
            {Object.values(state.players)
              .filter(p => p.connected)
              .sort((a, b) => (state.scores[b.id] || 0) - (state.scores[a.id] || 0))
              .map(p => (
                <div
                  key={p.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-orbitron transition-all"
                  style={{
                    background: p.eliminated ? 'rgba(255,0,60,0.15)' : 'rgba(0,240,255,0.1)',
                    border: `1px solid ${p.eliminated ? 'rgba(255,0,60,0.3)' : 'rgba(0,240,255,0.3)'}`,
                    opacity: p.eliminated ? 0.6 : 1,
                  }}
                >
                  <PlayerSprite spriteIndex={p.spriteIndex} size={20} />
                  <span style={{ color: p.eliminated ? '#FF003C' : '#00F0FF' }}>{p.name}</span>
                  <span className="text-white">{state.scores[p.id] || 0}pt</span>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

function GameoverDisplay({ state }) {
  const winner = state.winner ? state.players[state.winner] : null;
  const sorted = Object.values(state.players)
    .filter(p => p.connected)
    .sort((a, b) => (state.scores[b.id] || 0) - (state.scores[a.id] || 0));

  return (
    <div className="w-full flex flex-col items-center gap-6 animate-fadeIn">
      {winner && (
        <div className="text-center flex flex-col items-center">
          <PlayerSprite spriteIndex={winner.spriteIndex} size={80} />
          <div className="grad-text font-orbitron font-black text-3xl tracking-widest mb-1 mt-2">VICTOIRE!</div>
          <div className="text-[#00F0FF] font-orbitron text-xl">{winner.name}</div>
        </div>
      )}
      <div className="flex flex-col gap-2 w-full max-w-xs">
        {sorted.map((p, i) => (
          <div
            key={p.id}
            className="flex items-center justify-between px-4 py-2 rounded-xl"
            style={{
              background: i === 0 ? 'rgba(0,240,255,0.12)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${i === 0 ? 'rgba(0,240,255,0.3)' : 'rgba(255,255,255,0.08)'}`,
            }}
          >
            <div className="flex items-center gap-3">
              <span className="text-white font-michroma text-sm">#{i + 1}</span>
              <PlayerSprite spriteIndex={p.spriteIndex} size={24} />
              <span className="font-orbitron text-sm" style={{ color: i === 0 ? '#00F0FF' : '#fff' }}>{p.name}</span>
            </div>
            <span className="font-orbitron font-bold text-sm" style={{ color: i === 0 ? '#BC13FE' : '#ffffff99' }}>
              {state.scores[p.id] || 0} pts
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Display Page ─────────────────────────────────────────────────────────
export default function DisplayPage() {
  const [gameState, setGameState] = useState(null);
  const [blind, setBlind] = useState(false);
  const [playUrl, setPlayUrl] = useState('');
  // Feature 6: malus notification on display
  const [malusNotif, setMalusNotif] = useState(null);
  const blindTimer = useRef(null);
  const malusTimer = useRef(null);
  const audio = useAudio();
  const audioStarted = useRef(false);

  useEffect(() => {
    fetch('/api/ip')
      .then(r => r.json())
      .then(data => setPlayUrl(data.url))
      .catch(() => setPlayUrl(`${location.protocol}//${location.host}/play`));
  }, []);

  // Start audio on first click (browser autoplay policy)
  useEffect(() => {
    function handleFirstClick() {
      if (!audioStarted.current) {
        audioStarted.current = true;
        audio.start();
      }
    }
    window.addEventListener('click', handleFirstClick, { once: true });
    return () => window.removeEventListener('click', handleFirstClick);
  }, []);

  const { send, connected } = useGameSocket(
    useCallback((msg) => {
      if (msg.type === 'display_taken') {
        window.location.href = '/play';
        return;
      }
      if (msg.type === 'state') {
        setGameState(prev => {
          if (msg.phase === 'question' && prev?.timer !== msg.timer && msg.timer > 0) {
            audio.sfx('tick');
          }
          if (prev?.phase === 'question' && msg.phase === 'eliminating') {
            audio.sfx('blast');
            audio.pauseBg();
          }
          if (audioStarted.current) {
            if (msg.phase === 'gameover') {
              audio.playTrack('end');
            } else if ((msg.phase === 'question' || msg.phase === 'placement') && msg.round >= 5) {
              audio.playTrack('final');
            } else if (msg.phase === 'countdown' || msg.phase === 'question' || msg.phase === 'placement') {
              audio.playTrack('main');
            }
          }
          return msg;
        });
      } else if (msg.type === 'malus_applied' && msg.malus === 'blind') {
        setBlind(true);
        clearTimeout(blindTimer.current);
        blindTimer.current = setTimeout(() => setBlind(false), msg.duration || 2000);
      }

      // Feature 6: show malus notification on display screen
      if (msg.type === 'malus_applied') {
        const ICONS = { blind: '🙈', freeze: '❄️', swap: '🔀', slow: '🐢' };
        const LABELS = { blind: 'AVEUGLE', freeze: 'GEL', swap: 'SWAP', slow: 'RALENTI' };
        setMalusNotif({ icon: ICONS[msg.malus] || '⚡', label: LABELS[msg.malus] || msg.malus, target: msg.targetName });
        clearTimeout(malusTimer.current);
        malusTimer.current = setTimeout(() => setMalusNotif(null), 3500);
      }
    }, [])
  );

  useEffect(() => {
    if (connected) send({ type: 'display_connect' });
  }, [connected, send]);

  const handleStart = () => send({ type: 'start_game' });
  const handleReset = () => send({ type: 'reset_game' });
  const handleSetTime = (v) => send({ type: 'set_time', value: v });

  return (
    <main className="relative z-10 w-full h-screen flex flex-col" style={{ background: 'transparent' }}>
      <div className="absolute top-3 right-4 flex items-center gap-1.5 z-20">
        <div
          className="w-2 h-2 rounded-full transition-colors"
          style={{ background: connected ? '#00F0FF' : '#FF003C', boxShadow: connected ? '0 0 8px #00F0FF' : '0 0 8px #FF003C' }}
        />
        <span className="font-michroma text-[10px] tracking-widest" style={{ color: connected ? '#00F0FF99' : '#FF003C99' }}>
          {connected ? 'CONNECTÉ' : 'RECONNEXION…'}
        </span>
      </div>

      {!gameState || gameState.phase === 'lobby' ? (
        <div className="flex-1 flex items-center justify-center">
          <LobbyScreen
            state={gameState || {
              phase: 'lobby', players: {}, grid: [], gridRows: 8, gridCols: 10,
              question: null, round: 0, timer: 0, roundTime: 8,
              eliminatedThisRound: [], scores: {}, winner: null,
              totalPlayers: 0, alivePlayers: 0, type: 'state',
            }}
            playUrl={playUrl}
            onStart={handleStart}
            onSetTime={handleSetTime}
          />
        </div>
      ) : (
        <GameScreen state={gameState} blind={blind} onReset={handleReset} malusNotif={malusNotif} />
      )}
    </main>
  );
}
