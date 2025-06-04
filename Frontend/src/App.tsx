import React, { useState, useEffect } from 'react';
import { CircleUser, BarChart, LineChart, Users } from 'lucide-react';
import Sidebar from './components/Sidebar';
import DashboardHeader from './components/DashboardHeader';
import PatientOverview from './components/PatientOverview';
import HealthMetricsChart from './components/HealthMetricsChart';
import DiseaseRiskChart from './components/DiseaseRiskChart';
import FamilyGraph from './components/FamilyGraph';
import StatisticsView from './components/StatisticsView';
import { fetchStatistics } from './api/healthApi';
import 'mapbox-gl/dist/mapbox-gl.css';

// Define interfaces for type safety
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

interface FamilyData {
  [key: string]: any; // Adjust based on actual familyData structure
}

interface StatsData {
  diseaseStats: any[]; // Adjust based on actual structure
  lifestyleStats: any[]; // Adjust based on actual structure
}

function App() {
  const [selectedPatient, setSelectedPatient] = useState<string | null>('statistics');
  const [patientDetails, setPatientDetails] = useState<Patient | null>(null);
  const [healthMetrics, setHealthMetrics] = useState<HealthMetric[]>([]);
  const [currentDiseases, setCurrentDiseases] = useState<string[]>([]);
  const [diseaseRisks, setDiseaseRisks] = useState<DiseaseRisk[]>([]);
  const [familyData, setFamilyData] = useState<FamilyData | null>(null);
  const [diseaseStats, setDiseaseStats] = useState<any[]>([]);
  const [lifestyleStats, setLifestyleStats] = useState<any[]>([]);
  const [activeView, setActiveView] = useState<'overview' | 'metrics' | 'risks' | 'family' | 'statistics'>('statistics');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'patients' | 'statistics'>('statistics');

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const statsData: StatsData = await fetchStatistics();
        setDiseaseStats(statsData.diseaseStats);
        setLifestyleStats(statsData.lifestyleStats);
        setLoading(false);
      } catch (error: any) {
        console.error('Error fetching initial data:', error);
        setError('Échec du chargement des statistiques initiales');
        setLoading(false);
      }
    };
    
    loadInitialData();
  }, []);

  const fetchPatientData = async (nin: string) => {
    try {
      setLoading(true);
      setError(null);
      // Validate that nin is a string of digits
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

      console.log('Response status:', response.status, 'OK:', response.ok);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`Erreur HTTP ! Statut: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('Response data:', data);
      if (!data.patientDetails || !data.healthMetrics || !data.diseaseRisks || !data.familyData || !data.currentDiseases) {
        console.error('Missing expected fields in response:', data);
        throw new Error('Structure de réponse invalide');
      }
      setCurrentDiseases(data.currentDiseases);
      setPatientDetails(data.patientDetails);
      setHealthMetrics(data.healthMetrics);
      setDiseaseRisks(data.diseaseRisks);
      setFamilyData(data.familyData);
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
          <StatisticsView diseaseStats={diseaseStats} lifestyleStats={lifestyleStats} />
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
            diseaseRisks={diseaseRisks}
          />
        );
        break;
      case 'metrics':
        content = <HealthMetricsChart data={healthMetrics} />;
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
            diseaseRisks={diseaseRisks}
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
        <button 
          onClick={() => setActiveView('family')}
          className={`flex items-center px-4 py-2 rounded-lg transition-all duration-200 ${
            activeView === 'family' 
              ? 'bg-blue-600 text-white' 
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          <Users className="mr-2 h-5 w-5" />
          Famille
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