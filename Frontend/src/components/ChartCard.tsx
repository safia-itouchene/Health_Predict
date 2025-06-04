import React, { ReactNode } from 'react';

interface ChartCardProps {
  title: string;
  description: string;
  children: ReactNode;
}

const ChartCard: React.FC<ChartCardProps> = ({ 
  title, 
  description, 
  children
}) => {
  return (
    <div className="bg-white rounded-lg overflow-hidden transition-all duration-300">
      <div className="p-4">
        <div>
          <h3 className="font-bold text-lg">{title}</h3>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
      </div>
      <div className="p-4">
        {children}
      </div>
    </div>
  );
};

export default ChartCard;