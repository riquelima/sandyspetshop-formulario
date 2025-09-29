
export enum ServiceType {
  BATH = 'BATH',
  BATH_AND_GROOMING = 'BATH_AND_GROOMING',
  VISIT_DAYCARE = 'VISIT_DAYCARE',
  VISIT_HOTEL = 'VISIT_HOTEL',
}

export enum PetWeight {
  UP_TO_5 = 'UP_TO_5',
  KG_10 = 'KG_10',
  KG_15 = 'KG_15',
  KG_20 = 'KG_20',
  KG_25 = 'KG_25',
  KG_30 = 'KG_30',
  OVER_30 = 'OVER_30',
}

export interface Appointment {
  id: string;
  petName: string;
  ownerName: string;
  whatsapp: string;
  service: ServiceType;
  startTime: Date;
  endTime: Date;
}
