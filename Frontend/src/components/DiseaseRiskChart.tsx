import React, { useState } from 'react';

// Updated interface to match your actual data structure
interface DiseaseRisk {
  name: string;
  originalName: string;
  predicted: boolean;
  probability: number;
  riskLevel: string;
}

interface DiseaseRiskChartProps {
  data: DiseaseRisk[];
}

const DiseaseRiskChart: React.FC<DiseaseRiskChartProps> = ({ data }) => {
  const [sortMethod, setSortMethod] = useState<'risk' | 'name'>('risk');
  
  // Ensure data is an array and filter out invalid entries
  const validData = Array.isArray(data) ? data.filter(item => 
    item && 
    typeof item.name === 'string' && 
    typeof item.probability === 'number'
  ) : [];
  
  // Sort the data
  const sortedData = [...validData].sort((a, b) => {
    if (sortMethod === 'risk') {
      return b.probability - a.probability;
    } else {
      return a.name.localeCompare(b.name);
    }
  });
  
  const getRiskCategory = (score: number, riskLevel?: string) => {
    // Use the riskLevel if available, otherwise calculate from score
    if (riskLevel) {
      switch (riskLevel.toLowerCase()) {
        case 'high':
        case 'élevé':
          return { color: 'bg-red-500', text: 'Élevé', textColor: 'text-red-800' };
        case 'medium':
        case 'modéré':
          return { color: 'bg-amber-500', text: 'Modéré', textColor: 'text-amber-800' };
        case 'low':
        case 'faible':
          return { color: 'bg-green-500', text: 'Faible', textColor: 'text-green-800' };
        default:
          break;
      }
    }
    
    // Fallback to score-based categorization
    if (score >= 0.7) return { color: 'bg-red-500', text: 'Élevé', textColor: 'text-red-800' };
    if (score >= 0.4) return { color: 'bg-amber-500', text: 'Modéré', textColor: 'text-amber-800' };
    return { color: 'bg-green-500', text: 'Faible', textColor: 'text-green-800' };
  };

  return (
    <div className="h-full">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Risques de maladies</h2>
          <p className="text-sm text-gray-500">Prédictions de risques pour les maladies chroniques</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <span className="text-sm text-gray-700">Trier par:</span>
          <div className="flex rounded-md shadow-sm">
            <button
              className={`px-3 py-1.5 text-sm font-medium rounded-l-md transition-colors ${
                sortMethod === 'risk' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => setSortMethod('risk')}
            >
              Risque
            </button>
            <button
              className={`px-3 py-1.5 text-sm font-medium rounded-r-md transition-colors ${
                sortMethod === 'name' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white text-gray-700 border border-l-0 border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => setSortMethod('name')}
            >
              Nom
            </button>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100 h-[500px] overflow-y-auto">
        {/* Header */}
        <div className="grid grid-cols-1 gap-4 mb-4">
          <div className="flex items-center bg-gray-50 p-3 rounded-lg">
            <div className="w-48 font-medium text-gray-700">Maladie</div>
            <div className="flex-1 font-medium text-gray-700">Probabilité de risque</div>
            <div className="w-24 text-right font-medium text-gray-700">Statut</div>
          </div>
        </div>
        
        {/* Disease Risk Items */}
        <div className="grid grid-cols-1 gap-4">
          {sortedData.length > 0 ? sortedData.map((disease, index) => {
            const riskCategory = getRiskCategory(disease.probability, disease.riskLevel);
            
            return (
              <div key={index} className="flex items-center bg-white border border-gray-100 p-4 rounded-lg hover:bg-gray-50 transition-colors duration-200">
                {/* Disease Name and Category */}
                <div className="w-48">
                  <p className="font-medium text-gray-900 mb-1">{disease.name}</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-opacity-20 ${riskCategory.color.replace('bg-', 'bg-opacity-20 ')} ${riskCategory.textColor}`}>
                    {riskCategory.text}
                  </span>
                </div>
                
                {/* Risk Progress Bar */}
                <div className="flex-1 px-4">
                  <div className="flex items-center">
                    <div className="w-full">
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">
                          {(disease.probability * 100).toFixed(1)}%
                        </span>
                        <span className="text-xs text-gray-500">
                          Probabilité: {disease.probability.toFixed(3)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                          className={`h-3 rounded-full transition-all duration-500 ${riskCategory.color}`}
                          style={{ width: `${Math.min(disease.probability * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Prediction Status */}
                
              </div>
            );
          }) : null}
          
          {/* Empty State */}
          {sortedData.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-2">
                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <p className="text-gray-500 font-medium">Aucune donnée de risque disponible</p>
              <p className="text-gray-400 text-sm mt-1">Sélectionnez un patient pour voir les risques de maladies</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DiseaseRiskChart;