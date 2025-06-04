import React from 'react';
import { Calendar, Clock } from 'lucide-react';
import { PatientDetail } from '../types';

interface DashboardHeaderProps {
  patient: PatientDetail | null;
  activeView: string;
  setActiveView: (view: string) => void;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ 
  patient, 
  activeView,
  setActiveView 
}) => {
  const getViewTitle = () => {
    switch (activeView) {
      case 'overview':
        return 'Vue générale du patient';
      case 'metrics':
        return 'Évolution des métriques de santé';
      case 'risks':
        return 'Évaluation des risques de maladies';
      case 'family':
        return 'Graphe des relations familiales';
      case 'overview':
         return 'Vue générale du patient'
      default:
        return 'Tendances des maladies en Algérie';
    }
  };
  
  const currentDate = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  
  const currentTime = new Date().toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <header className="bg-white border-b border-gray-200 py-4 px-6 flex items-center justify-between">
      <div>
        <h1 className="text-xl font-semibold text-gray-800">{getViewTitle()}</h1>
        {patient && (
          <p className="text-sm text-gray-500">
           
          </p>
        )}
      </div>
      
      <div className="flex items-center space-x-4">
        <div className="flex items-center text-gray-600">
          <Calendar className="h-4 w-4 mr-2" />
          <span className="text-sm">{currentDate}</span>
        </div>
        <div className="flex items-center text-gray-600">
          <Clock className="h-4 w-4 mr-2" />
          <span className="text-sm">{currentTime}</span>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;