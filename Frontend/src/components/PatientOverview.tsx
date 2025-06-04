import React from 'react';
import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import wilayas from '../api/Wilaya_Of_Algeria.json';

interface HealthMetric {
  metricName: string;
  actualValue: number;
  predictedValue: number;
  unit: string;
  date: string;
}

interface BackendHealthMetric {
  name: string;
  originalName: string;
  predictions: Array<{
    month: string;
    value: number;
    step: number;
  }>;
  currentValue: number;
  unit:string;
  trend: string;
}

interface DiseaseRisk {
  diseaseName: string;
  riskScore: number;
  originalName: string;
  averageRisk: number;
}

interface BackendDiseaseRisk {
  name: string;
  originalName: string;
  probability: number;
  riskLevel: string;
  predicted: boolean;
}

interface Patient {
  NIN: string;
  Nom: string;
  Prénom: string;
  age: number;
  Groupe_sanguin: string;
  Wilaya: string;
  Sexe: string;
  Date_naissance: string;
  lifestyle?: Record<string, string>;
}

interface PatientOverviewProps {
  currentDiseases: string[];
  patient: Patient | null;
  healthMetrics: HealthMetric[] | BackendHealthMetric[];
  diseaseRisks: DiseaseRisk[] | BackendDiseaseRisk[];
}
const wilayaMap: Record<string, string> = wilayas.reduce((acc, wilaya) => {
  acc[wilaya.code] = wilaya.name;
  return acc;
}, {} as Record<string, string>);

