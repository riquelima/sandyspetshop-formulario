import { ServiceType, PetWeight } from './types';

export const SERVICES = {
  [ServiceType.BATH]: {
    label: 'Só Banho',
    duration: 1, // in hours
  },
  [ServiceType.BATH_AND_GROOMING]: {
    label: 'Banho & Tosa',
    duration: 2, // in hours
  },
  [ServiceType.VISIT_DAYCARE]: {
    label: 'Visita para Creche',
    duration: 1, // in hours
  },
  [ServiceType.VISIT_HOTEL]: {
    label: 'Visita para Hotel',
    duration: 1, // in hours
  },
};

export const PET_WEIGHT_OPTIONS: Record<PetWeight, string> = {
    [PetWeight.UP_TO_5]: 'Até 5kg',
    [PetWeight.KG_10]: 'Até 10kg',
    [PetWeight.KG_15]: 'Até 15kg',
    [PetWeight.KG_20]: 'Até 20kg',
    [PetWeight.KG_25]: 'Até 25kg',
    [PetWeight.KG_30]: 'Até 30kg',
    [PetWeight.OVER_30]: 'Acima de 30kg',
};

const visitPrices = {
  [ServiceType.VISIT_DAYCARE]: 0,
  [ServiceType.VISIT_HOTEL]: 0,
};

export const BASE_PRICES: Record<PetWeight, Record<ServiceType, number>> = {
  [PetWeight.UP_TO_5]: { [ServiceType.BATH]: 65, [ServiceType.BATH_AND_GROOMING]: 130, ...visitPrices },
  [PetWeight.KG_10]: { [ServiceType.BATH]: 75, [ServiceType.BATH_AND_GROOMING]: 150, ...visitPrices },
  [PetWeight.KG_15]: { [ServiceType.BATH]: 85, [ServiceType.BATH_AND_GROOMING]: 170, ...visitPrices },
  [PetWeight.KG_20]: { [ServiceType.BATH]: 95, [ServiceType.BATH_AND_GROOMING]: 190, ...visitPrices },
  [PetWeight.KG_25]: { [ServiceType.BATH]: 105, [ServiceType.BATH_AND_GROOMING]: 210, ...visitPrices },
  [PetWeight.KG_30]: { [ServiceType.BATH]: 115, [ServiceType.BATH_AND_GROOMING]: 230, ...visitPrices },
  [PetWeight.OVER_30]: { [ServiceType.BATH]: 150, [ServiceType.BATH_AND_GROOMING]: 300, ...visitPrices },
};

export interface AddonService {
    id: string;
    label: string;
    price: number;
    requiresService?: ServiceType;
    requiresWeight?: PetWeight[];
    excludesWeight?: PetWeight[];
}

export const ADDON_SERVICES: AddonService[] = [
  // Rule: Only available for pets up to 5kg.
  { id: 'tosa_tesoura', label: 'Tosa na Tesoura', price: 160, requiresWeight: [PetWeight.UP_TO_5]},
  { id: 'aparacao', label: 'Aparação Contorno', price: 35 },
  // Rule: Only available for pets over 5kg.
  { id: 'hidratacao', label: 'Hidratação', price: 25, excludesWeight: [PetWeight.UP_TO_5] },
  { id: 'botinhas', label: 'Botinhas', price: 25 },
  { id: 'desembolo', label: 'Desembolo', price: 25 }, 
  { id: 'patacure1', label: 'Patacure (1 cor)', price: 10 },
  { id: 'patacure2', label: 'Patacure (2 cores)', price: 20 },
  { id: 'tintura', label: 'Tintura (1 parte)', price: 20 },
];


export const WORKING_HOURS: number[] = [9, 10, 11, 13, 14, 15, 16, 17];
export const VISIT_WORKING_HOURS: number[] = [9, 10, 11, 12, 13, 14, 15, 16];
export const LUNCH_HOUR = 12;
export const MAX_CAPACITY_PER_SLOT = 2; // Two groomers
