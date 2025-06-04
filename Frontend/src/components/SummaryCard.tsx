import React from 'react';

// Define the props interface
export interface SummaryCardProps {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
  color: 'blue' | 'green' | 'red' | 'purple';
}

const SummaryCard: React.FC<SummaryCardProps> = ({ title, value, change, trend, color }) => {
  const getColorClasses = () => {
    switch (color) {
      case 'blue':
        return 'from-blue-500 to-blue-600';
      case 'green':
        return 'from-green-500 to-green-600';
      case 'red':
        return 'from-[#FF6363] to-[#FF4F4F]';
      case 'purple':
        return 'from-purple-500 to-purple-600';
      default:
        return 'from-blue-500 to-blue-600';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className={`bg-gradient-to-r ${getColorClasses()} h-2`}></div>
      <div className="p-5">
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
        <div className="flex items-baseline mt-1">
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className={`ml-2 text-sm font-medium ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}> 
            {change}
          </p>
        </div>
      </div>
    </div>
  );
};

export default SummaryCard;
