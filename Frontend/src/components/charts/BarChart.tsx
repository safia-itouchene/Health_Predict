import React from 'react';
import Plot from 'react-plotly.js';
import { monthlyRevenueData } from '../../utils/sampleData';

interface BarChartProps {
}

const BarChart: React.FC<BarChartProps> = () => {
 
  return (
    <div className="h-64">
      <Plot
        data={[
          {
            type: 'bar',
            x: monthlyRevenueData.x,
            y: monthlyRevenueData.y,
            marker: {
              color: '#2563eb',
              opacity: 0.8,
            },
          },
        ]}
        layout={{
          margin: { t: 10, r: 10, l: 50, b: 50 },
          autosize: true,
          height: 300,
        }}
        config={{
          responsive: true,
          displayModeBar: false,
        }}
        style={{ width: '100%', height: '800px' }}
      />
    </div>
  );
};

export default BarChart;