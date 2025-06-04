import React from 'react';
import Plot from 'react-plotly.js';
import { userGrowthData } from '../../utils/sampleData';

interface LineChartProps {
}

const LineChart: React.FC<LineChartProps> = () => {
 

  return (
    <div className="w-full">
      <Plot
        data={[
          {
            type: 'scatter',
            mode: 'lines+markers',
            x: userGrowthData.x,
            y: userGrowthData.y,
            line: {
              color: '#2563eb',
              width: 3,
            },
            marker: {
              color: '#2563eb',
              size: 6,
            },
          },
        ]}
        layout={{
          margin: { t: 10, r: 10, l: 50, b: 50 },
        
          xaxis: {
            tickangle: -45,
            nticks: 6,
          },
          autosize: true,
          height: 330,
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

export default LineChart;