import React from 'react';
import PlayerSprite from './PlayerSprite';

function rowLabel(r) { return String.fromCharCode(65 + r); }
function colLabel(c) { return c + 1; }

const COLOR_BG = {
  red:    'rgba(255,30,30,0.55)',
  blue:   'rgba(30,80,255,0.55)',
  green:  'rgba(20,200,60,0.55)',
  purple: 'rgba(160,20,220,0.55)',
};

export default function GameGrid({ state, blind, style: extraStyle }) {
  const { grid, gridRows, gridCols, players } = state;
  const phase = state.phase;
  const isColorQ = state.question?.type === 'avoid_color';
  const isEliminating = phase === 'eliminating';

  const playerMap = {};
  if (!blind) {
    Object.values(players || {}).forEach(p => {
      if (!p.eliminated && p.connected) playerMap[`${p.row}-${p.col}`] = p;
    });
  }

  const cells = [];
  for (let r = 0; r < (gridRows || 0); r++) {
    for (let c = 0; c < (gridCols || 0); c++) {
      const key = `${r}-${c}`;
      const playerHere = playerMap[key];
      const gridCell = (grid || []).find(gc => gc.row === r && gc.col === c);
      const isSafe = gridCell?.safe;

      let content;
      let style = {};
      let extraCls = '';

      if (isEliminating) {
        style = {
          background: isSafe ? 'rgba(0,200,80,0.7)' : 'rgba(255,0,50,0.7)',
          border: `1px solid ${isSafe ? 'rgba(0,255,100,0.5)' : 'rgba(255,0,50,0.5)'}`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1,
        };
        if (playerHere) {
          content = (
            <>
              <PlayerSprite spriteIndex={playerHere.spriteIndex} size={36} />
              <span style={{ fontSize: 8, fontFamily: "'Orbitron',monospace", fontWeight: 'bold', color: '#05050a', letterSpacing: 1, lineHeight: 1 }}>
                {playerHere.name.slice(0, 3).toUpperCase()}
              </span>
            </>
          );
        } else if (gridCell?.answer && state.question?.type === 'quiz') {
          content = gridCell.answer;
          extraCls = 'font-orbitron font-bold';
        } else {
          content = `${rowLabel(r)}${colLabel(c)}`;
          extraCls = 'font-orbitron font-bold';
        }
      } else if (playerHere) {
        style = {
          background: 'linear-gradient(135deg, #00f0ff, #bc13fe)',
          boxShadow: '0 0 18px #00f0ff88',
          color: '#05050a',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1,
        };
        content = (
          <>
            <PlayerSprite spriteIndex={playerHere.spriteIndex} size={36} />
            <span style={{ fontSize: 8, fontFamily: "'Orbitron',monospace", fontWeight: 'bold', color: '#05050a', letterSpacing: 1, lineHeight: 1 }}>
              {playerHere.name.slice(0, 7).toUpperCase()}
            </span>
          </>
        );
        extraCls = 'font-bold';
      } else {
        // Feature 3: colored backgrounds for avoid_color questions
        const baseBg = isColorQ && gridCell?.color
          ? COLOR_BG[gridCell.color] || 'rgba(160,160,180,0.13)'
          : 'rgba(160,160,180,0.13)';

        style = {
          background: baseBg,
          border: '1px solid rgba(180,180,200,0.18)',
          color: 'rgba(220,220,240,0.95)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        };
        extraCls = 'font-orbitron font-bold';

        if (gridCell?.answer && state.question?.type === 'quiz') {
          content = gridCell.answer;
        } else {
          content = `${rowLabel(r)}${colLabel(c)}`;
        }
      }

      cells.push(
        <div
          key={key}
          className={`${extraCls} rounded`}
          style={{ ...style, overflow: 'hidden', minWidth: 0, minHeight: 0 }}
        >
          {typeof content === 'string'
            ? (
              <span style={{
                display: 'block',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                width: '100%',
                textAlign: 'center',
                padding: '0 2px',
                fontSize: 'clamp(0.45rem, 1.8cqi, 1.4rem)',
              }}>
                {content}
              </span>
            )
            : content
          }
        </div>
      );
    }
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${state.gridCols || 0}, 1fr)`,
        gridAutoRows: '1fr',
        gap: '6px',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 12,
        padding: 8,
        aspectRatio: `${state.gridCols || 1} / ${state.gridRows || 1}`,
        width: '100%',
        maxHeight: '70vh',
        boxSizing: 'border-box',
        ...extraStyle,
      }}
    >
      {cells}
    </div>
  );
}
