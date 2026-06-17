import React from 'react';

const SPRITE_COLS = 11;
const SPRITE_W = 181;
const SPRITE_H = 180;

export default function PlayerSprite({ spriteIndex = 0, size = 36 }) {
  const col = (spriteIndex || 0) % SPRITE_COLS;
  const row = Math.floor((spriteIndex || 0) / SPRITE_COLS);
  const displayH = Math.round(size * SPRITE_H / SPRITE_W);

  return (
    <div
      style={{
        width: size,
        height: displayH,
        backgroundImage: 'url(/assets/images/characters/Spreadsheet.png)',
        backgroundPosition: `-${col * size}px -${row * displayH}px`,
        backgroundSize: `${SPRITE_COLS * size}px auto`,
        backgroundRepeat: 'no-repeat',
        imageRendering: 'pixelated',
        flexShrink: 0,
        display: 'inline-block',
      }}
    />
  );
}
