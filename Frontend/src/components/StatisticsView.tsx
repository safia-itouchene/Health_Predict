import React, { useState, useEffect, useMemo } from 'react';
import AlgeriaMap from './AlgeriaMap';
import Filters from './Filters';
import BarChart from './charts/BarChart';
import SummaryCard from './SummaryCard';
import LineChart from './charts/LineChart';

// List of 58 wilaya names in order (corresponding to wilayaId 1 to 58)
const wilayaNames = [
  "Adrar", "Chlef", "Laghouat", "Oum El Bouaghi", "Batna", "Béjaïa", "Biskra", "Béchar", "Blida", "Bouira",
  "Tamanrasset", "Tébessa", "Tlemcen", "Tiaret", "Tizi Ouzou", "Alger", "Djelfa", "Jijel", "Sétif", "Saïda",
  "Skikda", "Sidi Bel Abbès", "Annaba", "Guelma", "Constantine", "Médéa", "Mostaganem", "M'Sila", "Mascara", "Ouargla",
  "Oran", "El Bayadh", "Illizi", "Bordj Bou Arréridj", "Boumerdès", "El Tarf", "Tindouf", "Tissemsilt", "El Oued", "Khenchela",
  "Souk Ahras", "Tipaza", "Mila", "Aïn Defla", "Naâma", "Aïn Témouchent", "Ghardaïa", "Relizane",
  "Timimoun", "Bordj Badji Mokhtar", "Ouled Djellal", "Béni Abbès", "In Salah", "In Guezzam", "Touggourt", "Djanet", "El M'Ghair", "El Meniaa"
];

interface StatsData {
  diseaseStats: any[];
  lifestyleStats: any[];
}

const StatisticsView: React.FC = () => {
  const [dateRange, setDateRange] = useState('2025');
  const [category, setCategory] = useState('Maladie_cardiovasculaire');
  const [selectedWilaya, setSelectedWilaya] = useState<string | null>(null);
  const [statsData, setStatsData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatistics = async (year: number) => {
    try {
      const response = await fetch('http://localhost:5000/predict_xgboost', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ year }),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const data = await response.json();
      if (!data.success) {
        throw new Error('Request failed');
      }
      return data.predictions;
    } catch (err) {
      throw err;
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const year = parseInt(dateRange);
        const data = await fetchStatistics(year);
        console.log(`Received data for year ${year}:`, data);
        setStatsData(data);
        setLoading(false);
      } catch (err) {
        setError('Failed to load statistics');
        setLoading(false);
        console.error('Error fetching statistics:', err);
      }
    };
    fetchData();
  }, [dateRange]);

  const chartData = useMemo(() => {
    if (!statsData || !category) return { x: [], y: [] };
    const diseaseData = statsData[category];
    if (!diseaseData) return { x: [], y: [] };

    const totals = Array(12).fill(0);
    for (const wilaya in diseaseData) {
      for (let month = 1; month <= 12; month++) {
        if (month == 2 || month == 12) {
          totals[month - 1] = totals[month - 2] + 1;
        }
        const monthKey = month.toString();
        const value = diseaseData[wilaya][monthKey] || 0;
        totals[month - 1] += value + 2;
      }
    }

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const x = monthNames.map(month => `${month} ${dateRange}`);
    return { x, y: totals };
  }, [statsData, category, dateRange]);

  const diseaseDisplayNames: { [key: string]: string } = {
    'Maladie_cardiovasculaire': 'Maladie cardiovasculaire',
    'Hypertension': 'Hypertension',
    'Diabète_type_2': 'Diabète de type 2',
    'Obésité': 'Obésité',
    'Asthme': 'Asthme',
    'Cancer_du_poumon': 'Cancer du poumon',
    'Cancer_du_sein': 'Cancer du sein',
    'Cancer_de_la_prostate': 'Cancer de la prostate',
  };

  const totalPatientsPerWilaya = useMemo(() => {
    if (!statsData || !category) return Array(58).fill(0);
    const diseaseData = statsData[category];
    if (!diseaseData) return Array(58).fill(0);

    return Array.from({ length: 58 }, (_, i) => {
      const wilayaId = i + 1;
      const wilayaData = diseaseData[wilayaId];
      if (!wilayaData) return 0;
      const total = Object.values(wilayaData).reduce((sum: number, val: any) => sum + val, 0);
      return Math.round(total);
    });
  }, [statsData, category]);

  // Compute the top 9 wilayas with the most patients
  const top9Wilayas = useMemo(() => {
    if (!totalPatientsPerWilaya.length) return [];
    const wilayaData = totalPatientsPerWilaya.map((total, index) => ({
      name: wilayaNames[index],
      total: total,
    }));
    return wilayaData
      .sort((a, b) => b.total - a.total)
      .slice(0, 9);
  }, [totalPatientsPerWilaya]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  return (
    <div className="min-h-screen p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <SummaryCard title="Number de Patients" value="12,756" change="patient" trend="up" color="blue" />
        <SummaryCard title="Number de Familles" value="2,000" change="famille" trend="down" color="red" />
        <SummaryCard title="Relations Familliales" value="17,096" change="relation" trend="up" color="purple" />
        <SummaryCard title="Series Temporalles" value="1,543,476" change="serie" trend="down" color="green" />
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm">
        <Filters
          dateRange={dateRange}
          category={category}
          onDateRangeChange={setDateRange}
          onCategoryChange={setCategory}
        />
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 bg-white rounded-xl overflow-hidden">
          <div className="border-b border-gray-200 p-4">
            <h2 className="text-lg font-bold text-gray-900">Performance Mensuelle</h2>
            <p className="text-sm text-gray-500">Cases by month for the selected disease</p>
          </div>
          <div className="p-4 mt-5">
            <LineChart x={chartData.x} y={chartData.y} year={dateRange} disease={category} />
          </div>
        </div>

        <div className="w-full lg:w-1/3 bg-white rounded-xl overflow-hidden">
          <div className="border-b border-gray-200 p-4">
            <h2 className="text-lg font-bold text-gray-900">Distribution Régionale</h2>
            <p className="text-sm text-gray-500">
              {selectedWilaya ? `Selected region: ${selectedWilaya}` : 'Cliquez sur une région pour sélectionner'}
            </p>
          </div>
          <div className="p-4 h-96 flex items-center justify-center">
            <AlgeriaMap
              width={350}
              height={350}
              showColorbar={false}
              patientData={totalPatientsPerWilaya}
              disease={diseaseDisplayNames[category]}
              onWilayaSelect={(wilayaName) => setSelectedWilaya(wilayaName)}
            />
          </div>
        </div>
      </div>

      <div>
        <div className="w-full bg-white rounded-xl overflow-hidden">
          <div className="border-b border-gray-200 p-4">
            <h2 className="text-lg font-bold text-gray-900">Top 9 des wilayas selon les patients 
            </h2>
           <p>{diseaseDisplayNames[category]}</p>
          </div>
          <div className="p-4 h-96">
            <BarChart data={top9Wilayas} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatisticsView;