import React from 'react';
import Plot from 'react-plotly.js';

interface BarChartProps {
  data: { name: string; total: number }[];
}

const BarChart: React.FC<BarChartProps> = ({ data }) => {
  const x = data.map(item => item.name);
  const y = data.map(item => item.total);

  return (
    <div className="h-64">
      <Plot
        data={[
          {
            type: 'bar',
            x: x,
            y: y,
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
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
};

export default BarChart;