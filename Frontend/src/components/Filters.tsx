import React from 'react';
import { Filter } from 'lucide-react';

interface FiltersProps {
  dateRange: string;
  category: string;
  onDateRangeChange: (range: string) => void;
  onCategoryChange: (category: string) => void;
}

const Filters: React.FC<FiltersProps> = ({
  dateRange,
  category,
  onDateRangeChange,
  onCategoryChange
}) => {
  return (
    <div className="rounded-lg bg-white">
      <div className="flex items-center gap-6 flex-wrap">
        <div className="flex gap-4 flex-wrap">
          <select
            value={dateRange}
            onChange={(e) => onDateRangeChange(e.target.value)}
            className="px-3 py-2 rounded-md border border-gray-300 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="2025">2025</option>
          </select>

          <select
            value={category}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="px-3 py-2 rounded-md border border-gray-300 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="Maladie_cardiovasculaire">Maladie cardiovasculaire</option>
            <option value="Hypertension">Hypertension</option>
            <option value="Diabète_type_2">Diabète de type 2</option>
            <option value="Obésité">Obésité</option>
            <option value="Asthme">Asthme</option>
            <option value="Cancer_du_poumon">Cancer du poumon</option>
            <option value="Cancer_du_sein">Cancer du sein</option>
            <option value="Cancer_de_la_prostate">Cancer de la prostate</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default Filters;