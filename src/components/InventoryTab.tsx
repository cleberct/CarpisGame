import React from 'react';
import { SparePart, Tool, INITIAL_PARTS } from '../types';
import { ShoppingCart, ArrowUpCircle, Check, ShieldCheck, Box, Settings, Briefcase, Zap, Info } from 'lucide-react';
import { sfx } from './SoundEffects';

interface InventoryTabProps {
  credits: number;
  inventoryParts: { [key: string]: number };
  tools: Tool[];
  onBuyPart: (partId: string, cost: number) => void;
  onUpgradeTool: (toolId: string, cost: number) => void;
}

export default function InventoryTab({
  credits,
  inventoryParts,
  tools,
  onBuyPart,
  onUpgradeTool,
}: InventoryTabProps) {
  
  const handleBuy = (partId: string, cost: number) => {
    if (credits >= cost) {
      onBuyPart(partId, cost);
      sfx.playSuccess();
    } else {
      sfx.playFailure();
    }
  };

  const handleUpgrade = (tool: Tool) => {
    if (credits >= tool.upgradeCost && tool.level < tool.maxLevel) {
      onUpgradeTool(tool.id, tool.upgradeCost);
      sfx.playLevelUp();
    } else {
      sfx.playFailure();
    }
  };

  return (
    <div className="bg-[#0d0d0d] border border-zinc-800 rounded-xl p-6 shadow-2xl select-none font-mono">
      
      {/* HUD Header */}
      <div className="flex justify-between items-center border-b border-zinc-800 pb-4 mb-6">
        <div>
          <h2 className="text-lg font-bold tracking-wider text-orange-500 uppercase flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-orange-500" />
            Almacén & Taller de Mantenimiento
          </h2>
          <p className="text-[11px] text-zinc-500 mt-0.5">SISTEMA INTEGRAL DE COMPRAS Y ACTUALIZACIÓN DE PIEZAS</p>
        </div>

        {/* Credit display - Styled matching Pressure Timer from Professional Polish theme */}
        <div className="bg-[#1a120b] border border-orange-900/50 px-4 py-2 rounded-lg flex flex-col items-end">
          <span className="text-[9px] text-orange-500 uppercase tracking-widest font-bold">Créditos de Planta</span>
          <span className="text-xl font-bold text-orange-400 tracking-tight">{credits} CR</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* LEFT COLUMN: Spare Parts Shop */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-zinc-300 border-b border-zinc-800 pb-2 flex items-center gap-1.5 uppercase tracking-wide">
            <Box className="w-4 h-4 text-orange-500" />
            Adquisición de Repuestos de Alta Gama
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {INITIAL_PARTS.map((part) => {
              const count = inventoryParts[part.id] || 0;
              const canAfford = credits >= part.cost;

              return (
                <div
                  key={part.id}
                  className="bg-[#050505] border border-zinc-800/80 rounded-lg p-3.5 flex flex-col justify-between hover:border-zinc-700 transition-all group"
                >
                  <div>
                    <div className="flex justify-between items-start gap-1">
                      <span className="text-sm font-bold text-zinc-200 group-hover:text-orange-400 transition-colors">
                        {part.name}
                      </span>
                      <span className="bg-zinc-900 border border-zinc-800 text-orange-400 text-xs font-bold px-2 py-0.5 rounded-full">
                        {count} disp.
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-1.5 leading-relaxed min-h-[30px]">
                      {part.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between">
                    <span className="text-sm font-extrabold text-orange-500">{part.cost} CR</span>
                    <button
                      onClick={() => handleBuy(part.id, part.cost)}
                      disabled={!canAfford}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all cursor-pointer ${
                        canAfford
                          ? 'bg-orange-600 hover:bg-orange-500 text-black font-bold shadow'
                          : 'bg-zinc-900 text-zinc-600 border border-zinc-800 cursor-not-allowed'
                      }`}
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      Comprar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: Tool Upgrades */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-zinc-300 border-b border-zinc-800 pb-2 flex items-center gap-1.5 uppercase tracking-wide">
            <Settings className="w-4 h-4 text-orange-500" />
            Optimización de Herramientas del Técnico
          </h3>

          <div className="space-y-3">
            {tools.map((tool) => {
              const isMax = tool.level >= tool.maxLevel;
              const canAfford = credits >= tool.upgradeCost;

              return (
                <div
                  key={tool.id}
                  className="bg-[#050505] border border-zinc-800/80 rounded-lg p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-zinc-700 transition-all"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-zinc-100">{tool.name}</span>
                      <span className="text-[10px] bg-orange-500/10 border border-orange-500/30 text-orange-400 px-2 py-0.5 rounded uppercase">
                        Nivel {tool.level} / {tool.maxLevel}
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-500 leading-relaxed">{tool.description}</p>
                    
                    <div className="flex items-center gap-3 pt-1 text-[10px]">
                      <span className="text-orange-400 font-bold flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        Bonificación: {((tool.efficiencyBonus - 1) * 100).toFixed(0)}% rapidez
                      </span>
                    </div>
                  </div>

                  {/* Upgrade Button Action */}
                  <div className="flex flex-col items-end gap-1.5 self-end md:self-center">
                    {isMax ? (
                      <span className="bg-orange-500/10 border border-orange-500/40 text-orange-400 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-bold">
                        <ShieldCheck className="w-4 h-4" />
                        MÁXIMO
                      </span>
                    ) : (
                      <button
                        onClick={() => handleUpgrade(tool)}
                        disabled={!canAfford}
                        className={`text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                          canAfford
                            ? 'bg-orange-600 hover:bg-orange-500 text-black font-bold shadow-lg shadow-orange-500/10'
                            : 'bg-zinc-900 text-zinc-600 border border-zinc-800 cursor-not-allowed'
                        }`}
                      >
                        <ArrowUpCircle className="w-4 h-4" />
                        Actualizar ({tool.upgradeCost} CR)
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Info Tip Block */}
      <div className="mt-6 p-4 bg-zinc-900/30 border border-zinc-800 rounded-lg flex items-start gap-3">
        <Info className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
        <div className="text-[11px] text-zinc-500 leading-relaxed">
          <strong className="text-zinc-400 block mb-1">REGLA GENERAL DEL REPARADOR:</strong>
          Tener un buen stock de repuestos en el inventario evita penalizaciones por falta de piezas durante el transcurso de una emergencia. Los créditos se consiguen logrando que los sistemas queden estables con la máxima precisión posible en los ajustes y un tiempo mínimo de resolución.
        </div>
      </div>

    </div>
  );
}
