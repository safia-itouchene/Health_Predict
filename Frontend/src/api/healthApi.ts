import { Patient, HealthMetric, DiseaseRisk, GraphData } from '../types';

// Simulated backend API calls
// In a real application, these would make actual HTTP requests to your Flask API

export const fetchPatients = async (): Promise<Patient[]> => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  // Return mock data
  return [
    {
      NIN: "A123456789",
      Nom: "Benali",
      Prénom: "Ahmed",
      Sexe: "M",
      Date_naissance: "15/05/1965",
      Groupe_sanguin: "A+",
      Lieu_naissance: "Alger",
      Wilaya: "Alger"
    },
    {
      NIN: "B234567890",
      Nom: "Zerrouki",
      Prénom: "Samia",
      Sexe: "F",
      Date_naissance: "23/11/1972",
      Groupe_sanguin: "O-",
      Lieu_naissance: "Oran",
      Wilaya: "Oran"
    },
    {
      NIN: "C345678901",
      Nom: "Kaddour",
      Prénom: "Mohamed",
      Sexe: "M",
      Date_naissance: "08/02/1950",
      Groupe_sanguin: "B+",
      Lieu_naissance: "Constantine",
      Wilaya: "Constantine"
    }
  ];
};

export const fetchPatientDetails = async (nin: string): Promise<any> => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 600));
  
  // Mock data for selected patient
  const patients = {
    "A123456789": {
      NIN: "A123456789",
      Nom: "Benali",
      Prénom: "Ahmed",
      Sexe: "M",
      Date_naissance: "15/05/1965",
      Groupe_sanguin: "A+",
      Lieu_naissance: "Alger",
      Wilaya: "Alger",
      age: 59,
      lastMeasurements: {
        Tension_artérielle_systolique: 142,
        Tension_artérielle_diastolique: 92,
        Fréquence_cardiaque_au_repos: 75,
        IMC: 29.4,
        Glycémie_à_jeun: 110,
        Cholestérol_total: 215,
        LDL: 145,
        Triglycérides: 180
      },
      lifestyle: {
        Statut_tabagique: "Ex-fumeur",
        Consommation_alcool: "Occasionnelle",
        Activité_physique: "Faible",
        Qualité_alimentation: "Moyenne",
        Qualité_sommeil: "Bonne",
        Niveau_stress: "Modéré"
      },
      currentDiseases: ["Hypertension", "Diabète de type 2"]
    },
    "B234567890": {
      NIN: "B234567890",
      Nom: "Zerrouki",
      Prénom: "Samia",
      Sexe: "F",
      Date_naissance: "23/11/1972",
      Groupe_sanguin: "O-",
      Lieu_naissance: "Oran",
      Wilaya: "Oran",
      age: 52,
      lastMeasurements: {
        Tension_artérielle_systolique: 118,
        Tension_artérielle_diastolique: 75,
        Fréquence_cardiaque_au_repos: 68,
        IMC: 22.1,
        Glycémie_à_jeun: 88,
        Cholestérol_total: 175,
        LDL: 110,
        Triglycérides: 120
      },
      lifestyle: {
        Statut_tabagique: "Non-fumeur",
        Consommation_alcool: "Rare",
        Activité_physique: "Modérée",
        Qualité_alimentation: "Bonne",
        Qualité_sommeil: "Moyenne",
        Niveau_stress: "Élevé"
      },
      currentDiseases: ["Asthme"]
    },
    "C345678901": {
      NIN: "C345678901",
      Nom: "Kaddour",
      Prénom: "Mohamed",
      Sexe: "M",
      Date_naissance: "08/02/1950",
      Groupe_sanguin: "B+",
      Lieu_naissance: "Constantine",
      Wilaya: "Constantine",
      age: 74,
      lastMeasurements: {
        Tension_artérielle_systolique: 156,
        Tension_artérielle_diastolique: 94,
        Fréquence_cardiaque_au_repos: 82,
        IMC: 31.2,
        Glycémie_à_jeun: 135,
        Cholestérol_total: 245,
        LDL: 165,
        Triglycérides: 210
      },
      lifestyle: {
        Statut_tabagique: "Fumeur",
        Consommation_alcool: "Régulière",
        Activité_physique: "Très faible",
        Qualité_alimentation: "Mauvaise",
        Qualité_sommeil: "Mauvaise",
        Niveau_stress: "Très élevé"
      },
      currentDiseases: ["Hypertension", "Diabète de type 2", "Maladie cardiaque"]
    }
  };
  
  return patients[nin as keyof typeof patients] || null;
};

