import React, { useState, useEffect } from 'react';
import { CircleUser, BarChart, LineChart, Users } from 'lucide-react';
import Sidebar from './components/Sidebar';
import DashboardHeader from './components/DashboardHeader';
import PatientOverview from './components/PatientOverview';
import HealthMetricsChart from './components/HealthMetricsChart';
import DiseaseRiskChart from './components/DiseaseRiskChart';
import StatisticsView from './components/StatisticsView';
import 'mapbox-gl/dist/mapbox-gl.css';
import { addMonths, format } from 'date-fns';
import { fr } from 'date-fns/locale';

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

interface HealthMetric {
  metricName: string;
  originalName: string;
  unit: string;
  data: Array<{
    month: string;
    value: number;
    type: 'actual' | 'predicted';
    date: string;
  }>;
  currentValue: number;
}

interface DiseaseRisk {
  diseaseName: string;
  riskScore: number;
  averageRisk: number;
}

interface Parent {
  nin: string;
  fullName: string;
  firstName: string;
  lastName: string;
  relationship: string;
  sex: string;
  age: number | null;
}

interface FamilyData {
  parents: Parent[];
  hasParentsData: boolean;
}

function App() {
  const [selectedPatient, setSelectedPatient] = useState<string | null>('statistics');
  const [patientDetails, setPatientDetails] = useState<Patient | null>(null);
  const [healthMetrics, setHealthMetrics] = useState<any[]>([]);
  const [healthMetricsPredictions, setHealthMetricsPredictions] = useState<any>(null);
  const [processedHealthMetrics, setProcessedHealthMetrics] = useState<HealthMetric[]>([]);
  const [currentDiseases, setCurrentDiseases] = useState<string[]>([]);
  const [diseaseRisks, setDiseaseRisks] = useState<any[]>([]);
  const [familyData, setFamilyData] = useState<FamilyData | null>(null);
  const [activeView, setActiveView] = useState<'overview' | 'metrics' | 'risks' | 'family' | 'statistics'>('statistics');
  const [loading, setLoading] = useState(false); // No initial loading needed
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'patients' | 'statistics'>('statistics');

  const processHealthMetricsData = (healthMetrics: any[], predictions: any) => {
    if (!healthMetrics.length || !predictions?.time_series?.length) {
      setProcessedHealthMetrics([]);
      return;
    }

    const sortedHealthMetrics = [...healthMetrics].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const lastHistoricalDate = new Date(sortedHealthMetrics[sortedHealthMetrics.length - 1].date);
    const predictionDates = predictions.time_series.map((_: any, index: number) => 
      addMonths(lastHistoricalDate, index + 1)
    );

    const metricNames = Object.keys(sortedHealthMetrics[0].metrics);

    const healthMetricsData: HealthMetric[] = metricNames.map(metricName => {
      const historicalData = sortedHealthMetrics.map(entry => ({
        month: format(new Date(entry.date), 'MMM yyyy', { locale: fr }),
        value: entry.metrics[metricName].value,
        type: 'actual' as const,
        date: entry.date
      }));

      const predictedData = predictions.time_series.map((pred: any, index: number) => ({
        month: format(predictionDates[index], 'MMM yyyy', { locale: fr }),
        value: pred.predictions[metricName],
        type: 'predicted' as const,
        date: format(predictionDates[index], 'yyyy-MM-dd')
      }));

      const allData = [...historicalData, ...predictedData];

      return {
        metricName,
        originalName: metricName,
        unit: sortedHealthMetrics[0].metrics[metricName].unit,
        data: allData,
        currentValue: historicalData[historicalData.length - 1].value
      };
    });

    setProcessedHealthMetrics(healthMetricsData);
  };

  const fetchPatientData = async (nin: string) => {
    try {
      setLoading(true);
      setError(null);
      if (!/^\d+$/.test(nin)) {
        throw new Error('Format NIN invalide');
      }
      console.log('Sending NIN:', nin);
      
      const response = await fetch('http://localhost:5000/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nin: nin }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`Erreur HTTP ! Statut: ${response.status} - ${errorText}`);
      }
      const responseData = await response.json();
      console.log('Response data:', responseData);

      if (!responseData.success) {
        throw new Error('Request failed');
      }

      const actualData = responseData.data;

      if (
        !actualData.patientDetails ||
        !actualData.healthMetrics ||
        !actualData.diseaseRisks ||
        !actualData.familyData ||
        !actualData.currentDiseases
      ) {
        console.error('Missing expected fields in response:', actualData);
        throw new Error('Structure de réponse invalide');
      }

      setCurrentDiseases(actualData.currentDiseases);
      setPatientDetails(actualData.patientDetails);
      setHealthMetrics(actualData.healthMetrics);
      setHealthMetricsPredictions(actualData.healthMetricsPredictions);
      processHealthMetricsData(actualData.healthMetrics, actualData.healthMetricsPredictions);

      const gender = actualData.patientDetails.Sexe;
      const filteredRisks = actualData.diseaseRisks.filter((d: any) => {
        if (gender === "F" && d.disease === "Cancer_de_la_prostate") return false;
        if (gender === "M" && d.disease === "Cancer_du_sein") return false;
        return true;
      });
      setDiseaseRisks(filteredRisks.map((d: any) => ({
        name: d.disease,
        originalName: d.disease,
        predicted: true,
        probability: d.risk / 100,
        riskLevel: d.risk_level
      })));

      setFamilyData(actualData.familyData);
      setLoading(false);
    } catch (error: any) {
      console.error('Error fetching patient data:', error);
      setError(error.message || 'Échec du chargement des données du patient');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedPatient && selectedPatient !== 'statistics') {
      fetchPatientData(selectedPatient);
    } else {
      setPatientDetails(null);
      setHealthMetrics([]);
      setHealthMetricsPredictions(null);
      setProcessedHealthMetrics([]);
      setCurrentDiseases([]);
      setDiseaseRisks([]);
      setFamilyData(null);
    }
  }, [selectedPatient]);

  const handlePatientSelect = (nin: string) => {
    if (nin === 'statistics') {
      setViewMode('statistics');
      setActiveView('statistics');
      setSelectedPatient('statistics');
    } else {
      setViewMode('patients');
      setSelectedPatient(nin);
      setActiveView('overview');
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-full">
          <p className="text-red-500 text-lg">{error}</p>
        </div>
      );
    }

    if (viewMode === 'statistics' || activeView === 'statistics') {
      return (
        <div className="transition-opacity duration-300 ease-in-out opacity-100">
          <StatisticsView />
        </div>
      );
    }

    if (!selectedPatient || !patientDetails) {
      return (
        <div className="flex flex-col items-center justify-center h-full">
          <p className="text-gray-500 text-lg">Veuillez sélectionner un patient</p>
        </div>
      );
    }

    let content;
    switch (activeView) {
      case 'overview':
        content = (
          <PatientOverview
            currentDiseases={currentDiseases}
            patient={patientDetails}
            healthMetrics={healthMetrics}
            healthMetricsPredictions={healthMetricsPredictions}
            diseaseRisks={diseaseRisks}
            familyData={familyData}
            onPatientSelect={handlePatientSelect}
          />
        );
        break;
      case 'metrics':
        content = <HealthMetricsChart data={processedHealthMetrics} />;
        break;
      case 'risks':
        content = <DiseaseRiskChart data={diseaseRisks} />;
        break;
      case 'family':
        content = familyData && Object.keys(familyData).length > 0 ? (
          <FamilyGraph data={familyData} />
        ) : (
          <p className="text-gray-500 text-lg">Aucune donnée familiale disponible</p>
        );
        break;
      default:
        content = (
          <PatientOverview
            currentDiseases={currentDiseases}
            patient={patientDetails}
            healthMetrics={healthMetrics}
            healthMetricsPredictions={healthMetricsPredictions}
            diseaseRisks={diseaseRisks}
            familyData={familyData}
            onPatientSelect={handlePatientSelect}
          />
        );
    }

    return (
      <div className="transition-opacity duration-300 ease-in-out opacity-100">
        {content}
      </div>
    );
  };

  const renderNavigationTabs = () => {
    if (viewMode === 'statistics') {
      return null;
    }

    return (
      <div className="mb-4 flex space-x-4">
        <button
          onClick={() => setActiveView('overview')}
          className={`flex items-center px-4 py-2 rounded-lg transition-all duration-200 ${
            activeView === 'overview'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          <CircleUser className="mr-2 h-5 w-5" />
          Vue générale
        </button>
        <button
          onClick={() => setActiveView('metrics')}
          className={`flex items-center px-4 py-2 rounded-lg transition-all duration-200 ${
            activeView === 'metrics'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          <LineChart className="mr-2 h-5 w-5" />
          Métriques
        </button>
        <button
          onClick={() => setActiveView('risks')}
          className={`flex items-center px-4 py-2 rounded-lg transition-all duration-200 ${
            activeView === 'risks'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          <BarChart className="mr-2 h-5 w-5" />
          Risques
        </button>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar 
        selectedPatient={selectedPatient}
        onSelectPatient={handlePatientSelect}
        defaultActiveSection="statistics"
      />
      
      <div className="flex flex-col flex-1 overflow-hidden">
        <DashboardHeader 
          patient={patientDetails} 
          activeView={activeView} 
          setActiveView={setActiveView} 
        />

        <main className="flex-1 overflow-y-auto p-6">
          {renderNavigationTabs()}

          <div className="bg-white rounded-lg shadow p-6 min-h-[calc(100vh-16rem)] transition-all duration-300 ease-in-out">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;