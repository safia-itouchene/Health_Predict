import React from 'react';
import Plot from 'react-plotly.js';

interface LineChartProps {
  x: string[];
  y: number[];
  year: string;
  disease: string;
}

const LineChart: React.FC<LineChartProps> = ({ x, y, year, disease }) => {
  return (
    <div className="w-full">
      <Plot
        data={[
          {
            type: 'scatter',
            mode: 'lines+markers',
            x: x,
            y: y,
            line: { color: '#2563eb', width: 3 },
            marker: { color: '#2563eb', size: 6 },
            name: disease,
          },
        ]}
        layout={{
          title: `Predictions for ${disease} in ${year}`,
          margin: { t: 50, r: 10, l: 50, b: 50 },
          xaxis: {
            title: 'Month',
            tickangle: -45,
            nticks: 12,
          },
          yaxis: {
            title: 'Number of Cases',
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