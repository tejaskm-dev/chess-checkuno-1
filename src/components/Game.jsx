'use client';

import React from 'react';
import Canvas3D from './Canvas3D.jsx';
import UIOverlay from './UIOverlay.jsx';

export default function Game() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0F0D0A]">
      {/* 3D Canvas Scene */}
      <div className="absolute inset-0 z-0">
        <Canvas3D />
      </div>

      {/* 2D HTML/Tailwind HUD UI Overlay */}
      <UIOverlay />
    </div>
  );
}