export const fetchPredictions = async (nin: string): Promise<any> => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Mock data for predictions
  const predictions = {
    "A123456789": {
      healthMetrics: generateHealthMetrics("A123456789"),
      diseaseRisks: generateDiseaseRisks("A123456789"),
      familyData: generateFamilyData("A123456789")
    },
    "B234567890": {
      healthMetrics: generateHealthMetrics("B234567890"),
      diseaseRisks: generateDiseaseRisks("B234567890"),
      familyData: generateFamilyData("B234567890")
    },
    "C345678901": {
      healthMetrics: generateHealthMetrics("C345678901"),
      diseaseRisks: generateDiseaseRisks("C345678901"),
      familyData: generateFamilyData("C345678901")
    }
  };
  
  return predictions[nin as keyof typeof predictions] || { healthMetrics: [], diseaseRisks: [], familyData: null };
};

// Helper function to generate health metrics data
function generateHealthMetrics(nin: string): HealthMetric[] {
  const metrics = [];
  const metricNames = [
    { name: "Tension artérielle systolique", unit: "mmHg", baseValue: nin === "A123456789" ? 140 : nin === "B234567890" ? 120 : 155 },
    { name: "Tension artérielle diastolique", unit: "mmHg", baseValue: nin === "A123456789" ? 90 : nin === "B234567890" ? 75 : 95 },
    { name: "Fréquence cardiaque au repos", unit: "bpm", baseValue: nin === "A123456789" ? 75 : nin === "B234567890" ? 68 : 80 },
    { name: "IMC", unit: "kg/m²", baseValue: nin === "A123456789" ? 29 : nin === "B234567890" ? 22 : 31 },
    { name: "Glycémie à jeun", unit: "mg/dL", baseValue: nin === "A123456789" ? 110 : nin === "B234567890" ? 90 : 135 },
    { name: "Cholestérol total", unit: "mg/dL", baseValue: nin === "A123456789" ? 210 : nin === "B234567890" ? 175 : 240 }
  ];
  
  const today = new Date();
  
  for (const metric of metricNames) {
    for (let i = 0; i < 12; i++) {
      const date = new Date();
      date.setMonth(today.getMonth() - (11 - i));
      
      const variation = Math.sin(i / 3) * 8;
      const actualValue = metric.baseValue + variation + Math.random() * 5 - 2.5;
      
      // For the first 9 months, we have "actual" values
      if (i < 9) {
        metrics.push({
          date: date.toISOString().substring(0, 10),
          metricName: metric.name,
          actualValue: actualValue,
          predictedValue: actualValue + (Math.random() * 6 - 3),
          unit: metric.unit
        });
      } 
      // For the last 3 months, we only have predictions
      else {
        const previousTrend = (metrics[metrics.length - 1].actualValue - metrics[metrics.length - 2].actualValue) / 2;
        const predictedValue = metrics[metrics.length - 1].actualValue + previousTrend + (Math.random() * 4 - 2);
        
        metrics.push({
          date: date.toISOString().substring(0, 10),
          metricName: metric.name,
          actualValue: 0, // Will be rendered as a gap
          predictedValue: predictedValue,
          unit: metric.unit
        });
      }
    }
  }
  
  return metrics;
}