const PatientOverview: React.FC<PatientOverviewProps> = ({ 
  currentDiseases,
  patient, 
  healthMetrics, 
  diseaseRisks
}) => {
  const getMetricStatus = (currentValue: number, predictedValue: number) => {
    const diff = ((predictedValue - currentValue) / currentValue) * 100;
    if (Math.abs(diff) < 2) {
      return { icon: <Minus className="h-4 w-4" />, color: 'text-gray-500' };
    } else if (diff > 0) {
      return { icon: <ArrowUp className="h-4 w-4" />, color: 'text-red-500' };
    } else {
      return { icon: <ArrowDown className="h-4 w-4" />, color: 'text-green-500' };
    }
  };

  const isOldFormat = (metrics: any[]): metrics is HealthMetric[] => {
    return metrics.length > 0 && 'actualValue' in metrics[0];
  };

  const isOldRiskFormat = (risks: any[]): risks is DiseaseRisk[] => {
    return risks.length > 0 && 'riskScore' in risks[0];
  };
  
  const convertHealthMetrics = (metrics: BackendHealthMetric[]): HealthMetric[] => {
    return metrics.map(metric => ({
      metricName: metric.name,
      actualValue: metric.currentValue,
      predictedValue: (metric.predictions && metric.predictions.length > 1) ? metric.predictions[1].value : metric.currentValue,
      unit: metric.unit || '',
      date: new Date().toISOString()
    }));
  };

  const convertDiseaseRisks = (risks: BackendDiseaseRisk[]): DiseaseRisk[] => {
    return risks.map(risk => ({
      diseaseName: risk.name,
      riskScore: risk.probability,
      averageRisk: 0.5
    }));
  };

  let processedHealthMetrics: HealthMetric[] = [];
  if (healthMetrics && healthMetrics.length > 0) {
    if (isOldFormat(healthMetrics)) {
      processedHealthMetrics = healthMetrics.reduce((acc, metric) => {
        const existing = acc.find(m => m.metricName === metric.metricName);
        if (!existing || new Date(metric.date) > new Date(existing.date)) {
          const index = existing ? acc.indexOf(existing) : -1;
          if (index !== -1) {
            acc[index] = metric;
          } else {
            acc.push(metric);
          }
        }
        return acc;
      }, [] as HealthMetric[]);
    } else {
      processedHealthMetrics = convertHealthMetrics(healthMetrics as BackendHealthMetric[]);
    }
  }

  let processedDiseaseRisks: DiseaseRisk[] = [];
  if (diseaseRisks && diseaseRisks.length > 0) {
    if (isOldRiskFormat(diseaseRisks)) {
      processedDiseaseRisks = [...diseaseRisks].sort((a, b) => b.riskScore - a.riskScore);
    } else {
      const converted = convertDiseaseRisks(diseaseRisks as BackendDiseaseRisk[]);
      processedDiseaseRisks = converted.sort((a, b) => b.riskScore - a.riskScore);
    }
  }

  if (!patient) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-500 text-lg">Aucune donnée patient disponible</p>
      </div>
    );
  }

  // Mapping for lifestyle field names
  const lifestyleFieldNames = {
    'Statut_tabagique': 'Statut tabagique',
    'Cigarettes_par_jour': 'Cigarettes par jour',
    'Années_de_tabagisme': 'Années de tabagisme',
    'Consommation_alcool': 'Consommation d\'alcool',
    'Activité_physique': 'Activité physique',
    'Heures_activité_hebdo': 'Heures d\'activité hebdo',
    'Qualité_alimentation': 'Qualité de l\'alimentation',
    'Qualité_sommeil': 'Qualité du sommeil'
  };
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Informations du patient</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Nom complet</p>
              <p className="font-medium">{patient.Prénom} {patient.Nom}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Numéro d'identification</p>
              <p className="font-medium">{patient.NIN}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Âge</p>
              <p className="font-medium">{patient.age} ans</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Groupe sanguin</p>
              <p className="font-medium">{patient.Groupe_sanguin}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Wilaya</p>
              <p className="font-medium">{wilayaMap[patient.Wilaya] || patient.Wilaya}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Sexe</p>
              <p className="font-medium">
                {patient.Sexe === 'M'
                  ? 'Masculin'
                  : patient.Sexe === 'F'
                  ? 'Féminin'
                  : ''}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Date de naissance</p>
              <p className="font-medium">{new Date(patient.Date_naissance).toLocaleDateString()}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Style de vie</h2>
          {patient.lifestyle && Object.keys(patient.lifestyle).length > 0 ? (
            <div className="grid grid-cols-3 gap-4">
              {Object.entries(patient.lifestyle).map(([key, value]) => (
                <div key={key}>
                  <p className="text-sm text-gray-500">{lifestyleFieldNames[key] || key.replace(/_/g, ' ')}</p>
                  <p className="font-medium">{value}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">Aucune information sur le style de vie disponible</p>
          )}
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Métriques de santé récentes</h2>
          {processedHealthMetrics && processedHealthMetrics.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {processedHealthMetrics.map((metric, index) => {
                const actualValue = metric.actualValue ?? 0;
                const predictedValue = metric.predictedValue ?? 0;
                const status = getMetricStatus(actualValue, predictedValue);
                
                return (
                  <div key={index} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-sm text-gray-500">{metric.metricName}</p>
                      <div className={status.color}></div>
                    </div>
                    <div className='flex items-center' >
                       <p className="text-xl font-semibold mr-4">{actualValue.toFixed(1)} </p>
                       <span className='text-sm/8'>{metric.unit}</span>
                    </div>
                    <div className="flex items-center mt-1">
                      <span className="text-xs text-gray-500">Prédiction: </span>
                      <span className="text-xs ml-1 font-medium">
                        {predictedValue.toFixed(1)} {metric.unit}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500">Aucune métrique de santé disponible</p>
          )}
        </div>
      </div>
      
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Maladies actuelles</h2>
          {currentDiseases && currentDiseases.length > 0 ? (
            <ul className="space-y-2">
              {currentDiseases.map((item, index) => (
                <li key={index} className="bg-red-50 text-red-800 px-3 py-2 rounded-lg text-sm">
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">Aucune maladie chronique diagnostiquée</p>
          )}
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Risques prédits</h2>
          {processedDiseaseRisks && processedDiseaseRisks.length > 0 ? (
            <div className="space-y-3">
              {processedDiseaseRisks.slice(0, 9).map((risk, index) => (
                <div key={index}>
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-sm">{risk.diseaseName}</p>
                    <p
                      className={`text-sm font-medium ${
                        risk.riskScore > 0.7
                          ? 'text-red-600'
                          : risk.riskScore > 0.4
                          ? 'text-amber-600'
                          : 'text-green-600'
                      }`}
                    >
                      {(risk.riskScore * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        risk.riskScore > 0.7
                          ? 'bg-red-500'
                          : risk.riskScore > 0.4
                          ? 'bg-amber-500'
                          : 'bg-green-500'
                      }`}
                      style={{ width: `${risk.riskScore * 100}%` }}
                    ></div>
                  </div>
    
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">Aucun risque prédit disponible</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PatientOverview;