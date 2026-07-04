export interface SparePart {
  id: string;
  name: string;
  description: string;
  count: number;
  cost: number;
  icon: string;
}

export interface Tool {
  id: string;
  name: string;
  level: number;
  maxLevel: number;
  upgradeCost: number;
  description: string;
  efficiencyBonus: number; // multiplier for repair speed
}

export interface MachineFault {
  id: string;
  roomId: string;
  roomName: string;
  machineType: 'compressor' | 'valve' | 'fan';
  machineName: string;
  type: 'leak' | 'loose_bolts' | 'burnt_wiring' | 'clogged_filter';
  severity: 'critical' | 'high' | 'medium';
  progress: number; // 0 to 100 (100 is fully repaired)
  maxTime: number; // total seconds to complete before failure
  timeLeft: number; // remaining seconds
  steps: RepairStep[];
  currentStepIndex: number;
  creditsReward: number;
  xpReward: number;
}

export interface RepairStep {
  id: string;
  instruction: string;
  toolRequired: string; // e.g., 'wrench', 'tape', 'multimeter', 'grease'
  partRequired?: string; // e.g., 'gasket', 'seal_tape', 'wire', 'refrigerant'
  completed: boolean;
  type: 'torque' | 'patch' | 'connect_wire' | 'adjust_dial';
  // step-specific mechanics
  targetValue?: number; // for dials/torque
  currentValue?: number;
}

export interface ProductionMessage {
  id: string;
  sender: string;
  avatar: string;
  text: string;
  timestamp: string;
  urgency: 'high' | 'medium' | 'low';
}

export interface GameState {
  score: number;
  credits: number;
  xp: number;
  level: number;
  reputation: number; // 0 to 100 (Overall plant performance). Game over if 0
  inventory: {
    parts: { [key: string]: number };
    tools: { [key: string]: number }; // level of each tool
  };
  faults: MachineFault[];
  activeFaultId: string | null; // currently zooming/repairing
  gameStatus: 'intro' | 'playing' | 'game_over' | 'victory';
}

export const ROOMS = [
  { id: 'camara_congelado_1', name: 'Cámara Congelado 1', temp: -18.0, color: 'bg-[#1e3a5f]' },
  { id: 'camara_congelado_2', name: 'Cámara Congelado 2', temp: -18.0, color: 'bg-[#1e3a5f]' },
  { id: 'tunel_congelacion', name: 'Túnel de Congelación', temp: -30.0, color: 'bg-[#0f2d4a]' },
  { id: 'sala_evasado', name: 'Sala Envasado', temp: 14.0, color: 'bg-[#1c3d37]' },
  { id: 'obrador_picado', name: 'Obrador Picado', temp: 12.0, color: 'bg-[#1c3d37]' },
  { id: 'camara_conservacion', name: 'Cámara Conservación', temp: 2.0, color: 'bg-[#172e2b]' },
  { id: 'servicios_planta_b', name: 'Servicios Planta B', temp: 25.0, color: 'bg-[#2d3748]' },
  { id: 'paletizado', name: 'Zona Paletizado', temp: 10.0, color: 'bg-[#2a4365]' }
];

export const INITIAL_PARTS: SparePart[] = [
  { id: 'gasket', name: 'Empacadura R717', description: 'Sellado hermético para bridas de amoníaco.', count: 5, cost: 30, icon: 'RotateCw' },
  { id: 'seal_tape', name: 'Cinta Nanopolímero', description: 'Repara fugas de alta presión al instante.', count: 4, cost: 20, icon: 'Spline' },
  { id: 'wire', name: 'Cable de Silicio', description: 'Conductor resistente al frío extremo.', count: 8, cost: 15, icon: 'Tv' },
  { id: 'refrigerant', name: 'Carga de Amoníaco (R717)', description: 'Recarga el circuito refrigerante.', count: 2, cost: 60, icon: 'Container' },
  { id: 'grease', name: 'Grasa Criogénica', description: 'Lubricante para válvulas a bajas temperaturas.', count: 3, cost: 25, icon: 'Droplet' }
];

export const INITIAL_TOOLS: Tool[] = [
  { id: 'wrench', name: 'Llave Dinamométrica', level: 1, maxLevel: 3, upgradeCost: 150, description: 'Ajusta pernos y tuercas con precisión.', efficiencyBonus: 1.0 },
  { id: 'tape_dispenser', name: 'Aplicador de Cinta', level: 1, maxLevel: 3, upgradeCost: 100, description: 'Sella fugas de gas a mayor velocidad.', efficiencyBonus: 1.0 },
  { id: 'soldering_iron', name: 'Cautín Térmico', level: 1, maxLevel: 3, upgradeCost: 180, description: 'Repara conexiones eléctricas dañadas.', efficiencyBonus: 1.0 },
  { id: 'multimeter', name: 'Multímetro Industrial', level: 1, maxLevel: 3, upgradeCost: 120, description: 'Permite medir voltajes y calibrar sistemas rápidamente.', efficiencyBonus: 1.0 }
];

export const LEVEL_THRESHOLDS = [0, 100, 300, 700, 1500, 3000];

export const LEVEL_NAMES = [
  'Junior de Mantenimiento',
  'Técnico Especialista R717',
  'Ingeniero de Frío Industrial',
  'Supervisor de Sistemas Críticos',
  'Jefe de Mantenimiento de Planta',
  'Director de Operaciones'
];