// Helper function to generate disease risk data
function generateDiseaseRisks(nin: string): DiseaseRisk[] {
  const baseRisks = {
    "A123456789": {
      "Hypertension": { risk: 0.85, avg: 0.4 },
      "Diabète de type 2": { risk: 0.75, avg: 0.35 },
      "Maladie cardiaque": { risk: 0.65, avg: 0.3 },
      "AVC": { risk: 0.55, avg: 0.25 },
      "Maladie rénale chronique": { risk: 0.45, avg: 0.2 },
      "Cancer du côlon": { risk: 0.3, avg: 0.15 },
      "Apnée du sommeil": { risk: 0.4, avg: 0.2 },
      "Arthrose": { risk: 0.5, avg: 0.3 }
    },
    "B234567890": {
      "Hypertension": { risk: 0.2, avg: 0.4 },
      "Diabète de type 2": { risk: 0.15, avg: 0.35 },
      "Maladie cardiaque": { risk: 0.1, avg: 0.3 },
      "AVC": { risk: 0.15, avg: 0.25 },
      "Maladie rénale chronique": { risk: 0.05, avg: 0.2 },
      "Cancer du sein": { risk: 0.4, avg: 0.3 },
      "Asthme": { risk: 0.7, avg: 0.25 },
      "Dépression": { risk: 0.45, avg: 0.2 }
    },
    "C345678901": {
      "Hypertension": { risk: 0.95, avg: 0.4 },
      "Diabète de type 2": { risk: 0.9, avg: 0.35 },
      "Maladie cardiaque": { risk: 0.85, avg: 0.3 },
      "AVC": { risk: 0.75, avg: 0.25 },
      "Maladie rénale chronique": { risk: 0.65, avg: 0.2 },
      "Cancer de la prostate": { risk: 0.55, avg: 0.3 },
      "BPCO": { risk: 0.7, avg: 0.2 },
      "Alzheimer": { risk: 0.5, avg: 0.3 }
    }
  };
  
  const patientRisks = baseRisks[nin as keyof typeof baseRisks] || {};
  
  return Object.entries(patientRisks).map(([diseaseName, values]) => ({
    diseaseName,
    riskScore: values.risk,
    averageRisk: values.avg
  }));
}

// Helper function to generate family graph data
function generateFamilyData(nin: string): GraphData {
  const familyGraphs = {
    "A123456789": {
      nodes: [
        { id: "A123456789", name: "Ahmed Benali", type: "patient", diseaseCount: 2 },
        { id: "D456789012", name: "Farid Benali", type: "parent", diseaseCount: 3 },
        { id: "E567890123", name: "Fatima Benali", type: "parent", diseaseCount: 1 },
        { id: "F678901234", name: "Karim Benali", type: "sibling", diseaseCount: 0 },
        { id: "G789012345", name: "Nadir Benali", type: "sibling", diseaseCount: 1 },
        { id: "H890123456", name: "Leila Benali", type: "child", diseaseCount: 0 },
        { id: "I901234567", name: "Omar Benali", type: "child", diseaseCount: 0 }
      ],
      links: [
        { source: "D456789012", target: "A123456789", relation: "père" },
        { source: "E567890123", target: "A123456789", relation: "mère" },
        { source: "A123456789", target: "F678901234", relation: "frère" },
        { source: "A123456789", target: "G789012345", relation: "frère" },
        { source: "A123456789", target: "H890123456", relation: "fille" },
        { source: "A123456789", target: "I901234567", relation: "fils" }
      ]
    },
    "B234567890": {
      nodes: [
        { id: "B234567890", name: "Samia Zerrouki", type: "patient", diseaseCount: 1 },
        { id: "J012345678", name: "Hamid Zerrouki", type: "parent", diseaseCount: 2 },
        { id: "K123456789", name: "Aïcha Zerrouki", type: "parent", diseaseCount: 0 },
        { id: "L234567890", name: "Amina Zerrouki", type: "sibling", diseaseCount: 0 },
        { id: "M345678901", name: "Sarah Zerrouki", type: "child", diseaseCount: 0 },
        { id: "N456789012", name: "Khalil Zerrouki", type: "child", diseaseCount: 0 }
      ],
      links: [
        { source: "J012345678", target: "B234567890", relation: "père" },
        { source: "K123456789", target: "B234567890", relation: "mère" },
        { source: "B234567890", target: "L234567890", relation: "sœur" },
        { source: "B234567890", target: "M345678901", relation: "fille" },
        { source: "B234567890", target: "N456789012", relation: "fils" }
      ]
    },
    "C345678901": {
      nodes: [
        { id: "C345678901", name: "Mohamed Kaddour", type: "patient", diseaseCount: 3 },
        { id: "O567890123", name: "Ali Kaddour", type: "parent", diseaseCount: 3 },
        { id: "P678901234", name: "Nadia Kaddour", type: "parent", diseaseCount: 2 },
        { id: "Q789012345", name: "Youcef Kaddour", type: "sibling", diseaseCount: 1 },
        { id: "R890123456", name: "Yasmine Kaddour", type: "child", diseaseCount: 0 },
        { id: "S901234567", name: "Riad Kaddour", type: "child", diseaseCount: 1 },
        { id: "T012345678", name: "Sofiane Kaddour", type: "child", diseaseCount: 0 }
      ],
      links: [
        { source: "O567890123", target: "C345678901", relation: "père" },
        { source: "P678901234", target: "C345678901", relation: "mère" },
        { source: "C345678901", target: "Q789012345", relation: "frère" },
        { source: "C345678901", target: "R890123456", relation: "fille" },
        { source: "C345678901", target: "S901234567", relation: "fils" },
        { source: "C345678901", target: "T012345678", relation: "fils" }
      ]
    }
  };
  
  return familyGraphs[nin as keyof typeof familyGraphs] || null;
}

