// Form Utilities - Smart Auto-Complete and Input Masks
// Provides dynamic formatting and suggestions for faster form filling

// ============================================
// INPUT MASKS
// ============================================

export const formatPhone = (value: string): string => {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 2) return `(${numbers}`;
  if (numbers.length <= 6) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  if (numbers.length <= 10) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
};

export const formatCPF = (value: string): string => {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 3) return numbers;
  if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
  if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
  return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
};

export const formatCNPJ = (value: string): string => {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 2) return numbers;
  if (numbers.length <= 5) return `${numbers.slice(0, 2)}.${numbers.slice(2)}`;
  if (numbers.length <= 8) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5)}`;
  if (numbers.length <= 12) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8)}`;
  return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8, 12)}-${numbers.slice(12, 14)}`;
};

export const formatDocument = (value: string): string => {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 11) return formatCPF(value);
  return formatCNPJ(value);
};

export const formatCEP = (value: string): string => {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 5) return numbers;
  return `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`;
};

// ============================================
// EQUIPMENT SUGGESTIONS
// ============================================

export const EQUIPMENT_BRANDS = [
  'Samsung', 'LG', 'Carrier', 'Daikin', 'Midea', 'Springer',
  'Philco', 'Consul', 'Electrolux', 'Gree', 'Fujitsu', 'Hitachi',
  'Panasonic', 'Toshiba', 'York', 'Komeco', 'Elgin', 'Agratto'
];

export const EQUIPMENT_MODELS: Record<string, string[]> = {
  'Samsung': ['WindFree', 'Digital Inverter', 'Eco Inverter', 'Smart AC'],
  'LG': ['Dual Inverter', 'Art Cool', 'Smart Inverter', 'ThinQ'],
  'Carrier': ['X-Power', 'Eco Inverter', 'Ultra Silence'],
  'Daikin': ['Sensira', 'Emura', 'Stylish', 'Perfera'],
  'Midea': ['Springer', 'Eco Inverter', 'Liva', 'Xtreme Save'],
  'Springer': ['Midea', 'Up', 'Midea All Easy'],
  'Philco': ['Inverter', 'Eco', 'PAC'],
  'Consul': ['Bem Estar', 'Maxi', 'Inverter'],
  'Electrolux': ['Ecoturbo', 'Silent', 'Inverter'],
  'Gree': ['Eco Garden', 'G-Tech', 'Inverter'],
  'Fujitsu': ['Hi-Wall', 'AIRSTAGE', 'Design'],
  'Hitachi': ['Inverter', 'Eco', 'Premium'],
};

export const BTU_OPTIONS = [7000, 9000, 12000, 18000, 24000, 30000, 36000, 48000, 60000];

export const COMMON_LOCATIONS = [
  'Sala', 'Sala de Estar', 'Sala de Reuniões',
  'Quarto', 'Quarto Casal', 'Quarto Solteiro', 'Suite',
  'Escritório', 'Home Office', 'Recepção',
  'Cozinha', 'Copa', 'Área de Serviço',
  'Loja', 'Salão', 'Atendimento',
  'Consultório', 'Laboratório', 'Clínica',
  'Galpão', 'Depósito', 'Almoxarifado'
];

// ============================================
// FORM HELPERS
// ============================================

export const filterSuggestions = (input: string, options: string[]): string[] => {
  if (!input || input.length < 1) return options.slice(0, 5);
  const lower = input.toLowerCase();
  return options
    .filter(opt => opt.toLowerCase().includes(lower))
    .slice(0, 6);
};

export const getModelsForBrand = (brand: string): string[] => {
  return EQUIPMENT_MODELS[brand] || [];
};

// ============================================
// COMMON PROBLEM DESCRIPTIONS
// ============================================

export const COMMON_PROBLEMS = [
  // Problemas de temperatura
  'Ar condicionado não está gelando',
  'Não está refrigerando adequadamente',
  'Demora muito para gelar o ambiente',
  'Sai ar quente ao invés de frio',
  'Temperatura não estabiliza',

  // Problemas de ruído
  'Fazendo barulho estranho',
  'Ruído alto durante funcionamento',
  'Barulho de vibração na unidade',
  'Som de água escorrendo interno',

  // Vazamentos
  'Vazamento de água na unidade interna',
  'Goteira no aparelho',
  'Vazamento de gás refrigerante',
  'Água pingando na parede',

  // Problemas elétricos
  'Não liga',
  'Liga e desliga sozinho',
  'Controle remoto não funciona',
  'Display apagado',
  'Disjuntor desarma quando liga',

  // Manutenção preventiva
  'Limpeza preventiva programada',
  'Higienização completa',
  'Mau cheiro ao ligar',
  'Filtro sujo ou entupido',

  // Instalação
  'Instalação de aparelho novo',
  'Reinstalação após mudança',
  'Relocação de unidade',

  // Outros
  'Compressor não funciona',
  'Ventilador parou de girar',
  'Gelo na serpentina',
  'Aparelho congelando',
];
