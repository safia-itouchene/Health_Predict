import React, { useState } from 'react';
import AlgeriaMap from './AlgeriaMap';
import Filters from './Filters';
import BarChart from './charts/BarChart';
import SummaryCard from './SummaryCard'
import LineChartProps from './charts/LineChart'

const StatisticsView: React.FC = () => {
  const [dateRange, setDateRange] = useState('30d');
  const [category, setCategory] = useState('all');
  const [selectedWilaya, setSelectedWilaya] = useState<string | null>(null);

  return (
    <div className="min-h-screen p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <SummaryCard 
            title="Total Users" 
            value="24,582" 
            change="+12.3%" 
            trend="up" 
            color="blue"
          />
          <SummaryCard 
            title="Avg. Session" 
            value="4m 38s" 
            change="-3.1%" 
            trend="down" 
            color="red"
          />
          <SummaryCard 
            title="Bounce Rate" 
            value="28.4%" 
            change="-2.5%" 
            trend="up" 
            color="purple"
          />
          <SummaryCard 
            title="Conversion" 
            value="3.42%" 
            change="+4.3%" 
            trend="up" 
            color="green"
          />
        </div>
      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <Filters
          dateRange={dateRange}
          category={category}
          onDateRangeChange={setDateRange}
          onCategoryChange={setCategory}
        />
      </div>

      {/* Side-by-Side Charts */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* AreaChart (2/3 width) */}
        <div className="flex-1 bg-white rounded-xl overflow-hidden">
          <div className="border-b border-gray-200 p-4">
            <h2 className="text-lg font-bold text-gray-900">Monthly Performance</h2>
            <p className="text-sm text-gray-500">Revenue by month for the current year</p>
          </div>
          <div className="p-4 mt-5">
            <LineChartProps/>
          </div>
        </div>

        {/* AlgeriaMap (1/3 width) */}
        <div className="w-full lg:w-1/3 bg-white rounded-xl overflow-hidden">
          <div className="border-b border-gray-200 p-4">
            <h2 className="text-lg font-bold text-gray-900">Regional Distribution</h2>
            <p className="text-sm text-gray-500">
              {selectedWilaya
                ? `Selected region: ${selectedWilaya}`
                : 'Click on a region to select'}
            </p>
          </div>
          <div className="p-4 h-96 flex items-center justify-center">
            <AlgeriaMap
              width={350}
              height={350}
              showColorbar={false}
            />
          </div>
        </div>
      </div>
      <div>
      <div>
        <div className="w-full bg-white rounded-xl overflow-hidden">
          <div className="border-b border-gray-200 p-4">
            <h2 className="text-lg font-bold text-gray-900">Regional Distribution</h2>
            <p className="text-sm text-gray-500">
              {selectedWilaya
                ? `Selected region: ${selectedWilaya}`
                : 'Click on a region to select'}
            </p>
          </div>
          <div className="p-4 h-96">
            <BarChart />
          </div>
        </div>
         </div>
      </div>
    </div>
  );
};

export default StatisticsView;
