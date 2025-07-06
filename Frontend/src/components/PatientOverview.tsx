import React, { useState, useRef, useEffect } from 'react';
import { ArrowDown, ArrowUp, Minus, User, Calendar, Activity } from 'lucide-react';
import wilayas from '../api/Wilaya_Of_Algeria.json';

// ... (keep all existing interfaces unchanged)

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
  unit: string;
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

interface ActualBackendDiseaseRisk {
  disease: string;
  risk: number;
  risk_level: string;
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

interface Parent {
  NIN: string;
  Nom: string;
  Prénom: string;
  Sexe: string;
  age: number;
  relation_type: string;
  current_diseases?: string[];
}

interface FamilyData {
  parents: Parent[];
  hasParentsData: boolean;
}

interface PatientOverviewProps {
  currentDiseases: string[];
  patient: Patient | null;
  healthMetrics: Array<{ date: string; metrics: Record<string, { unit: string; value: number }> }>;
  healthMetricsPredictions: { time_series: Array<{ time_step: string; predictions: Record<string, number> }> } | null;
  diseaseRisks: DiseaseRisk[] | BackendDiseaseRisk[] | ActualBackendDiseaseRisk[];
  familyData: FamilyData | null;
  onPatientSelect: (nin: string) => void;
}

// Modern Tooltip Component
interface TooltipProps {
  parent: Parent;
  onPatientSelect: (nin: string) => void;
  children: React.ReactNode;
}

const ModernTooltip: React.FC<TooltipProps> = ({ parent, onPatientSelect, children }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible && triggerRef.current && tooltipRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      let top = triggerRect.bottom + 8;
      let left = triggerRect.left;
      
      // Adjust horizontal position if tooltip would overflow
      if (left + tooltipRect.width > viewportWidth - 16) {
        left = viewportWidth - tooltipRect.width - 16;
      }
      if (left < 16) {
        left = 16;
      }
      
      // Adjust vertical position if tooltip would overflow
      if (top + tooltipRect.height > viewportHeight - 16) {
        top = triggerRect.top - tooltipRect.height - 8;
      }
      
      setPosition({ top, left });
    }
  }, [isVisible]);

  const handleMouseEnter = () => {
    setIsVisible(true);
  };

  const handleMouseLeave = () => {
    setIsVisible(false);
  };

  // Filter gender-specific diseases for parents
  const getFilteredDiseases = (diseases: string[], parentSex: string) => {
    if (!diseases) return [];
    
    return diseases.filter(disease => {
      const diseaseLower = disease.toLowerCase();
      
      if (parentSex === 'M') {
        // If parent is male (père), don't display breast cancer
        return !diseaseLower.includes('cancer_du_sein') && 
               !diseaseLower.includes('cancer du sein');
      }
      
      if (parentSex === 'F') {
        // If parent is female (mère), don't display prostate cancer
        return !diseaseLower.includes('cancer_de_la_prostate') && 
               !diseaseLower.includes('cancer de la prostate');
      }
      
      return true;
    });
  };

  const filteredDiseases = getFilteredDiseases(parent.current_diseases || [], parent.Sexe);

  return (
    <>
      <button
        ref={triggerRef}
        className="font-medium text-blue-600 hover:text-blue-800 transition-colors duration-200 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 rounded"
        onClick={() => onPatientSelect(parent.NIN)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </button>
      
      {isVisible && (
        <div
          ref={tooltipRef}
          className="fixed z-50 bg-white rounded-xl shadow-2xl border border-gray-200 p-5 max-w-xs animate-in fade-in-0 zoom-in-95 duration-200"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
            filter: 'drop-shadow(0 25px 25px rgb(0 0 0 / 0.15))',
          }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >

          
          {/* Header with avatar and name */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-shrink-0 w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-base leading-tight">
                {parent.Prénom} {parent.Nom}
              </h3>
              <p className="text-xs text-gray-500 font-medium">
                {parent.Sexe === 'M' ? 'Père' : parent.Sexe === 'F' ? 'Mère' : 'Parent'}
              </p>
            </div>
          </div>

          {/* Details with icons */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">{parent.age} ans</span>
            </div>
            
            <div className="flex items-start gap-2">
              <Activity className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm text-gray-600 font-medium mb-1">Maladies actuelles:</p>
                {filteredDiseases && filteredDiseases.length > 0 ? (
                  <div className="space-y-1">
                    {filteredDiseases.slice(0, 3).map((disease, index) => (
                      <span 
                        key={index} 
                        className="inline-block bg-red-50 text-red-800 px-2 py-1 rounded-md text-xs  mr-1 mb-1"
                      >
                        {disease.replace(/_/g, ' ')} 
                      </span>
                    ))}
                    {filteredDiseases.length > 3 && (
                      <span className="text-xs text-gray-500 font-medium">
                        +{filteredDiseases.length - 3} autres
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="inline-block bg-green-50 text-green-700 px-2 py-1 rounded-md text-xs font-medium">
                    Aucune maladie
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Footer with click hint */}
          <div className="mt-4 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-400 text-center">
              Cliquez pour voir le profil complet
            </p>
          </div>
        </div>
      )}
    </>
  );
};

const wilayaMap: Record<string, string> = wilayas.reduce((acc, wilaya) => {
  acc[wilaya.code] = wilaya.name;
  return acc;
}, {} as Record<string, string>);

const PatientOverview: React.FC<PatientOverviewProps> = ({ 
  currentDiseases,
  patient, 
  healthMetrics, 
  healthMetricsPredictions,
  diseaseRisks,
  familyData,
  onPatientSelect
}) => {
  
  const filterGenderSpecificDiseases = (diseases: string[], patientSex: string) => {
    return diseases.filter(disease => {
      const diseaseLower = disease.toLowerCase();
      
      if (patientSex === 'M') {
        return !diseaseLower.includes('cancer_du_sein') && 
               !diseaseLower.includes('cancer du sein');
      }
      
      if (patientSex === 'F') {
        return !diseaseLower.includes('cancer_de_la_prostate') && 
               !diseaseLower.includes('cancer de la prostate');
      }
      
      return true;
    });
  };

  const filterGenderSpecificRisks = (risks: DiseaseRisk[], patientSex: string) => {
    return risks.filter(risk => {
      const diseaseLower = risk.diseaseName.toLowerCase();
      const originalLower = risk.originalName?.toLowerCase() || '';
      
      if (patientSex === 'M') {
        return !diseaseLower.includes('cancer du sein') && 
               !diseaseLower.includes('cancer_du_sein') &&
               !originalLower.includes('cancer_du_sein') &&
               !originalLower.includes('cancer du sein');
      }
      
      if (patientSex === 'F') {
        return !diseaseLower.includes('cancer de la prostate') && 
               !diseaseLower.includes('cancer_de_la_prostate') &&
               !originalLower.includes('cancer_de_la_prostate') &&
               !originalLower.includes('cancer de la prostate');
      }
      
      return true;
    });
  };

  const getMetricStatus = (currentValue: number, predictedValue: number) => {
    currentValue = Math.round(currentValue * 10) / 10;
    predictedValue = Math.round(predictedValue * 10) / 10;
    
    const diff = currentValue - predictedValue;
    const epsilon = 0.05;

    if (Math.abs(diff) <= epsilon) {
        return { icon: <Minus className="h-4 w-4" />, color: 'text-blue-500' };
    } else if (diff > 0) {
        return { icon: <ArrowDown className="h-4 w-4" />, color: 'text-blue-500' };
    } else {
        return { icon: <ArrowUp className="h-4 w-4" />, color: 'text-blue-500' };
    }
  };

  const isOldFormat = (metrics: any[]): metrics is HealthMetric[] => {
    return metrics.length > 0 && 'actualValue' in metrics[0];
  };

  const isOldRiskFormat = (risks: any[]): risks is DiseaseRisk[] => {
    return risks.length > 0 && 'riskScore' in risks[0];
  };

  const isBackendRiskFormat = (risks: any[]): risks is BackendDiseaseRisk[] => {
    return risks.length > 0 && 'probability' in risks[0];
  };

  const isActualBackendRiskFormat = (risks: any[]): risks is ActualBackendDiseaseRisk[] => {
    return risks.length > 0 && 'disease' in risks[0] && 'risk' in risks[0];
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
      averageRisk: 0.5,
      originalName: risk.originalName || risk.name
    }));
  };

  const convertActualBackendDiseaseRisks = (risks: ActualBackendDiseaseRisk[]): DiseaseRisk[] => {
    return risks.map(risk => ({
      diseaseName: risk.disease.replace(/_/g, ' '),
      riskScore: risk.risk / 100,
      averageRisk: 0.5,
      originalName: risk.disease
    }));
  };

  const processHealthMetrics = (): HealthMetric[] => {
    if (!healthMetrics || healthMetrics.length === 0) {
      return [];
    }

    const sortedHealthMetrics = [...healthMetrics].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const recentHistorical = sortedHealthMetrics[0];
    const metrics = recentHistorical.metrics;

    return Object.keys(metrics).map(metricName => {
      const actualMetric = metrics[metricName];
      const actualValue = actualMetric.value;
      const unit = actualMetric.unit;
      const predictedValue = healthMetricsPredictions?.time_series?.[0]?.predictions?.[metricName] ?? actualValue;

      return {
        metricName: metricName.replace(/_/g, ' '),
        actualValue,
        predictedValue,
        unit,
        date: recentHistorical.date
      };
    });
  };

  let processedHealthMetrics: HealthMetric[] = processHealthMetrics();

  let processedDiseaseRisks: DiseaseRisk[] = [];
  if (diseaseRisks && diseaseRisks.length > 0) {
    if (isOldRiskFormat(diseaseRisks)) {
      processedDiseaseRisks = [...diseaseRisks].sort((a, b) => b.riskScore - a.riskScore);
    } else if (isActualBackendRiskFormat(diseaseRisks)) {
      const converted = convertActualBackendDiseaseRisks(diseaseRisks as ActualBackendDiseaseRisk[]);
      processedDiseaseRisks = converted.sort((a, b) => b.riskScore - a.riskScore);
    } else if (isBackendRiskFormat(diseaseRisks)) {
      const converted = convertDiseaseRisks(diseaseRisks as BackendDiseaseRisk[]);
      processedDiseaseRisks = converted.sort((a, b) => b.riskScore - a.riskScore);
    }
  }

  const filteredCurrentDiseases = patient ? filterGenderSpecificDiseases(currentDiseases, patient.Sexe) : currentDiseases;
  const filteredDiseaseRisks = patient ? filterGenderSpecificRisks(processedDiseaseRisks, patient.Sexe) : processedDiseaseRisks;

  if (!patient) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-500 text-lg">Aucune donnée patient disponible</p>
      </div>
    );
  }

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
          </div>
          {familyData && familyData.hasParentsData && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Parents</h3>
              <div className="space-y-3">
                {familyData.parents.map(parent => (
                  <div key={parent.NIN} className="flex items-center gap-2">
                    <span className="text-sm text-gray-500 min-w-0 flex-shrink-0">
                      {parent.Sexe === 'M' ? 'Père:' : parent.Sexe === 'F' ? 'Mère:' : 'Parent:'}
                    </span>
                    <ModernTooltip parent={parent} onPatientSelect={onPatientSelect}>
                      {parent.Prénom} {parent.Nom}
                    </ModernTooltip>
                  </div>
                ))}
              </div>
            </div>
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
                      <div className={status.color}>{status.icon}</div>
                    </div>
                    <div className='flex items-center'>
                      <p className="text-xl font-semibold mr-4">{actualValue.toFixed(1)}</p>
                      <span className='text-sm/8'></span>
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
          {filteredCurrentDiseases && filteredCurrentDiseases.length > 0 ? (
            <ul className="space-y-2">
              {filteredCurrentDiseases.map((item, index) => (
                <li key={index} className="bg-red-50 text-red-800 px-3 py-2 rounded-lg text-sm">
                  {item.replace(/_/g, ' ')}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">Aucune maladie chronique diagnostiquée</p>
          )}
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Risques prédits</h2>
          {filteredDiseaseRisks && filteredDiseaseRisks.length > 0 ? (
            <div className="space-y-3">
              {filteredDiseaseRisks.slice(0, 9).map((risk, index) => (
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