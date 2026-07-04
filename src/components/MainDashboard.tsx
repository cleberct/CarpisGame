import React, { useState, useEffect } from 'react';
import { GameState, MachineFault, SparePart, Tool, ROOMS, INITIAL_PARTS, INITIAL_TOOLS, LEVEL_NAMES, LEVEL_THRESHOLDS, ProductionMessage } from '../types';
import FactoryMap from './FactoryMap';
import IsometricRepair from './IsometricRepair';
import InventoryTab from './InventoryTab';
import ProductionChat from './ProductionChat';
import { sfx } from './SoundEffects';
import { ShieldAlert, Trophy, Award, HardHat, TrendingUp, Settings, Briefcase, RefreshCw, AlertTriangle, Play, HelpCircle, Flame, Snowflake, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function MainDashboard() {
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    credits: 120, // initial budget
    xp: 0,
    level: 1,
    reputation: 90, // stable status initially
    inventory: {
      parts: { gasket: 3, seal_tape: 2, wire: 5, refrigerant: 1, grease: 2 },
      tools: { wrench: 1, tape_dispenser: 1, soldering_iron: 1, multimeter: 1 },
    },
    faults: [],
    activeFaultId: null,
    gameStatus: 'intro',
  });

  const [activeTab, setActiveTab] = useState<'map' | 'inventory'>('map');
  const [productionMessages, setProductionMessages] = useState<ProductionMessage[]>([]);
  const [toolsState, setToolsState] = useState<Tool[]>(INITIAL_TOOLS);

  // PWA Install Prompt State & Handlers
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // If running in standalone mode (installed as an app), don't prompt
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstallable(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('El usuario aceptó la instalación.');
    }
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  // Background Game Tick Loop (Runs once per second)
  useEffect(() => {
    if (gameState.gameStatus !== 'playing') return;

    const timer = setInterval(() => {
      setGameState((prev) => {
        // 1. Decrement active faults timers
        let reputationDrop = 0;
        const updatedFaults = prev.faults.map((f) => {
          const nextTime = Math.max(0, f.timeLeft - 1);
          if (nextTime === 0 && f.timeLeft > 0) {
            // Fault expired, cause major reputational drop
            reputationDrop += f.severity === 'critical' ? 25 : f.severity === 'high' ? 15 : 8;
            sfx.playFailure();
          }
          return { ...f, timeLeft: nextTime };
        }).filter((f) => f.timeLeft > 0); // remove fully failed/expired faults, causing constant penalty

        // 2. Reduce reputation if any faults are outstanding or have expired
        const faultCount = updatedFaults.length;
        const maintenancePenalty = faultCount * (prev.level * 0.4);
        const newReputation = Math.max(0, Math.floor(prev.reputation - reputationDrop - maintenancePenalty));

        // 3. Game Over check
        if (newReputation <= 25) {
          // Play urgent alarm tick
          sfx.playAlarm();
        }

        const gameStatus = newReputation <= 0 ? 'game_over' : prev.gameStatus;

        // 4. Randomly trigger a new fault (Frequency based on level)
        const spawnChance = 0.08 + prev.level * 0.03;
        let finalFaults = [...updatedFaults];
        
        if (Math.random() < spawnChance && finalFaults.length < 4) {
          const activeRoomIds = finalFaults.map(f => f.roomId);
          const availableRooms = ROOMS.filter(r => !activeRoomIds.includes(r.id));
          
          if (availableRooms.length > 0) {
            const randomRoom = availableRooms[Math.floor(Math.random() * availableRooms.length)];
            const faultTypes: Array<'leak' | 'loose_bolts' | 'burnt_wiring' | 'clogged_filter'> = [
              'leak', 'loose_bolts', 'burnt_wiring', 'clogged_filter'
            ];
            const type = faultTypes[Math.floor(Math.random() * faultTypes.length)];
            
            // Build repair steps based on severity and level
            const isCritical = Math.random() < (0.2 + prev.level * 0.08);
            const severity = isCritical ? 'critical' : Math.random() < 0.5 ? 'high' : 'medium';
            const maxTime = Math.max(30, 90 - prev.level * 10);

            const machineNames = {
              compressor: 'Compresor R717 C-3',
              valve: 'Válvula Reguladora de Retorno V-102',
              fan: 'Extractor Zona Techo E-4'
            };

            const machineType = type === 'leak' ? 'valve' : type === 'burnt_wiring' ? 'compressor' : 'fan';

            const newFault: MachineFault = {
              id: `${Date.now()}`,
              roomId: randomRoom.id,
              roomName: randomRoom.name,
              machineType: machineType as any,
              machineName: machineType === 'valve' ? machineNames.valve : machineType === 'compressor' ? machineNames.compressor : machineNames.fan,
              type,
              severity,
              progress: 0,
              maxTime,
              timeLeft: maxTime,
              currentStepIndex: 0,
              creditsReward: isCritical ? 100 : 50,
              xpReward: isCritical ? 80 : 40,
              steps: [
                {
                  id: 'step_1',
                  instruction: type === 'leak' 
                    ? 'Coloca la empacadura en el reborde de la tubería.' 
                    : type === 'loose_bolts' 
                    ? 'Ajusta los pernos flojos de la carcasa del rotor.'
                    : type === 'burnt_wiring'
                    ? 'Une los hilos de cobre dañados por el cortocircuito.'
                    : 'Ajusta la presión estática del filtro secundario.',
                  toolRequired: type === 'leak' ? 'tape_dispenser' : type === 'loose_bolts' ? 'wrench' : type === 'burnt_wiring' ? 'soldering_iron' : 'multimeter',
                  partRequired: type === 'leak' ? 'gasket' : type === 'burnt_wiring' ? 'wire' : undefined,
                  completed: false,
                  type: type === 'leak' ? 'patch' : type === 'loose_bolts' ? 'torque' : type === 'burnt_wiring' ? 'connect_wire' : 'adjust_dial'
                }
              ]
            };

            finalFaults.push(newFault);
            sfx.playAlarm();

            // Trigger corresponding urgent chat warning from the Production supervisor
            triggerProductionWarning(randomRoom.name, severity, type);
          }
        }

        return {
          ...prev,
          reputation: newReputation,
          faults: finalFaults,
          gameStatus,
        };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState.gameStatus, gameState.level]);

  // Handle triggered angry/urgent messages from production
  const triggerProductionWarning = (roomName: string, severity: string, faultType: string) => {
    const senders = ['Ing. Ramirez (Prod.)', 'Sup. Castillo (Operaciones)', 'Lic. Herrera (Calidad)'];
    const randomSender = senders[Math.floor(Math.random() * senders.length)];

    let detail = 'fuga de refrigerante';
    if (faultType === 'loose_bolts') detail = 'fuerte vibración y ruido metálico';
    if (faultType === 'burnt_wiring') detail = 'corte en el suministro eléctrico';
    if (faultType === 'clogged_filter') detail = 'obstrucción de presión de retorno';

    const messages = [
      `¡ALERTA! Reportan ${detail} en la zona de ${roomName}. ¡Manden un técnico de inmediato!`,
      `El jefe de planta exige revisar los sistemas de ${roomName}. El rendimiento del frío está cayendo rápidamente.`,
      `¡Urgente! Se está perdiendo presión crítica de amoníaco en ${roomName}. Todo el lote corre peligro.`,
    ];

    const randomText = messages[Math.floor(Math.random() * messages.length)];
    const now = new Date();
    const timestamp = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

    const newMsg: ProductionMessage = {
      id: `${Date.now()}`,
      sender: randomSender,
      avatar: 'U',
      text: randomText,
      timestamp,
      urgency: severity === 'critical' ? 'high' : 'medium',
    };

    setProductionMessages((prev) => [newMsg, ...prev].slice(0, 15));
  };

  // Start the Game from the Intro panel
  const startGame = () => {
    sfx.playSuccess();
    setGameState((prev) => ({
      ...prev,
      gameStatus: 'playing',
      reputation: 95,
      score: 0,
      credits: 150,
      xp: 0,
      level: 1,
      faults: [
        // One initial tutorial-ish fault in the map
        {
          id: 'initial_fault',
          roomId: 'tunel_congelacion',
          roomName: 'Túnel de Congelación',
          machineType: 'valve',
          machineName: 'Válvula Reguladora R717',
          type: 'loose_bolts',
          severity: 'medium',
          progress: 0,
          maxTime: 70,
          timeLeft: 70,
          currentStepIndex: 0,
          creditsReward: 60,
          xpReward: 30,
          steps: [
            {
              id: 'initial_step_1',
              instruction: 'Ajusta los pernos flojos en el cuerpo principal de la válvula.',
              toolRequired: 'wrench',
              completed: false,
              type: 'torque'
            }
          ]
        }
      ]
    }));

    const now = new Date();
    const timestamp = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    setProductionMessages([
      {
        id: 'start_msg',
        sender: 'Sala de Control (SCADA)',
        avatar: 'S',
        text: 'Sistemas iniciados correctamente. Monitoreando fugas de amoníaco R717 en tiempo real.',
        timestamp,
        urgency: 'low',
      }
    ]);
  };

  // Complete a Step of the active Isometric Repair Minigame
  const handleCompleteStep = (stepIndex: number, successRating: number) => {
    const activeFault = gameState.faults.find((f) => f.id === gameState.activeFaultId);
    if (!activeFault) return;

    // Award immediate XP and Credits
    const finalCreditsReward = Math.round(activeFault.creditsReward * successRating);
    const finalXPReward = Math.round(activeFault.xpReward * successRating);

    setGameState((prev) => {
      const nextXP = prev.xp + finalXPReward;
      
      // Calculate level-up check
      let nextLevel = prev.level;
      if (nextLevel < LEVEL_THRESHOLDS.length && nextXP >= LEVEL_THRESHOLDS[nextLevel]) {
        nextLevel += 1;
        sfx.playLevelUp();
      }

      // Remove the completed fault from list
      const updatedFaults = prev.faults.filter((f) => f.id !== prev.activeFaultId);

      // Increase overall plant performance reputation
      const updatedReputation = Math.min(100, prev.reputation + (activeFault.severity === 'critical' ? 15 : 10));

      return {
        ...prev,
        score: prev.score + finalCreditsReward * 2,
        credits: prev.credits + finalCreditsReward,
        xp: nextXP,
        level: nextLevel,
        reputation: updatedReputation,
        faults: updatedFaults,
        activeFaultId: null, // close interactive workspace
      };
    });

    // Send successful system recovery log message
    const now = new Date();
    const timestamp = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    setProductionMessages((prev) => [
      {
        id: `${Date.now()}`,
        sender: 'Ing. Ramirez (Prod.)',
        avatar: 'P',
        text: `¡Buen trabajo! El sistema de ${activeFault.roomName} está estabilizado. Continuemos operando al máximo.`,
        timestamp,
        urgency: 'low',
      },
      ...prev
    ]);
  };

  // Parts Purchase Event
  const handleBuyPart = (partId: string, cost: number) => {
    setGameState((prev) => {
      const updatedParts = { ...prev.inventory.parts };
      updatedParts[partId] = (updatedParts[partId] || 0) + 1;

      return {
        ...prev,
        credits: prev.credits - cost,
        inventory: {
          ...prev.inventory,
          parts: updatedParts,
        },
      };
    });
  };

  // Tool Upgrading Event
  const handleUpgradeTool = (toolId: string, cost: number) => {
    // Increment tool level in local state and tool attributes state
    setToolsState((prevTools) =>
      prevTools.map((t) => {
        if (t.id === toolId) {
          const nextLevel = t.level + 1;
          const nextBonus = t.efficiencyBonus + 0.35; // +35% faster repairs per upgrade
          return {
            ...t,
            level: nextLevel,
            efficiencyBonus: nextBonus,
            upgradeCost: t.upgradeCost + 80,
          };
        }
        return t;
      })
    );

    setGameState((prev) => {
      const updatedTools = { ...prev.inventory.tools };
      updatedTools[toolId] = (updatedTools[toolId] || 1) + 1;

      return {
        ...prev,
        credits: prev.credits - cost,
        inventory: {
          ...prev.inventory,
          tools: updatedTools,
        },
      };
    });
  };

  const activeFault = gameState.faults.find((f) => f.id === gameState.activeFaultId);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-400 font-mono flex flex-col border-8 border-[#1a1a1a] select-none relative overflow-hidden">
      
      {/* Background Neon Grid Decoration */}
      <div className="absolute inset-0 bg-[#050505] bg-[radial-gradient(#1a1a1a_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      {/* TOP HEADER STATUS PANEL (PROFESSIONAL POLISH STATUS BAR) */}
      <header className="h-20 md:h-16 bg-[#121212] border-b border-zinc-800 flex items-center justify-between px-6 shadow-2xl relative z-10 shrink-0 select-none">
        
        {/* Logo and Technical Level metadata alignment */}
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Técnico de Guardia</span>
            <span className="text-zinc-100 text-sm font-semibold tracking-wide">{LEVEL_NAMES[gameState.level - 1]} [NIVEL {gameState.level}]</span>
          </div>
          <div className="hidden md:block h-8 w-[1px] bg-zinc-800"></div>
          <div className="hidden md:flex flex-col">
            <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Sector de la Planta</span>
            <span className="text-zinc-100 text-sm font-semibold">SALA DE COMPRESORES R717</span>
          </div>
        </div>

        {/* Global HUD Meters (Level Progress, Score, Credits, Reputation) */}
        {gameState.gameStatus === 'playing' && (
          <div className="flex items-center gap-6 font-mono text-xs">
            
            {/* PRESSURE TIMER / REPUTATION THRESHOLD (Direct layout copy from Theme HTML) */}
            <div className="flex items-center bg-[#1a120b] border border-orange-900/50 px-4 py-1.5 rounded">
              <div className="mr-4 hidden sm:block">
                <div className="text-[9px] text-orange-500 uppercase font-black tracking-wider">Límite de Presión</div>
                <div className="h-1.5 w-24 bg-zinc-800 mt-0.5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-orange-500 transition-all duration-500"
                    style={{ width: `${gameState.reputation}%` }}
                  />
                </div>
              </div>
              <div className="text-xl md:text-2xl font-black text-orange-500 tracking-wider">
                {gameState.reputation < 10 ? `0${gameState.reputation}` : gameState.reputation}:00:00
              </div>
            </div>

            {/* Score & Credits */}
            <div className="flex items-center gap-4 border-l border-zinc-800 pl-4">
              <div className="text-right">
                <span className="text-[9px] text-zinc-500 block uppercase font-bold">Puntuación</span>
                <span className="text-sm font-extrabold text-orange-500 tracking-tight">{gameState.score} PTS</span>
              </div>
              <div className="text-right">
                <span className="text-[9px] text-zinc-500 block uppercase font-bold">Créditos</span>
                <span className="text-sm font-bold text-orange-400 tracking-tight">{gameState.credits} CR</span>
              </div>
            </div>

            {/* Reputation (Plant Performance) Dial Meter */}
            <div className="hidden lg:flex items-center gap-3 border-l border-zinc-800 pl-4">
              <div className="text-right">
                <span className="text-[9px] text-zinc-500 block uppercase font-bold">Estabilidad</span>
                <span className={`text-sm font-extrabold tracking-tight uppercase ${gameState.reputation > 60 ? 'text-emerald-500' : gameState.reputation > 35 ? 'text-amber-500' : 'text-rose-500 animate-pulse'}`}>
                  {gameState.reputation}%
                </span>
              </div>
              
              {/* Colored status circle indicator */}
              <div className={`w-3 h-3 rounded-full ${gameState.reputation > 60 ? 'bg-emerald-500' : gameState.reputation > 35 ? 'bg-amber-500' : 'bg-red-500 animate-ping'}`} />
            </div>

          </div>
        )}

        {/* Instalar App header action button */}
        {isInstallable && (
          <button
            onClick={handleInstallClick}
            className="ml-4 bg-orange-600 hover:bg-orange-500 text-black text-xs font-bold px-3.5 py-2 rounded-lg border border-orange-500 flex items-center gap-1.5 transition-all shadow-lg active:scale-95 cursor-pointer font-sans"
            title="Instalar como Aplicación Android"
          >
            <span>Instalar App 📱</span>
          </button>
        )}

      </header>

      {/* CORE DISPLAY GAME CONTAINER */}
      <main className="flex-1 p-6 relative z-10 overflow-hidden flex flex-col">
        
        <AnimatePresence mode="wait">
          
          {/* 1. INTRO / LOADING BRIEFING PANEL */}
          {gameState.gameStatus === 'intro' && (
            <motion.div
              key="intro-panel"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="flex-1 flex flex-col items-center justify-center text-center p-8 max-w-4xl mx-auto bg-[#121212] border border-zinc-800 rounded-xl shadow-2xl my-auto relative overflow-hidden"
            >
              {/* Decorative side accent glow */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 blur-3xl rounded-full" />
              
              {/* Huge industrial stylized logo icon */}
              <div className="relative mb-6">
                <div className="w-20 h-20 bg-orange-500/10 border border-orange-500/30 rounded-2xl flex items-center justify-center text-orange-500 shadow-2xl shadow-orange-500/5 animate-pulse">
                  <Flame className="w-10 h-10 text-orange-500 rotate-180" />
                </div>
                {/* Secondary pipe decorative connection */}
                <div className="absolute -top-4 -right-4 w-4 h-4 bg-orange-500/20 border border-orange-500 rounded-full animate-ping" />
              </div>

              <h2 className="text-3xl font-black font-sans tracking-wider uppercase text-zinc-100">
                Mantenimiento R717: Emergency Cold
              </h2>
              <p className="text-sm text-zinc-400 font-mono mt-3 max-w-xl leading-relaxed">
                Asume la responsabilidad del sistema de refrigeración de amoníaco R717 de la planta. 
                Los supervisores de producción exigen el máximo rendimiento posible de la maquinaria, mientras el desgaste y los fallos mecánicos amenazan con detener el frío.
              </p>

              {/* Game Objectives Lists */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 w-full max-w-3xl text-left text-xs font-mono">
                <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-lg">
                  <div className="text-orange-500 font-bold mb-1.5 uppercase tracking-wide">1. Monitorea el SCADA</div>
                  <p className="text-zinc-500 leading-relaxed">Localiza alarmas parpadeantes en tiempo real basadas en la planta física real.</p>
                </div>
                <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-lg">
                  <div className="text-orange-400 font-bold mb-1.5 uppercase tracking-wide">2. Reparación Isométrica</div>
                  <p className="text-zinc-500 leading-relaxed">Ajusta pernos de precisión, sella fugas de gas a presión y suelda cables rotos.</p>
                </div>
                <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-lg">
                  <div className="text-amber-500 font-bold mb-1.5 uppercase tracking-wide">3. Gestión de Repuestos</div>
                  <p className="text-zinc-500 leading-relaxed">Invierte créditos para comprar empacaduras, lubricantes y mejorar tus herramientas.</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4 mt-8 w-full max-w-3xl justify-center">
                <button
                  onClick={startGame}
                  className="px-10 py-4 bg-orange-600 hover:bg-orange-500 text-black font-extrabold text-sm tracking-wider uppercase font-mono rounded-lg cursor-pointer shadow-lg shadow-orange-500/10 transition-all transform hover:scale-[1.01] w-full sm:w-auto"
                >
                  Iniciar Turno de Guardia ➜
                </button>

                {isInstallable ? (
                  <button
                    onClick={handleInstallClick}
                    className="px-8 py-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-orange-500 font-extrabold text-sm tracking-wider uppercase font-mono rounded-lg cursor-pointer transition-all w-full sm:w-auto"
                  >
                    Instalar App Móvil 📱
                  </button>
                ) : (
                  <div className="px-6 py-3 bg-[#1a120b] border border-orange-900/30 rounded-lg text-left text-[11px] text-zinc-400 font-mono flex-1 w-full max-w-sm">
                    <span className="text-[9px] text-orange-500 font-bold uppercase block mb-0.5">Versión Móvil e Instalable:</span>
                    Para instalar en Android, abre el menú de Chrome <span className="text-orange-400 font-bold">"•••"</span> y selecciona <span className="text-orange-400 font-bold">"Añadir a pantalla de inicio" / "Instalar aplicación"</span>.
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* 2. CORE GAMEPLAY INTERACTIVE SCREEN */}
          {gameState.gameStatus === 'playing' && (
            <motion.div
              key="gameplay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col gap-6 h-full overflow-hidden"
            >
              
              {/* Secondary Navigation (Tabs to switch between SCADA map and Workshop inventory) */}
              <div className="flex border-b border-zinc-800 shrink-0 font-mono text-xs">
                <button
                  onClick={() => {
                    setActiveTab('map');
                    sfx.playWrenchClick();
                  }}
                  className={`px-5 py-3 border-b-2 font-bold transition-all cursor-pointer ${
                    activeTab === 'map' && !gameState.activeFaultId
                      ? 'border-orange-500 text-orange-500 bg-orange-950/10'
                      : 'border-transparent text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  MAPA SCADA PLANTA B
                </button>
                <button
                  onClick={() => {
                    setActiveTab('inventory');
                    sfx.playWrenchClick();
                  }}
                  className={`px-5 py-3 border-b-2 font-bold transition-all cursor-pointer ${
                    activeTab === 'inventory' && !gameState.activeFaultId
                      ? 'border-orange-500 text-orange-500 bg-orange-950/10'
                      : 'border-transparent text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  ALMACÉN & MEJORAS DE HERRAMIENTAS
                </button>
              </div>

              {/* Dynamic rendering depending on whether we are zoomed into a repair or browsing tabs */}
              <div className="flex-1 min-h-0 flex flex-col lg:grid lg:grid-cols-12 gap-6">
                
                {activeFault ? (
                  /* ZOOMED REPAIR MODE (FullScreen isometric panel overlay) */
                  <div className="col-span-12 h-full">
                    <IsometricRepair
                      fault={activeFault}
                      tools={toolsState}
                      inventoryParts={gameState.inventory.parts}
                      onCompleteStep={handleCompleteStep}
                      onCancel={() => {
                        setGameState((p) => ({ ...p, activeFaultId: null }));
                        sfx.playFailure();
                      }}
                    />
                  </div>
                ) : (
                  /* MAP or INVENTORY views alongside the Production Live Alert Feed chat */
                  <>
                    <div className="col-span-12 lg:col-span-8 h-full flex flex-col">
                      {activeTab === 'map' ? (
                        <FactoryMap
                          faults={gameState.faults}
                          onSelectFault={(f) => {
                            setGameState((p) => ({ ...p, activeFaultId: f.id }));
                            sfx.playWrenchClick();
                          }}
                          reputation={gameState.reputation}
                        />
                      ) : (
                        <InventoryTab
                          credits={gameState.credits}
                          inventoryParts={gameState.inventory.parts}
                          tools={toolsState}
                          onBuyPart={handleBuyPart}
                          onUpgradeTool={handleUpgradeTool}
                        />
                      )}
                    </div>

                    {/* Live Production warning notifications right feed sidebar */}
                    <div className="col-span-12 lg:col-span-4 h-full">
                      <ProductionChat messages={productionMessages} />
                    </div>
                  </>
                )}

              </div>

            </motion.div>
          )}

          {/* 3. GAME OVER OVERLAY SCREEN */}
          {gameState.gameStatus === 'game_over' && (
            <motion.div
              key="game-over"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex-1 flex flex-col items-center justify-center text-center p-6 max-w-md mx-auto"
            >
              <div className="w-16 h-16 bg-red-950 border border-red-500 rounded-full flex items-center justify-center text-red-500 mb-6 animate-bounce">
                <ShieldAlert className="w-8 h-8" />
              </div>

              <h2 className="text-2xl font-black font-sans uppercase tracking-wider text-red-400">
                REPUTACIÓN BAJO MÍNIMOS
              </h2>
              <p className="text-xs text-zinc-500 font-mono uppercase mt-1">Paro de producción total por seguridad</p>
              
              <p className="text-sm text-zinc-400 leading-relaxed mt-4">
                La eficiencia de los sistemas de refrigeración ha caído por debajo del margen crítico de seguridad operativa. El equipo de producción ha forzado la detención de la fábrica para evitar el descongelamiento masivo del producto.
              </p>

              <div className="bg-[#0b0c0d] border border-zinc-900 p-4 rounded-lg w-full mt-6 space-y-2.5 font-mono text-xs">
                <div className="flex justify-between text-zinc-500">
                  <span>Nivel de Reparador:</span>
                  <span className="text-zinc-200">{LEVEL_NAMES[gameState.level - 1]}</span>
                </div>
                <div className="flex justify-between text-zinc-500">
                  <span>Puntuación total lograda:</span>
                  <span className="text-amber-400 font-bold">{gameState.score} PTS</span>
                </div>
              </div>

              <button
                onClick={startGame}
                className="mt-8 w-full py-3 bg-red-500 hover:bg-red-600 text-black font-extrabold text-xs tracking-wider uppercase font-mono rounded-lg cursor-pointer transition-all"
              >
                Reiniciar Guardia ➜
              </button>
            </motion.div>
          )}

        </AnimatePresence>

      </main>

    </div>
  );
}
