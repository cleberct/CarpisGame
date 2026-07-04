import React from 'react';
import { ProductionMessage } from '../types';
import { MessageSquare, Users, ShieldAlert, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ProductionChatProps {
  messages: ProductionMessage[];
}

export default function ProductionChat({ messages }: ProductionChatProps) {
  return (
    <div className="bg-[#0d0d0d] border border-zinc-800 rounded-xl p-4 flex flex-col h-full shadow-xl select-none font-mono">
      
      {/* Sidebar Header */}
      <div className="flex justify-between items-center border-b border-zinc-850 pb-3 mb-3 shrink-0">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-orange-500 animate-pulse" />
          <span className="text-xs font-bold text-zinc-300 tracking-wider uppercase">Canal de Operaciones</span>
        </div>
        <span className="text-[10px] bg-orange-950/40 text-orange-400 border border-orange-900/40 px-2 py-0.5 rounded uppercase font-bold">
          En Vivo
        </span>
      </div>

      {/* Messages Scroll Container */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[350px] scrollbar-thin scrollbar-thumb-zinc-800">
        <AnimatePresence initial={false}>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center gap-2 text-zinc-600">
              <MessageSquare className="w-8 h-8 opacity-40" />
              <p className="text-[10px] uppercase">Sin incidentes de comunicación</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isUrgent = msg.urgency === 'high';

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className={`p-3 rounded border text-[11px] leading-relaxed relative ${
                    isUrgent
                      ? 'bg-orange-950/20 border-orange-900/40 text-orange-300'
                      : 'bg-zinc-900/40 border-zinc-800/60 text-zinc-300'
                  }`}
                >
                  {/* Urgency indicator strip */}
                  <div
                    className={`absolute top-0 bottom-0 left-0 w-1 rounded-l ${
                      isUrgent ? 'bg-orange-500' : 'bg-amber-600'
                    }`}
                  />

                  {/* Header metadata */}
                  <div className="flex justify-between items-center mb-1.5 pl-1.5">
                    <span className={`font-bold uppercase tracking-wide text-xs ${isUrgent ? 'text-orange-400' : 'text-amber-500'}`}>
                      {msg.sender}
                    </span>
                    <span className="text-[9px] text-zinc-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {msg.timestamp}
                    </span>
                  </div>

                  {/* Message content */}
                  <p className="pl-1.5 font-sans leading-relaxed text-zinc-300">{msg.text}</p>
                  
                  {/* Status alert pill */}
                  <div className="mt-2.5 flex justify-between items-center pl-1.5 text-[9px] font-mono text-zinc-500">
                    <span className="flex items-center gap-1">
                      {isUrgent ? (
                        <ShieldAlert className="w-3.5 h-3.5 text-orange-500 animate-bounce" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                      )}
                      {isUrgent ? 'DEMANDA OPERATIVA ALTA' : 'ADVERTENCIA'}
                    </span>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

      {/* Production Threat Index */}
      <div className="mt-4 pt-3 border-t border-zinc-800 text-[10px] text-zinc-500 flex justify-between items-center shrink-0">
        <span>Presión de Producción:</span>
        <span className="text-orange-500 font-bold uppercase animate-pulse">Exigente</span>
      </div>

    </div>
  );
}
