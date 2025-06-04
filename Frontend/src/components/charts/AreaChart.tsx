import React from 'react';
import Plot from 'react-plotly.js';
import { customerGrowthData } from '../../utils/sampleData';

const AreaChart: React.FC = () => {
  return (
    <div className="w-full h-90">
      <Plot
        data={[
          {
            type: 'scatter',
            mode: 'lines',
            fill: 'tozeroy',
            x: customerGrowthData.x,
            y: customerGrowthData.y,
            line: {
              color: '#2563eb',
              width: 2,
            },
            fillcolor: '#2563eb8c',
          },
        ]}
        layout={{
          margin: { t: 10, r: 10, l: 50, b: 50 },
          paper_bgcolor: '#ffffff',
          plot_bgcolor: '#ffffff',
          font: {
            color: '#1f2937',
          },
          xaxis: {
            gridcolor: '#e5e7eb',
            linecolor: '#e5e7eb',
          },
          yaxis: {
            gridcolor: '#e5e7eb',
            linecolor: '#e5e7eb',
          },
          autosize: true,
          height: 250,
        }}
        config={{
          responsive: true,
          displayModeBar: false,
        }}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
};

export default AreaChart;