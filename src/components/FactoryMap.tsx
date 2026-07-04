import React from 'react';
import { MachineFault, ROOMS } from '../types';
import { ShieldAlert, CheckCircle, Flame, Snowflake, RefreshCw, AlertTriangle } from 'lucide-react';
import { motion } from 'motion/react';

interface FactoryMapProps {
  faults: MachineFault[];
  onSelectFault: (fault: MachineFault) => void;
  reputation: number;
}

export default function FactoryMap({ faults, onSelectFault, reputation }: FactoryMapProps) {
  // Find faults belonging to each room
  const getFaultForRoom = (roomId: string) => {
    return faults.find((f) => f.roomId === roomId);
  };

  return (
    <div className="bg-[#0d0d0d] border border-zinc-800 rounded-xl p-6 relative shadow-2xl overflow-hidden flex flex-col h-full select-none">
      {/* SCADA Header Panel */}
      <div className="flex flex-wrap justify-between items-center border-b border-zinc-800 pb-4 mb-4 gap-4">
        <div>
          <h2 className="text-xl font-sans font-semibold tracking-wider text-orange-500 uppercase flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 bg-orange-500 rounded-full animate-ping"></span>
            SCADA R717: Circuito Primario & Secundario
          </h2>
          <p className="text-xs text-zinc-500 font-mono mt-0.5">ESTADO GENERAL DE PRESIÓN Y TEMPERATURA</p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-6 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-zinc-900 border border-zinc-800 inline-block"></span>
            <span className="text-zinc-500">Normal</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-orange-500/20 border border-orange-500 inline-block animate-pulse"></span>
            <span className="text-orange-400">Crítico (Alarma)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-amber-500/20 border border-amber-500 inline-block"></span>
            <span className="text-amber-400">Atención</span>
          </div>
        </div>
      </div>

      {/* Interactive Blueprint Canvas using custom SVGs and CSS Layout */}
      <div className="flex-1 min-h-[480px] bg-[#050505] border border-zinc-900 rounded-lg p-4 relative overflow-auto scrollbar-thin scrollbar-thumb-zinc-800">
        
        {/* Decorative SCADA Grid Lines */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293708_1px,transparent_1px),linear-gradient(to_bottom,#1f293708_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>

        {/* SVG Flowing Ammonia Pipelines (Matching R717 theme) */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ minWidth: '800px', minHeight: '440px' }}>
          {/* Main distribution pipeline loops */}
          <path d="M 50 120 L 750 120 L 750 380 L 50 380 Z" fill="none" stroke="#ea580c" strokeWidth="2" strokeOpacity="0.15" />
          <path d="M 50 120 L 750 120 L 750 380 L 50 380 Z" fill="none" stroke="#f97316" strokeWidth="1.5" strokeDasharray="8,15" strokeDashoffset="10" className="animate-[dash_20s_linear_infinite]" />
          
          {/* Secondary return pipeline */}
          <path d="M 80 140 L 720 140 L 720 350 L 80 350 Z" fill="none" stroke="#ef4444" strokeWidth="1.5" strokeOpacity="0.1" />
          <path d="M 80 140 L 720 140 L 720 350 L 80 350 Z" fill="none" stroke="#ef4444" strokeWidth="1" strokeDasharray="5,12" strokeDashoffset="5" className="animate-[dash_15s_linear_infinite]" />
          
          {/* Central compression line to Servicios Planta B */}
          <path d="M 400 60 L 400 420" fill="none" stroke="#ea580c" strokeWidth="2" strokeOpacity="0.2" />
        </svg>

        {/* Main Plant Blueprint Layout (Grid/Absolute placement mirroring the photo) */}
        <div className="relative w-full h-full min-w-[850px] min-h-[420px] grid grid-cols-12 grid-rows-6 gap-3 p-2 font-mono">
          
          {/* ZONE 1: TÚNEL DE CONGELACIÓN (Extreme Low Temp) */}
          <div className="col-span-3 row-span-3 border border-sky-900/40 rounded bg-sky-950/20 relative flex flex-col justify-between p-3 group transition-all duration-300 hover:border-sky-500/50">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] text-zinc-500 block">ZONA CRÍTICA - R717</span>
                <span className="text-xs font-semibold text-zinc-300">Túnel de Congelación</span>
              </div>
              <Snowflake className="w-4 h-4 text-sky-400" />
            </div>

            {/* Simulated live temperature readout */}
            <div className="my-2">
              <span className="text-2xl font-bold text-sky-400 tracking-tight">-30.4 ºC</span>
              <div className="text-[10px] text-zinc-500 flex items-center gap-1.5 mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Presión: 1.2 bar
              </div>
            </div>

            {/* Alert / Interactive Trigger */}
            <RoomStatus roomId="tunel_congelacion" fault={getFaultForRoom('tunel_congelacion')} onSelect={onSelectFault} />
          </div>

          {/* ZONE 2: CÁMARA CONGELADO 1 */}
          <div className="col-span-3 row-span-3 border border-sky-900/40 rounded bg-sky-950/20 relative flex flex-col justify-between p-3 transition-all hover:border-sky-500/50">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] text-zinc-500 block">CÁMARA CONGELADOS</span>
                <span className="text-xs font-semibold text-zinc-300">Cámara Congelado 1</span>
              </div>
              <Snowflake className="w-4 h-4 text-sky-500" />
            </div>

            <div className="my-2">
              <span className="text-2xl font-bold text-sky-500 tracking-tight">-18.2 ºC</span>
              <div className="text-[10px] text-zinc-500 flex items-center gap-1.5 mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Presión: 2.1 bar
              </div>
            </div>

            <RoomStatus roomId="camara_congelado_1" fault={getFaultForRoom('camara_congelado_1')} onSelect={onSelectFault} />
          </div>

          {/* ZONE 3: CÁMARA CONGELADO 2 */}
          <div className="col-span-3 row-span-3 border border-sky-900/40 rounded bg-sky-950/20 relative flex flex-col justify-between p-3 transition-all hover:border-sky-500/50">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] text-zinc-500 block">CÁMARA CONGELADOS</span>
                <span className="text-xs font-semibold text-zinc-300">Cámara Congelado 2</span>
              </div>
              <Snowflake className="w-4 h-4 text-sky-500" />
            </div>

            <div className="my-2">
              <span className="text-2xl font-bold text-sky-500 tracking-tight animate-pulse">-17.8 ºC</span>
              <div className="text-[10px] text-zinc-500 flex items-center gap-1.5 mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Presión: 2.1 bar
              </div>
            </div>

            <RoomStatus roomId="camara_congelado_2" fault={getFaultForRoom('camara_congelado_2')} onSelect={onSelectFault} />
          </div>

          {/* ZONE 4: EXTRACCIÓN ZONA HORNO 3 / SERVICIOS PLANTA B */}
          <div className="col-span-3 row-span-6 border border-zinc-800/80 rounded bg-zinc-900/10 relative flex flex-col justify-between p-3 transition-all hover:border-zinc-700">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] text-orange-500 block">SISTEMAS CENTRALES</span>
                <span className="text-xs font-semibold text-zinc-200">Servicios Planta B</span>
              </div>
              <Flame className="w-4 h-4 text-orange-500 animate-pulse" />
            </div>

            <div className="my-2 space-y-3 bg-black/40 p-2.5 rounded border border-zinc-800/40 font-mono">
              <div>
                <span className="text-xs text-zinc-500 block">COMPRESOR AMONÍACO (C-1)</span>
                <span className="text-lg font-bold text-orange-500 tracking-tight">45.2 ºC</span>
                <span className="text-[10px] text-zinc-600 block">Presión Alta: 12.8 bar</span>
              </div>
              <div>
                <span className="text-xs text-zinc-500 block">BOMBA SECUNDARIA (B-2)</span>
                <span className="text-orange-400 font-semibold text-sm">ACTIVA (60 Hz)</span>
              </div>
            </div>

            <RoomStatus roomId="servicios_planta_b" fault={getFaultForRoom('servicios_planta_b')} onSelect={onSelectFault} />
          </div>

          {/* ZONE 5: OBRADOR PICADO (Middle-left) */}
          <div className="col-span-3 row-span-3 border border-zinc-800 rounded bg-[#0d0d0d]/40 relative flex flex-col justify-between p-3 transition-all hover:border-zinc-700">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] text-zinc-500 block">PROCESO PICADO</span>
                <span className="text-xs font-semibold text-zinc-300">Obrador Picado</span>
              </div>
              <RefreshCw className="w-4 h-4 text-orange-500 animate-spin-slow" />
            </div>

            <div className="my-2">
              <span className="text-2xl font-bold text-orange-500 tracking-tight">12.1 ºC</span>
              <div className="text-[10px] text-zinc-500 flex items-center gap-1.5 mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span> Presión: 3.5 bar
              </div>
            </div>

            <RoomStatus roomId="obrador_picado" fault={getFaultForRoom('obrador_picado')} onSelect={onSelectFault} />
          </div>

          {/* ZONE 6: SALA ENVASADO */}
          <div className="col-span-3 row-span-3 border border-zinc-800 rounded bg-[#0d0d0d]/40 relative flex flex-col justify-between p-3 transition-all hover:border-zinc-700">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] text-zinc-500 block">EMBALAJE FINAL</span>
                <span className="text-xs font-semibold text-zinc-300">Sala Envasado</span>
              </div>
              <CheckCircle className="w-4 h-4 text-zinc-500" />
            </div>

            <div className="my-2">
              <span className="text-2xl font-bold text-zinc-300 tracking-tight">14.0 ºC</span>
              <div className="text-[10px] text-zinc-500 flex items-center gap-1.5 mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span> Presión: 3.8 bar
              </div>
            </div>

            <RoomStatus roomId="sala_evasado" fault={getFaultForRoom('sala_evasado')} onSelect={onSelectFault} />
          </div>

          {/* ZONE 7: CÁMARA CONSERVACIÓN */}
          <div className="col-span-3 row-span-3 border border-zinc-800 rounded bg-[#0d0d0d]/40 relative flex flex-col justify-between p-3 transition-all hover:border-zinc-700">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] text-zinc-500 block">RESERVA FRESCA</span>
                <span className="text-xs font-semibold text-zinc-300">Cámara Conservación</span>
              </div>
              <Snowflake className="w-4 h-4 text-sky-400" />
            </div>

            <div className="my-2">
              <span className="text-2xl font-bold text-sky-400 tracking-tight">2.5 ºC</span>
              <div className="text-[10px] text-zinc-500 flex items-center gap-1.5 mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span> Presión: 2.8 bar
              </div>
            </div>

            <RoomStatus roomId="camara_conservacion" fault={getFaultForRoom('camara_conservacion')} onSelect={onSelectFault} />
          </div>

        </div>
      </div>

      {/* Footer warning panel */}
      {faults.length > 0 && (
        <div className="mt-4 p-3 bg-red-950/20 border border-red-900/50 rounded-lg flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-2.5 text-xs text-red-400 font-mono">
            <AlertTriangle className="w-4.5 h-4.5" />
            <span>ALERTA: {faults.length} componente{faults.length > 1 ? 's' : ''} crítico{faults.length > 1 ? 's' : ''} requiere{faults.length > 1 ? 'n' : ''} reparación inmediata.</span>
          </div>
          <span className="text-[10px] text-red-500 font-mono bg-red-950/40 px-2 py-0.5 rounded border border-red-900/30">PRESIÓN INCREMENTANDO</span>
        </div>
      )}
    </div>
  );
}