export const fetchStatistics = async () => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  // Mock disease statistics
  const diseaseStats = [
    {
      diseaseName: "Hypertension",
      count: 450,
      percentage: 35.2,
      byWilaya: {
        "Alger": { count: 150, percentage: 38.5 },
        "Oran": { count: 120, percentage: 32.4 },
        "Constantine": { count: 90, percentage: 35.8 },
        "Annaba": { count: 50, percentage: 31.2 },
        "Sétif": { count: 40, percentage: 33.6 }
      },
      byAge: {
        "0-20": 2.5,
        "21-40": 15.8,
        "41-60": 42.3,
        "61+": 39.4
      },
      byGender: {
        "M": 53.2,
        "F": 46.8
      }
    },
    {
      diseaseName: "Diabète de type 2",
      count: 380,
      percentage: 29.7,
      byWilaya: {
        "Alger": { count: 130, percentage: 33.4 },
        "Oran": { count: 95, percentage: 25.7 },
        "Constantine": { count: 75, percentage: 29.8 },
        "Annaba": { count: 45, percentage: 28.1 },
        "Sétif": { count: 35, percentage: 29.4 }
      },
      byAge: {
        "0-20": 1.2,
        "21-40": 18.5,
        "41-60": 45.8,
        "61+": 34.5
      },
      byGender: {
        "M": 48.5,
        "F": 51.5
      }
    }
  ];
  
  // Mock lifestyle statistics
  const lifestyleStats = [
    {
      category: "Activité physique",
      distribution: {
        "Très faible": { count: 250, percentage: 19.5 },
        "Faible": { count: 380, percentage: 29.7 },
        "Modérée": { count: 420, percentage: 32.8 },
        "Intense": { count: 230, percentage: 18.0 }
      },
      byWilaya: {
        "Alger": {
          "Très faible": 21.3,
          "Faible": 28.5,
          "Modérée": 31.2,
          "Intense": 19.0
        },
        "Oran": {
          "Très faible": 18.7,
          "Faible": 30.1,
          "Modérée": 33.5,
          "Intense": 17.7
        }
      }
    },
    {
      category: "Statut tabagique",
      distribution: {
        "Non-fumeur": { count: 580, percentage: 45.3 },
        "Ex-fumeur": { count: 320, percentage: 25.0 },
        "Fumeur": { count: 380, percentage: 29.7 }
      },
      byWilaya: {
        "Alger": {
          "Non-fumeur": 43.5,
          "Ex-fumeur": 26.2,
          "Fumeur": 30.3
        },
        "Oran": {
          "Non-fumeur": 46.8,
          "Ex-fumeur": 24.3,
          "Fumeur": 28.9
        }
      }
    }
  ];
  
  return { diseaseStats, lifestyleStats };
};