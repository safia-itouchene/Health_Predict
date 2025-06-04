// Patient related types
export interface Patient {
  NIN: string;
  Nom: string;
  Prénom: string;
  Sexe: string;
  Date_naissance: string;
  Groupe_sanguin: string;
  Lieu_naissance: string;
  Wilaya: string;
}

export interface PatientDetail extends Patient {
  age: number;
  lastMeasurements: {
    Tension_artérielle_systolique: number;
    Tension_artérielle_diastolique: number;
    Fréquence_cardiaque_au_repos: number;
    IMC: number;
    Glycémie_à_jeun: number;
    Cholestérol_total: number;
    LDL: number;
    Triglycérides: number;
  };
  lifestyle: {
    Statut_tabagique: string;
    Consommation_alcool: string;
    Activité_physique: string;
    Qualité_alimentation: string;
    Qualité_sommeil: string;
    Niveau_stress: string;
  };
  currentDiseases: string[];
}

// Health metrics and prediction types
export interface HealthMetric {
  date: string;
  metricName: string;
  actualValue: number;
  predictedValue: number;
  unit: string;
}

export interface DiseaseRisk {
  diseaseName: string;
  riskScore: number;
  averageRisk: number;
}

export interface FamilyMember {
  NIN: string;
  name: string;
  relation: string;
  diseaseHistory: string[];
}

// Graph visualization types
export interface GraphNode {
  id: string;
  name: string;
  type: 'patient' | 'parent' | 'child' | 'sibling';
  diseaseCount: number;
}

export interface GraphLink {
  source: string;
  target: string;
  relation: string;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

// Statistics types
export interface DiseaseStatistic {
  diseaseName: string;
  count: number;
  percentage: number;
  byWilaya: {
    [wilaya: string]: {
      count: number;
      percentage: number;
    };
  };
  byAge: {
    '0-20': number;
    '21-40': number;
    '41-60': number;
    '61+': number;
  };
  byGender: {
    M: number;
    F: number;
  };
}

export interface LifestyleStatistic {
  category: string;
  distribution: {
    [value: string]: {
      count: number;
      percentage: number;
    };
  };
  byWilaya: {
    [wilaya: string]: {
      [value: string]: number;
    };
  };
  
}