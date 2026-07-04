import React, { useState, useEffect, useRef } from 'react';
import { MachineFault, Tool } from '../types';
import { Wrench, ShieldAlert, CheckCircle, Flame, Snowflake, RotateCcw, PenTool as ToolIcon, Droplet, Play, Activity, Settings, HelpCircle, FlameKindling } from 'lucide-react';
import { sfx } from './SoundEffects';
import { motion, AnimatePresence } from 'motion/react';

interface IsometricRepairProps {
  fault: MachineFault;
  tools: Tool[];
  inventoryParts: { [key: string]: number };
  onCompleteStep: (stepIndex: number, successRating: number) => void;
  onCancel: () => void;
}

export default function IsometricRepair({
  fault,
  tools,
  inventoryParts,
  onCompleteStep,
  onCancel,
}: IsometricRepairProps) {
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  
  // Specific minigame states
  const [boltAngles, setBoltAngles] = useState<number[]>([45, 120, 240, 310]); // Angle of each of the 4 bolts
  const [boltTightness, setBoltTightness] = useState<number[]>([20, 10, 35, 15]); // 0 to 100
  const [activeBoltIndex, setActiveBoltIndex] = useState<number | null>(null);
  const [torqueGauge, setTorqueGauge] = useState<number>(0);
  const [torqueDirection, setTorqueDirection] = useState<number>(1);
  const torqueIntervalRef = useRef<number | null>(null);

  // Leak states
  const [leakSealPercent, setLeakSealPercent] = useState<number>(0);
  const [isSealing, setIsSealing] = useState<boolean>(false);
  const lastLeakPosition = useRef<{ x: number; y: number } | null>(null);

  // Wiring states
  const [wireConnections, setWireConnections] = useState<{ [key: string]: boolean }>({
    '1-a': false,
    '2-b': false,
    '3-c': false,
  });
  const [drawingWire, setDrawingWire] = useState<{ from: string; to: string } | null>(null);

  // Calibration dial states
  const [valvePressure, setValvePressure] = useState<number>(2.5); // starting pressure in bar

  // Instructions tooltip state
  const [showInstructions, setShowInstructions] = useState<boolean>(true);

  // Sound effect loops
  const leakSoundRef = useRef<{ stop: () => void } | null>(null);

  useEffect(() => {
    // If there is a leak, play the continuous leak sound hiss
    if (fault.type === 'leak') {
      const loop = sfx.playGasLeak();
      if (loop) {
        leakSoundRef.current = loop;
      }
    }

    return () => {
      if (leakSoundRef.current) {
        leakSoundRef.current.stop();
        leakSoundRef.current = null;
      }
    };
  }, [fault.id]);

  // Torque Game Loop (for Wrench/Bolt calibration)
  const startTorqueGauge = (boltIndex: number) => {
    if (selectedTool !== 'wrench') return;
    setActiveBoltIndex(boltIndex);
    setTorqueGauge(0);
    sfx.playWrenchClick();

    if (torqueIntervalRef.current) clearInterval(torqueIntervalRef.current);

    torqueIntervalRef.current = window.setInterval(() => {
      setTorqueGauge((prev) => {
        let next = prev + 6 * torqueDirection;
        if (next >= 100) {
          next = 100;
          setTorqueDirection(-1);
        } else if (next <= 0) {
          next = 0;
          setTorqueDirection(1);
        }
        return next;
      });
    }, 40);
  };

  const stopTorqueGauge = () => {
    if (activeBoltIndex === null) return;
    if (torqueIntervalRef.current) {
      clearInterval(torqueIntervalRef.current);
      torqueIntervalRef.current = null;
    }

    // Evaluate torque timing (optimal is between 70% and 85%)
    const finalTorque = torqueGauge;
    let tightnessGained = 0;
    let rating = 1.0;

    if (finalTorque >= 70 && finalTorque <= 85) {
      tightnessGained = 50; // Perfect!
      rating = 1.2;
      sfx.playSuccess();
    } else if (finalTorque > 50 && finalTorque < 95) {
      tightnessGained = 25; // Good
      rating = 0.9;
      sfx.playWrenchClick();
    } else {
      tightnessGained = 10; // Poor
      rating = 0.5;
      sfx.playFailure();
    }

    const updatedTightness = [...boltTightness];
    updatedTightness[activeBoltIndex] = Math.min(100, updatedTightness[activeBoltIndex] + tightnessGained);
    setBoltTightness(updatedTightness);

    // Rotate bolt visually
    const updatedAngles = [...boltAngles];
    updatedAngles[activeBoltIndex] = (updatedAngles[activeBoltIndex] + 45) % 360;
    setBoltAngles(updatedAngles);

    // Check if all bolts are fully tightened
    const allDone = updatedTightness.every((t) => t >= 100);
    if (allDone) {
      // Step complete!
      onCompleteStep(fault.currentStepIndex, rating);
    }

    setActiveBoltIndex(null);
    setTorqueGauge(0);
  };

  // Sealing / Patching drag event handler
  const handleLeakDrag = (e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>) => {
    if (selectedTool !== 'tape_dispenser') return;
    if (!isSealing) return;

    // Verify inventory of tape
    if ((inventoryParts['seal_tape'] || 0) <= 0 && leakSealPercent === 0) {
      return; // No tape left
    }

    // Rubbing action increases seal percentage
    setLeakSealPercent((prev) => {
      const next = prev + 1.2;
      if (next >= 100) {
        setIsSealing(false);
        if (leakSoundRef.current) {
          leakSoundRef.current.stop();
          leakSoundRef.current = null;
        }
        sfx.playSuccess();
        onCompleteStep(fault.currentStepIndex, 1.2);
        return 100;
      }
      return next;
    });

    // Sound effect and sporadic spark/hiss trigger
    if (Math.random() < 0.15) {
      sfx.playWeld();
    }
  };

  // Wiring minigame wire draw
  const connectWire = (wireId: string) => {
    if (selectedTool !== 'soldering_iron') return;
    
    sfx.playSpark();
    const updated = { ...wireConnections, [wireId]: true };
    setWireConnections(updated);

    const allConnected = Object.values(updated).every((c) => c === true);
    if (allConnected) {
      sfx.playSuccess();
      onCompleteStep(fault.currentStepIndex, 1.1);
    }
  };

  // Adjust Calibration Dial
  const handleDialAdjust = (val: number) => {
    if (selectedTool !== 'multimeter') return;
    setValvePressure(val);
    sfx.playWrenchClick();

    // Check if pressure is balanced perfectly at 5.5 bar (with a small margin of tolerance)
    if (Math.abs(val - 5.5) < 0.15) {
      sfx.playSuccess();
      onCompleteStep(fault.currentStepIndex, 1.3);
    }
  };

  const currentStep = fault.steps[fault.currentStepIndex];

  return (
    <div className="bg-[#0d0d0d] border border-zinc-800 rounded-xl p-6 shadow-2xl flex flex-col md:grid md:grid-cols-12 gap-6 h-full select-none">
      
      {/* LEFT COL: Mechanic Panel & Instructions */}
      <div className="md:col-span-4 flex flex-col justify-between border-b md:border-b-0 md:border-r border-zinc-800 pb-4 md:pb-0 md:pr-6">
        <div>
          <div className="flex justify-between items-start gap-2">
            <div>
              <span className="text-[10px] text-orange-500 font-mono font-bold uppercase tracking-wider bg-orange-950/40 px-2 py-0.5 rounded border border-orange-900/40">
                FAENA CRÍTICA
              </span>
              <h3 className="text-xl font-bold text-zinc-200 mt-2 font-sans tracking-wide">
                {fault.machineName}
              </h3>
              <p className="text-xs text-zinc-500 font-mono mt-0.5">{fault.roomName}</p>
            </div>
            <button
              onClick={() => setShowInstructions(!showInstructions)}
              className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
              title="Mostrar Instrucciones"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
          </div>

          {/* Fault Status Card */}
          <div className="mt-4 p-3 bg-[#050505] border border-zinc-800 rounded-lg">
            <div className="flex justify-between text-xs text-zinc-400 font-mono">
              <span>FALLO DETECTADO:</span>
              <span className="text-orange-500 font-bold uppercase">
                {fault.type === 'leak' ? 'Fuga de Gas R717' : fault.type === 'loose_bolts' ? 'Ajuste Incompleto' : fault.type === 'burnt_wiring' ? 'Cortocircuito' : 'Presión Desbalanceada'}
              </span>
            </div>
            
            {/* Visual threat meter */}
            <div className="mt-2.5 flex justify-between items-center">
              <span className="text-[10px] text-zinc-500 font-mono">TIEMPO LÍMITE:</span>
              <span className="text-xs font-mono text-red-400 font-bold animate-pulse">{fault.timeLeft}s</span>
            </div>
            <div className="w-full bg-zinc-900 h-1.5 rounded-full mt-1.5 overflow-hidden border border-zinc-800">
              <div
                className="bg-orange-500 h-full transition-all duration-1000"
                style={{ width: `${(fault.timeLeft / fault.maxTime) * 100}%` }}
              />
            </div>
          </div>

          {/* Step Instructions */}
          {currentStep && (
            <div className="mt-4 p-4 bg-orange-950/10 border border-orange-900/40 rounded-lg">
              <div className="text-[10px] font-bold text-orange-400 font-mono tracking-wider uppercase">
                PASO ACTUAL ({fault.currentStepIndex + 1} / {fault.steps.length})
              </div>
              <p className="text-sm font-semibold text-zinc-200 mt-1.5 leading-relaxed">
                {currentStep.instruction}
              </p>
              
              {/* Part Required Reminder */}
              {currentStep.partRequired && (
                <div className="mt-3 flex items-center justify-between text-xs font-mono bg-black/40 p-2 rounded border border-zinc-800">
                  <span className="text-zinc-400">Pieza Requerida:</span>
                  <span className={`font-bold ${inventoryParts[currentStep.partRequired] > 0 ? 'text-orange-400' : 'text-red-400'}`}>
                    {currentStep.partRequired === 'gasket' ? 'Empacadura' : currentStep.partRequired === 'seal_tape' ? 'Cinta' : currentStep.partRequired === 'wire' ? 'Cable' : 'Amoníaco'} ({inventoryParts[currentStep.partRequired] || 0} disp.)
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Toolbox Section */}
        <div className="mt-6">
          <span className="text-[10px] text-zinc-500 font-mono block mb-2.5 tracking-wider uppercase">SELECCIONAR HERRAMIENTA DE TRABAJO:</span>
          <div className="grid grid-cols-4 gap-2">
            
            {/* Tool 1: Wrench */}
            <button
              onClick={() => setSelectedTool(selectedTool === 'wrench' ? null : 'wrench')}
              className={`p-3 rounded-lg border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                selectedTool === 'wrench'
                  ? 'bg-orange-500/10 border-orange-500 text-orange-400 shadow-lg'
                  : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 text-zinc-400'
              }`}
            >
              <Wrench className="w-5 h-5" />
              <span className="text-[9px] font-mono tracking-wider">LLAVE</span>
            </button>

            {/* Tool 2: Tape Dispenser */}
            <button
              onClick={() => setSelectedTool(selectedTool === 'tape_dispenser' ? null : 'tape_dispenser')}
              className={`p-3 rounded-lg border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                selectedTool === 'tape_dispenser'
                  ? 'bg-orange-500/10 border-orange-500 text-orange-400 shadow-lg'
                  : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 text-zinc-400'
              }`}
            >
              <Droplet className="w-5 h-5" />
              <span className="text-[9px] font-mono tracking-wider">CINTA</span>
            </button>

            {/* Tool 3: Soldering Iron */}
            <button
              onClick={() => setSelectedTool(selectedTool === 'soldering_iron' ? null : 'soldering_iron')}
              className={`p-3 rounded-lg border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                selectedTool === 'soldering_iron'
                  ? 'bg-orange-500/10 border-orange-500 text-orange-400 shadow-lg'
                  : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 text-zinc-400'
              }`}
            >
              <Activity className="w-5 h-5" />
              <span className="text-[9px] font-mono tracking-wider">CAUTÍN</span>
            </button>

            {/* Tool 4: Multimeter */}
            <button
              onClick={() => setSelectedTool(selectedTool === 'multimeter' ? null : 'multimeter')}
              className={`p-3 rounded-lg border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                selectedTool === 'multimeter'
                  ? 'bg-orange-500/10 border-orange-500 text-orange-400 shadow-lg'
                  : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 text-zinc-400'
              }`}
            >
              <Settings className="w-5 h-5" />
              <span className="text-[9px] font-mono tracking-wider">DIAL</span>
            </button>

          </div>
        </div>

        {/* Action Controls */}
        <div className="mt-6 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-mono text-xs font-semibold py-2.5 px-4 rounded-lg cursor-pointer transition-all uppercase tracking-wider flex items-center justify-center gap-1.5"
          >
            <RotateCcw className="w-4 h-4" />
            Retirarse
          </button>
        </div>
      </div>

      {/* RIGHT COL: High-Resolution 2D Aerial Isometric Engine */}
      <div className="md:col-span-8 flex flex-col justify-between bg-black rounded-xl border border-zinc-900 p-4 relative h-full min-h-[440px] overflow-hidden">
        
        {/* Hologram Overlay Screen Lines */}
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(18,18,24,0)_95%,rgba(0,255,150,0.03)_95%)] bg-[size:100%_24px] pointer-events-none z-10"></div>
        
        {/* Visual Engine Header HUD */}
        <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500 border-b border-zinc-900 pb-2 mb-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-ping inline-block"></span>
            <span>LIVE MECHANICAL ANALYSIS ENGINE v1.2</span>
          </div>
          <div>ROTACIÓN: 120º ISOMÉTRICO</div>
        </div>

        {/* Dynamic Interactive Render */}
        <div className="flex-1 flex items-center justify-center relative bg-zinc-950 rounded border border-zinc-900/60 overflow-hidden min-h-[300px]">
          
          <AnimatePresence>
            {showInstructions && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute inset-0 bg-black/90 p-6 flex flex-col justify-center items-center text-center z-20"
              >
                <div className="w-12 h-12 bg-orange-500/10 border border-orange-500/40 rounded-full flex items-center justify-center text-orange-400 mb-4 animate-pulse">
                  <ToolIcon className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-zinc-100 uppercase tracking-wide">
                  Instrucciones de Reparación Crítica
                </h4>
                <p className="text-xs text-zinc-400 mt-2 max-w-md leading-relaxed">
                  Para reparar esta máquina, debes realizar la acción indicada a la izquierda usando las herramientas del panel técnico.
                  <br /><br />
                  <strong className="text-orange-400">Pernos Flojos:</strong> Selecciona la llave. Haz clic/toque en cada perno y mantén presionado. Suelta exactamente cuando la aguja llegue a la zona verde de torque.
                  <br /><br />
                  <strong className="text-sky-400">Fugas de Gas:</strong> Selecciona la cinta. Mantén presionado y desliza por encima del tubo con escape para sellar el gas a presión.
                </p>
                <button
                  onClick={() => setShowInstructions(false)}
                  className="mt-5 px-5 py-2 bg-orange-600 hover:bg-orange-500 text-black text-xs font-bold rounded cursor-pointer font-mono tracking-wider transition-all uppercase"
                >
                  Entendido, Comenzar
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Isometric Mechanical SVG Assembly Drawing */}
          <svg
            className="w-full h-full max-w-[500px] max-h-[340px]"
            viewBox="0 0 400 300"
            onMouseMove={handleLeakDrag}
            onTouchMove={(e) => {
              if (e.touches[0]) handleLeakDrag(e as any);
            }}
          >
            
            {/* Ambient Shadow under the motor */}
            <ellipse cx="200" cy="220" rx="140" ry="40" fill="rgba(0,0,0,0.5)" />

            {/* Draw R717 Liquid Pipelines and valves */}
            <g id="pipelines" opacity="0.8">
              {/* Copper Piping coming from ground */}
              <path d="M 80 240 L 80 160 L 140 160" fill="none" stroke="#2563eb" strokeWidth="10" strokeLinecap="round" />
              <path d="M 80 240 L 80 160 L 140 160" fill="none" stroke="#60a5fa" strokeWidth="4" strokeLinecap="round" />
              
              {/* Hot Gas Output pipeline */}
              <path d="M 260 160 L 320 160 L 320 240" fill="none" stroke="#dc2626" strokeWidth="10" strokeLinecap="round" />
              <path d="M 260 160 L 320 160 L 320 240" fill="none" stroke="#f87171" strokeWidth="4" strokeLinecap="round" />
            </g>

            {/* Central Compressor Isometric Body (Drawn dynamically) */}
            <g id="compressor-motor">
              {/* Stator Casing (Cylinder isometric representation) */}
              <polygon points="120,130 280,130 280,190 120,190" fill="#1e293b" stroke="#334155" strokeWidth="2" />
              <ellipse cx="120" cy="160" rx="20" ry="30" fill="#0f172a" stroke="#334155" strokeWidth="2" />
              <ellipse cx="280" cy="160" rx="20" ry="30" fill="#1e293b" stroke="#334155" strokeWidth="2" />

              {/* Cooling Ribs (Isometric bands) */}
              <line x1="160" y1="130" x2="160" y2="190" stroke="#334155" strokeWidth="4" />
              <line x1="180" y1="130" x2="180" y2="190" stroke="#334155" strokeWidth="4" />
              <line x1="200" y1="130" x2="200" y2="190" stroke="#334155" strokeWidth="4" />
              <line x1="220" y1="130" x2="220" y2="190" stroke="#334155" strokeWidth="4" />
              <line x1="240" y1="130" x2="240" y2="190" stroke="#334155" strokeWidth="4" />

              {/* Stator terminal junction box */}
              <polygon points="170,110 230,110 240,130 160,130" fill="#475569" stroke="#64748b" strokeWidth="1.5" />
            </g>

            {/* MECHANICAL FAULT SCENARIO 1: LOOSE BOLTS */}
            {fault.type === 'loose_bolts' && (
              <g id="bolts-game">
                {/* 4 Bolts around the casing rim */}
                {[
                  { cx: 120, cy: 140, id: 0 },
                  { cx: 120, cy: 180, id: 1 },
                  { cx: 280, cy: 140, id: 2 },
                  { cx: 280, cy: 180, id: 3 },
                ].map((bolt) => {
                  const tight = boltTightness[bolt.id];
                  const angle = boltAngles[bolt.id];
                  const active = activeBoltIndex === bolt.id;

                  return (
                    <g key={bolt.id} className="cursor-pointer">
                      {/* Vibrate effect if not fully tight */}
                      <g transform={`translate(${tight < 100 ? (Math.random() - 0.5) * 2 : 0}, 0)`}>
                        <circle
                          cx={bolt.cx}
                          cy={bolt.cy}
                          r="9"
                          fill={tight >= 100 ? '#10b981' : active ? '#f59e0b' : '#334155'}
                          stroke="#64748b"
                          strokeWidth="2.5"
                          onMouseDown={() => startTorqueGauge(bolt.id)}
                          onMouseUp={stopTorqueGauge}
                          onTouchStart={() => startTorqueGauge(bolt.id)}
                          onTouchEnd={stopTorqueGauge}
                        />
                        {/* Wrench indicator on hover */}
                        {selectedTool === 'wrench' && tight < 100 && (
                          <g transform={`translate(${bolt.cx - 24}, ${bolt.cy - 12}) scale(0.85)`} className="pointer-events-none">
                            <path d="M0,0 L12,4 L12,12 L0,8 Z" fill="#f59e0b" />
                          </g>
                        )}
                        {/* Screw alignment indicator line */}
                        <line
                          x1={bolt.cx - Math.cos((angle * Math.PI) / 180) * 5}
                          y1={bolt.cy - Math.sin((angle * Math.PI) / 180) * 5}
                          x2={bolt.cx + Math.cos((angle * Math.PI) / 180) * 5}
                          y2={bolt.cy + Math.sin((angle * Math.PI) / 180) * 5}
                          stroke="#ffffff"
                          strokeWidth="2.5"
                        />
                      </g>
                    </g>
                  );
                })}
              </g>
            )}

            {/* MECHANICAL FAULT SCENARIO 2: LEAK */}
            {fault.type === 'leak' && (
              <g id="leak-game">
                {/* Hissing Leak Gas Spray Particle Simulation */}
                {leakSealPercent < 100 && (
                  <g>
                    <ellipse cx="290" cy="160" rx="15" ry="15" fill="none" />
                    {/* Animated steam rings escaping */}
                    <circle cx="290" cy="160" r="10" fill="none" stroke="rgba(16,185,129,0.3)" strokeWidth="1.5">
                      <animate attributeName="r" values="5;35" dur="1s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="1;0" dur="1s" repeatCount="indefinite" />
                    </circle>
                    <circle cx="290" cy="160" r="15" fill="none" stroke="rgba(16,185,129,0.2)" strokeWidth="1">
                      <animate attributeName="r" values="10;50" dur="1.3s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.8;0" dur="1.3s" repeatCount="indefinite" />
                    </circle>
                    
                    {/* Hissing gas indicator text */}
                    <text x="295" y="130" fill="#10b981" fontSize="10" fontFamily="monospace" fontWeight="bold">
                      FUGA (R717) !
                    </text>
                  </g>
                )}

                {/* Leak Joint (Interactive Target) */}
                <circle
                  cx="290"
                  cy="160"
                  r="24"
                  fill="transparent"
                  className="cursor-crosshair"
                  onMouseDown={() => setIsSealing(true)}
                  onMouseUp={() => setIsSealing(false)}
                  onTouchStart={() => setIsSealing(true)}
                  onTouchEnd={() => setIsSealing(false)}
                />

                {/* Drawn Seal Bandage (increases as progress completes) */}
                {leakSealPercent > 0 && (
                  <rect
                    x="280"
                    y="150"
                    width="20"
                    height={Math.floor(20 * (leakSealPercent / 100))}
                    fill="#3b82f6"
                    stroke="#1d4ed8"
                    strokeWidth="1.5"
                    opacity="0.85"
                  />
                )}
              </g>
            )}

            {/* MECHANICAL FAULT SCENARIO 3: BURNT WIRING */}
            {fault.type === 'burnt_wiring' && (
              <g id="wiring-game" transform="translate(140, 90)">
                {/* Visual expansion zoom of the terminal plate */}
                <rect x="0" y="0" width="120" height="90" fill="#1c1d22" stroke="#374151" strokeWidth="2.5" rx="6" />
                <text x="10" y="20" fill="#9ca3af" fontSize="8" fontFamily="monospace">J_BOX REGLETA CRÍOTÉCNICA</text>

                {/* Wires Terminals */}
                {/* 1. Ground wire (A to B) */}
                <g>
                  {/* Left node (A) */}
                  <circle cx="20" cy="40" r="6" fill="#ef4444" stroke="#ffffff" strokeWidth="1" />
                  <text x="18" y="52" fill="#fff" fontSize="8">1</text>
                  
                  {/* Right node (B) */}
                  <circle cx="100" cy="40" r="6" fill="#ef4444" stroke="#ffffff" strokeWidth="1" />
                  <text x="98" y="52" fill="#fff" fontSize="8">A</text>

                  {/* Connected line */}
                  {wireConnections['1-a'] ? (
                    <line x1="26" y1="40" x2="94" y2="40" stroke="#ef4444" strokeWidth="4" strokeLinecap="round" />
                  ) : (
                    <g className="cursor-pointer" onClick={() => connectWire('1-a')}>
                      <path d="M 26 40 L 45 42 L 50 35 L 70 45 L 94 40" fill="none" stroke="#ef4444" strokeWidth="2" strokeDasharray="3,3" />
                      <line x1="50" y1="35" x2="70" y2="45" stroke="#ef4444" strokeWidth="1" />
                      <circle cx="60" cy="40" r="10" fill="rgba(239,68,68,0.15)" stroke="#ef4444" strokeWidth="1" className="animate-ping" />
                    </g>
                  )}
                </g>

                {/* 2. Feedback wire (C to D) */}
                <g>
                  {/* Left node (C) */}
                  <circle cx="20" cy="70" r="6" fill="#3b82f6" stroke="#ffffff" strokeWidth="1" />
                  <text x="18" y="82" fill="#fff" fontSize="8">2</text>
                  
                  {/* Right node (D) */}
                  <circle cx="100" cy="70" r="6" fill="#3b82f6" stroke="#ffffff" strokeWidth="1" />
                  <text x="98" y="82" fill="#fff" fontSize="8">B</text>

                  {/* Connected line */}
                  {wireConnections['2-b'] ? (
                    <line x1="26" y1="70" x2="94" y2="70" stroke="#3b82f6" strokeWidth="4" strokeLinecap="round" />
                  ) : (
                    <g className="cursor-pointer" onClick={() => connectWire('2-b')}>
                      <path d="M 26 70 L 45 75 L 50 65 L 75 75 L 94 70" fill="none" stroke="#3b82f6" strokeWidth="2" strokeDasharray="3,3" />
                      <circle cx="60" cy="70" r="10" fill="rgba(59,130,246,0.15)" stroke="#3b82f6" strokeWidth="1" className="animate-ping" />
                    </g>
                  )}
                </g>
              </g>
            )}

            {/* MECHANICAL FAULT SCENARIO 4: CLOGGED FILTER (Pressure Calibrator Dial) */}
            {fault.type === 'clogged_filter' && (
              <g id="dial-game" transform="translate(130, 80)">
                <rect x="0" y="0" width="140" height="120" fill="#1f2937" stroke="#374151" strokeWidth="3" rx="8" />
                <circle cx="70" cy="65" r="40" fill="#0f172a" stroke="#4b5563" strokeWidth="3" />
                
                {/* Safe Green Zone indicator */}
                <path d="M 42 36 A 40 40 0 0 1 98 36" fill="none" stroke="#10b981" strokeWidth="5" />
                
                {/* Needle drawing */}
                {/* Map pressure (0 to 10 bar) to angle (-120deg to +120deg) */}
                {/* Target: 5.5 bar */}
                <g transform={`translate(70, 65) rotate(${((valvePressure - 5) * 40)})`}>
                  <line x1="0" y1="0" x2="0" y2="-34" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
                  <circle cx="0" cy="0" r="5" fill="#f3f4f6" />
                </g>

                <text x="70" y="112" textAnchor="middle" fill="#9ca3af" fontSize="8" fontFamily="monospace">OBJETIVO: BALANCE 5.5 bar</text>
                <text x="70" y="85" textAnchor="middle" fill="#fff" fontSize="10" fontFamily="monospace" fontWeight="bold">
                  {valvePressure.toFixed(1)} bar
                </text>
              </g>
            )}

          </svg>

          {/* DYNAMIC TORQUE GAUGE HUD (Overlay when tightening bolts) */}
          <AnimatePresence>
            {activeBoltIndex !== null && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 15 }}
                className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/95 border border-zinc-800 rounded-lg p-3 w-72 shadow-2xl z-20"
              >
                <div className="flex justify-between items-center text-[10px] font-mono mb-1.5">
                  <span className="text-zinc-400 font-bold uppercase">ALINEACIÓN DE PAR (PERNO {activeBoltIndex + 1})</span>
                  <span className={`font-bold ${torqueGauge >= 70 && torqueGauge <= 85 ? 'text-emerald-400' : 'text-zinc-500'}`}>
                    {torqueGauge}%
                  </span>
                </div>
                
                {/* Torque Meter bar */}
                <div className="w-full bg-zinc-900 h-4 rounded-md overflow-hidden relative border border-zinc-800">
                  {/* Optimal release range (70% to 85%) */}
                  <div className="absolute top-0 bottom-0 left-[70%] right-[15%] bg-emerald-500/35 border-l border-r border-emerald-400/60" />
                  
                  {/* Dynamic slider cursor */}
                  <div
                    className="absolute top-0 bottom-0 w-1.5 bg-amber-500 border border-black transition-all"
                    style={{ left: `${torqueGauge}%` }}
                  />
                </div>
                
                <div className="text-[9px] text-center font-mono text-zinc-500 mt-2 tracking-wider">
                  ¡SUELTA EL PERNO EN LA <span className="text-emerald-400 font-bold">FRANJA VERDE</span> DE PRECISIÓN!
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Leak sealing progress overlay */}
          {selectedTool === 'tape_dispenser' && fault.type === 'leak' && (
            <div className="absolute top-3 left-3 bg-zinc-900/95 border border-zinc-800 rounded px-2.5 py-1 text-[10px] font-mono flex items-center gap-1.5 z-10 text-zinc-300">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse"></span>
              <span>CINTA NANOPOLÍMERO: {100 - leakSealPercent}% RESTANTE</span>
            </div>
          )}

          {/* Calibration sliding input controller */}
          {selectedTool === 'multimeter' && fault.type === 'clogged_filter' && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/90 border border-zinc-800 rounded-lg p-3 w-80 flex flex-col items-center gap-1 shadow-2xl z-20">
              <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Ajuste de Presión de Válvula</span>
              <input
                type="range"
                min="0.5"
                max="9.5"
                step="0.1"
                value={valvePressure}
                onChange={(e) => handleDialAdjust(parseFloat(e.target.value))}
                className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 my-2"
              />
              <span className="text-[9px] font-mono text-zinc-500">Desliza para balancear el sistema a exactamente 5.5 bar</span>
            </div>
          )}

        </div>

        {/* Dynamic Warning Messages & Realtime State Progress */}
        <div className="flex justify-between items-center mt-3 pt-3 border-t border-zinc-900 text-xs font-mono">
          <div className="flex items-center gap-1.5 text-zinc-400">
            <span>Reputación de Planta:</span>
            <span className="text-emerald-400 font-bold">ESTABLE</span>
          </div>
          <div className="flex items-center gap-1.5 text-zinc-400">
            <span>Precisión Estimada:</span>
            <span className="text-amber-400 font-bold">94%</span>
          </div>
        </div>

      </div>

    </div>
  );
}