interface RoomStatusProps {
  roomId: string;
  fault: MachineFault | undefined;
  onSelect: (fault: MachineFault) => void;
}

function RoomStatus({ roomId, fault, onSelect }: RoomStatusProps) {
  if (!fault) {
    return (
      <div className="text-[10px] text-zinc-600 bg-zinc-900/50 border border-zinc-800/60 py-1.5 px-2 rounded flex items-center gap-1.5 font-mono">
        <CheckCircle className="w-3.5 h-3.5 text-zinc-500" />
        Sistemas Estables
      </div>
    );
  }

  const isCritical = fault.severity === 'critical';

  return (
    <button
      onClick={() => onSelect(fault)}
      className={`w-full text-left p-2 rounded border cursor-pointer flex flex-col gap-1 select-none transition-all ${
        isCritical
          ? 'bg-red-950/40 border-red-500/80 hover:bg-red-900/50 text-red-300'
          : 'bg-amber-950/40 border-amber-500/80 hover:bg-amber-900/50 text-amber-300'
      } relative overflow-hidden`}
    >
      {/* Background alarm pulse */}
      <div className={`absolute inset-0 opacity-10 ${isCritical ? 'bg-red-500 animate-pulse' : 'bg-amber-500'}`} />

      <div className="flex items-center justify-between text-[10px] font-bold tracking-wide relative z-10">
        <span className="flex items-center gap-1 uppercase">
          <ShieldAlert className="w-3.5 h-3.5 text-red-400 animate-bounce" />
          {fault.severity === 'critical' ? 'CRÍTICO' : 'ALTA PRIORIDAD'}
        </span>
        <span className="font-mono bg-black/40 px-1 rounded border border-red-900/40 text-red-400">
          {fault.timeLeft}s
        </span>
      </div>

      <div className="text-xs font-semibold relative z-10 truncate">
        {fault.machineName} - {fault.type === 'leak' ? 'Fuga de Gas' : fault.type === 'loose_bolts' ? 'Vibración / Pernos' : fault.type === 'burnt_wiring' ? 'Cortocircuito' : 'Filtro Obstruido'}
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-zinc-950 rounded-full h-1.5 mt-1 overflow-hidden relative z-10 border border-zinc-800">
        <div
          className={`h-full ${isCritical ? 'bg-red-500' : 'bg-amber-500'}`}
          style={{ width: `${(fault.timeLeft / fault.maxTime) * 100}%` }}
        />
      </div>

      <div className="text-[9px] text-right font-bold text-red-400 mt-0.5 relative z-10 tracking-wider">
        PULSAR PARA REPARAR ➜
      </div>
    </button>
  );
}
