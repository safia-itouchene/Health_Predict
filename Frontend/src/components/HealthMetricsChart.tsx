import React, { useState, useEffect } from 'react';

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

interface HealthMetricsChartProps {
  data: HealthMetric[];
}

const HealthMetricsChart: React.FC<HealthMetricsChartProps> = ({ data }) => {
  const [selectedMetric, setSelectedMetric] = useState<string>('');
  const [chartData, setChartData] = useState<any>([]);
  const [metrics, setMetrics] = useState<string[]>([]);
  const [selectedMetricUnit, setSelectedMetricUnit] = useState<string>('');
  
  useEffect(() => {
    // Extract unique metric names
    const uniqueMetrics = data.map(item => item.metricName);
    setMetrics(uniqueMetrics);
    
    if (uniqueMetrics.length > 0 && !selectedMetric) {
      setSelectedMetric(uniqueMetrics[0]);
    }
  }, [data, selectedMetric]);
  
  useEffect(() => {
    if (selectedMetric) {
      // Find the selected metric and use its data
      const selectedMetricData = data.find(item => item.metricName === selectedMetric);
      if (selectedMetricData) {
        const sortedData = selectedMetricData.data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        setChartData(sortedData);
        setSelectedMetricUnit(selectedMetricData.unit);
      }
    }
  }, [selectedMetric, data]);
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
  };
  
  // Separate actual and predicted data
  const actualData = chartData.filter((item: any) => item.type === 'actual');
  const predictedData = chartData.filter((item: any) => item.type === 'predicted');
  
  // Find min and max values for y-axis scaling
  const allValues = chartData.map((item: any) => item.value);
  const minValue = allValues.length > 0 ? Math.min(...allValues) * 0.9 : 0;
  const maxValue = allValues.length > 0 ? Math.max(...allValues) * 1.1 : 100;
  
  // Calculate chart dimensions
  const chartWidth = 900;
  const chartHeight = 400;
  const paddingX = 50;
  const paddingY = 40;
  const contentWidth = chartWidth - (paddingX * 2);
  const contentHeight = chartHeight - (paddingY * 2);
  
  // Generate points for actual data line
  const generateActualPoints = () => {
    if (actualData.length <= 1) return '';
    
    return actualData.map((item: any, index: number) => {
      const totalIndex = chartData.findIndex((d: any) => d.date === item.date);
      const x = paddingX + (totalIndex / (chartData.length - 1)) * contentWidth;
      const normalizedValue = (item.value - minValue) / (maxValue - minValue);
      const y = chartHeight - paddingY - (normalizedValue * contentHeight);
      return `${x},${y}`;
    }).join(' ');
  };
  
  // Generate points for predicted data line
  const generatePredictedPoints = () => {
    if (predictedData.length <= 1) return '';
    
    return predictedData.map((item: any, index: number) => {
      const totalIndex = chartData.findIndex((d: any) => d.date === item.date);
      const x = paddingX + (totalIndex / (chartData.length - 1)) * contentWidth;
      const normalizedValue = (item.value - minValue) / (maxValue - minValue);
      const y = chartHeight - paddingY - (normalizedValue * contentHeight);
      return `${x},${y}`;
    }).join(' ');
  };
  
  // Connect the last actual point to the first predicted point
  const generateConnectionLine = () => {
    if (actualData.length === 0 || predictedData.length === 0) return '';
    
    const lastActualIndex = chartData.findIndex((d: any) => d.date === actualData[actualData.length - 1].date);
    const firstPredictedIndex = chartData.findIndex((d: any) => d.date === predictedData[0].date);
    
    const x1 = paddingX + (lastActualIndex / (chartData.length - 1)) * contentWidth;
    const normalizedValue1 = (actualData[actualData.length - 1].value - minValue) / (maxValue - minValue);
    const y1 = chartHeight - paddingY - (normalizedValue1 * contentHeight);
    
    const x2 = paddingX + (firstPredictedIndex / (chartData.length - 1)) * contentWidth;
    const normalizedValue2 = (predictedData[0].value - minValue) / (maxValue - minValue);
    const y2 = chartHeight - paddingY - (normalizedValue2 * contentHeight);
    
    return `${x1},${y1} ${x2},${y2}`;
  };

  const actualPoints = generateActualPoints();
  const predictedPoints = generatePredictedPoints();
  const connectionPoints = generateConnectionLine();

  return (
    <div className="h-full">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Évolution des métriques de santé</h2>
          <p className="text-sm text-gray-500">Historique des 6 derniers mois et prédictions futures</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-700">Métrique:</span>
          <select
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value)}
            className="border border-gray-300 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
          >
            {metrics.map(metric => (
              <option key={metric} value={metric}>{metric}</option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 h-[500px] flex flex-col">
        <div className="flex items-center space-x-6 mb-4 ml-12">
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
            <span className="text-sm text-gray-700">Valeurs historiques</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-purple-500 mr-2"></div>
            <span className="text-sm text-gray-700">Prédictions</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-0.5 bg-gray-400 mr-2"></div>
            <span className="text-sm text-gray-700">Connexion</span>
          </div>
        </div>
        
        <div className="flex-1 relative">
          {chartData.length > 0 ? (
            <svg width="100%" height="100%" viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="xMidYMid meet">
              {/* X-axis */}
              <line 
                x1={paddingX} 
                y1={chartHeight - paddingY} 
                x2={chartWidth - paddingX} 
                y2={chartHeight - paddingY} 
                stroke="#e5e7eb" 
                strokeWidth="1" 
              />
              
              {/* Y-axis */}
              <line 
                x1={paddingX} 
                y1={paddingY} 
                x2={paddingX} 
                y2={chartHeight - paddingY} 
                stroke="#e5e7eb" 
                strokeWidth="1" 
              />
              
              {/* Horizontal grid lines */}
              {Array.from({ length: 5 }).map((_, i) => {
                const y = paddingY + (i / 4) * contentHeight;
                const value = maxValue - (i / 4) * (maxValue - minValue);
                return (
                  <g key={i}>
                    <line 
                      x1={paddingX} 
                      y1={y} 
                      x2={chartWidth - paddingX} 
                      y2={y} 
                      stroke="#f3f4f6" 
                      strokeWidth="1" 
                    />
                    <text 
                      x={paddingX - 10} 
                      y={y + 4} 
                      textAnchor="end" 
                      fontSize="12" 
                      fill="#6b7280"
                    >
                      {value.toFixed(1)}
                    </text>
                  </g>
                );
              })}
              
              {/* Vertical line separating historical and predicted data */}
              {actualData.length > 0 && predictedData.length > 0 && (
                <line 
                  x1={paddingX + ((actualData.length - 1) / (chartData.length - 1)) * contentWidth} 
                  y1={paddingY} 
                  x2={paddingX + ((actualData.length - 1) / (chartData.length - 1)) * contentWidth} 
                  y2={chartHeight - paddingY} 
                  stroke="#fbbf24" 
                  strokeWidth="2" 
                  strokeDasharray="3,3"
                />
              )}
              
              {/* X-axis labels */}
              {chartData.map((item: any, index: number) => {
                const x = paddingX + (index / (chartData.length - 1)) * contentWidth;
                return (
                  <text 
                    key={index} 
                    x={x} 
                    y={chartHeight - paddingY + 20} 
                    textAnchor="middle" 
                    fontSize="12" 
                    fill="#6b7280"
                  >
                    {formatDate(item.date)}
                  </text>
                );
              })}
              
              {/* Connection line between actual and predicted */}
              {connectionPoints && (
                <polyline 
                  points={connectionPoints} 
                  fill="none" 
                  stroke="#6b7280" 
                  strokeWidth="2" 
                  strokeDasharray="2,2"
                />
              )}
              
              {/* Actual values line */}
              {actualPoints && (
                <polyline 
                  points={actualPoints} 
                  fill="none" 
                  stroke="#3b82f6" 
                  strokeWidth="3" 
                />
              )}
              
              {/* Predicted values line */}
              {predictedPoints && (
                <polyline 
                  points={predictedPoints} 
                  fill="none" 
                  stroke="#8b5cf6" 
                  strokeWidth="3" 
                  strokeDasharray="6,4" 
                />
              )}
              
              {/* Data points - actual */}
              {actualData.map((item: any, index: number) => {
                const totalIndex = chartData.findIndex((d: any) => d.date === item.date);
                const x = paddingX + (totalIndex / (chartData.length - 1)) * contentWidth;
                const normalizedValue = (item.value - minValue) / (maxValue - minValue);
                const y = chartHeight - paddingY - (normalizedValue * contentHeight);
                return (
                  <g key={`actual-${index}`}>
                    <circle 
                      cx={x} 
                      cy={y} 
                      r="5" 
                      fill="#3b82f6" 
                      stroke="#ffffff"
                      strokeWidth="2"
                    />
                    {/* Tooltip on hover */}
                    <title>{`${item.value.toFixed(2)} ${selectedMetricUnit} - ${formatDate(item.date)}`}</title>
                  </g>
                );
              })}
              
              {/* Data points - predicted */}
              {predictedData.map((item: any, index: number) => {
                const totalIndex = chartData.findIndex((d: any) => d.date === item.date);
                const x = paddingX + (totalIndex / (chartData.length - 1)) * contentWidth;
                const normalizedValue = (item.value - minValue) / (maxValue - minValue);
                const y = chartHeight - paddingY - (normalizedValue * contentHeight);
                return (
                  <g key={`predicted-${index}`}>
                    <circle 
                      cx={x} 
                      cy={y} 
                      r="5" 
                      fill="#8b5cf6" 
                      stroke="#ffffff"
                      strokeWidth="2"
                    />
                    {/* Tooltip on hover */}
                    <title>{`${item.value.toFixed(2)} ${selectedMetricUnit} - ${formatDate(item.date)} (Prédiction)`}</title>
                  </g>
                );
              })}
              
              {/* Legend for current time indicator */}
              {actualData.length > 0 && predictedData.length > 0 && (
                <text 
                  x={paddingX + ((actualData.length - 1) / (chartData.length - 1)) * contentWidth + 5} 
                  y={paddingY - 5} 
                  fontSize="10" 
                  fill="#fbbf24"
                  fontWeight="bold"
                >
                  Maintenant
                </text>
              )}
            </svg>
          ) : (
            <div className="h-full flex items-center justify-center">
              <p className="text-gray-500">Aucune donnée disponible</p>
            </div>
          )}
        </div>
        
        {chartData.length > 0 && (
          <div className="text-center mt-4">
            <p className="text-sm text-gray-500">
              Unité: {selectedMetricUnit}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {actualData.length} points historiques • {predictedData.length} prédictions
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HealthMetricsChart;