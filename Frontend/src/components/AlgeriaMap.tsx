import { useState, useEffect } from 'react';
import Plot from 'react-plotly.js';

// Define TypeScript interfaces
interface WilayaData {
  id: number;
  name: string;
  population: number;
  surface: number;
  capital: string;
}

// Complete dataset of all 58 Algerian wilayas
const ALGERIA_WILAYAS: WilayaData[] = [
  { id: 1, name: 'Adrar', population: 489416, surface: 427368, capital: 'Adrar' },
  { id: 2, name: 'Chlef', population: 1292046, surface: 4975, capital: 'Chlef' },
  { id: 3, name: 'Laghouat', population: 557233, surface: 25057, capital: 'Laghouat' },
  { id: 4, name: 'Oum El Bouaghi', population: 678104, surface: 7638, capital: 'Oum El Bouaghi' },
  { id: 5, name: 'Batna', population: 1437202, surface: 12192, capital: 'Batna' },
  { id: 6, name: 'Béjaïa', population: 959988, surface: 3268, capital: 'Béjaïa' },
  { id: 7, name: 'Biskra', population: 875799, surface: 21671, capital: 'Biskra' },
  { id: 8, name: 'Béchar', population: 326267, surface: 161400, capital: 'Béchar' },
  { id: 9, name: 'Blida', population: 1149142, surface: 1575, capital: 'Blida' },
  { id: 10, name: 'Bouira', population: 802150, surface: 4439, capital: 'Bouira' },
  { id: 11, name: 'Tamanrasset', population: 231936, surface: 556185, capital: 'Tamanrasset' },
  { id: 12, name: 'Tébessa', population: 741894, surface: 14227, capital: 'Tébessa' },
  { id: 13, name: 'Tlemcen', population: 1066721, surface: 9061, capital: 'Tlemcen' },
  { id: 14, name: 'Tiaret', population: 976246, surface: 20673, capital: 'Tiaret' },
  { id: 15, name: 'Tizi Ouzou', population: 1164096, surface: 2958, capital: 'Tizi Ouzou' },
  { id: 16, name: 'Algiers', population: 3154792, surface: 1190, capital: 'Algiers' },
  { id: 17, name: 'Djelfa', population: 1489979, surface: 32052, capital: 'Djelfa' },
  { id: 18, name: 'Jijel', population: 668294, surface: 2577, capital: 'Jijel' },
  { id: 19, name: 'Sétif', population: 1677078, surface: 6549, capital: 'Sétif' },
  { id: 20, name: 'Saïda', population: 359036, surface: 5138, capital: 'Saïda' },
  { id: 21, name: 'Skikda', population: 993244, surface: 4118, capital: 'Skikda' },
  { id: 22, name: 'Sidi Bel Abbès', population: 620646, surface: 9150, capital: 'Sidi Bel Abbès' },
  { id: 23, name: 'Annaba', population: 678561, surface: 1439, capital: 'Annaba' },
  { id: 24, name: 'Guelma', population: 501644, surface: 4101, capital: 'Guelma' },
  { id: 25, name: 'Constantine', population: 968998, surface: 2297, capital: 'Constantine' },
  { id: 26, name: 'Médéa', population: 868917, surface: 8866, capital: 'Médéa' },
  { id: 27, name: 'Mostaganem', population: 836050, surface: 2269, capital: 'Mostaganem' },
  { id: 28, name: 'M\'Sila', population: 1182291, surface: 18718, capital: 'M\'Sila' },
  { id: 29, name: 'Mascara', population: 814963, surface: 5941, capital: 'Mascara' },
  { id: 30, name: 'Ouargla', population: 663921, surface: 211980, capital: 'Ouargla' },
  { id: 31, name: 'Oran', population: 1584607, surface: 2121, capital: 'Oran' },
  { id: 32, name: 'El Bayadh', population: 316622, surface: 78870, capital: 'El Bayadh' },
  { id: 33, name: 'Illizi', population: 65799, surface: 284618, capital: 'Illizi' },
  { id: 34, name: 'Bordj Bou Arréridj', population: 680240, surface: 3921, capital: 'Bordj Bou Arréridj' },
  { id: 35, name: 'Boumerdès', population: 873954, surface: 1456, capital: 'Boumerdès' },
  { id: 36, name: 'El Tarf', population: 421455, surface: 3339, capital: 'El Tarf' },
  { id: 37, name: 'Tindouf', population: 69967, surface: 159000, capital: 'Tindouf' },
  { id: 38, name: 'Tissemsilt', population: 335965, surface: 3152, capital: 'Tissemsilt' },
  { id: 39, name: 'El Oued', population: 829742, surface: 54573, capital: 'El Oued' },
  { id: 40, name: 'Khenchela', population: 441504, surface: 9811, capital: 'Khenchela' },
  { id: 41, name: 'Souk Ahras', population: 474059, surface: 4359, capital: 'Souk Ahras' },
  { id: 42, name: 'Tipaza', population: 617661, surface: 2166, capital: 'Tipaza' },
  { id: 43, name: 'Mila', population: 774465, surface: 3480, capital: 'Mila' },
  { id: 44, name: 'Aïn Defla', population: 804979, surface: 4891, capital: 'Aïn Defla' },
  { id: 45, name: 'Naâma', population: 245894, surface: 29950, capital: 'Naâma' },
  { id: 46, name: 'Aïn Témouchent', population: 399315, surface: 2376, capital: 'Aïn Témouchent' },
  { id: 47, name: 'Ghardaïa', population: 404996, surface: 86105, capital: 'Ghardaïa' },
  { id: 48, name: 'Relizane', population: 733060, surface: 4870, capital: 'Relizane' },
  { id: 49, name: 'El M\'Ghair', population: 207992, surface: 8835, capital: 'El M\'Ghair' },
  { id: 50, name: 'El Meniaa', population: 67799, surface: 68000, capital: 'El Meniaa' },
  { id: 51, name: 'Ouled Djellal', population: 190476, surface: 11410, capital: 'Ouled Djellal' },
  { id: 52, name: 'Bordj Baji Mokhtar', population: 37742, surface: 133000, capital: 'Bordj Baji Mokhtar' },
  { id: 53, name: 'Béni Abbès', population: 53620, surface: 101350, capital: 'Béni Abbès' },
  { id: 54, name: 'Timimoun', population: 143511, surface: 64700, capital: 'Timimoun' },
  { id: 55, name: 'Touggourt', population: 320988, surface: 23166, capital: 'Touggourt' },
  { id: 56, name: 'Djanet', population: 18878, surface: 82800, capital: 'Djanet' },
  { id: 57, name: 'In Salah', population: 55639, surface: 118971, capital: 'In Salah' },
  { id: 58, name: 'In Guezzam', population: 7045, surface: 86963, capital: 'In Guezzam' }
];

interface AlgeriaMapProps {
  width?: number;
  height?: number;
  showColorbar?: boolean;
}

const AlgeriaMap: React.FC<AlgeriaMapProps> = ({ 
  width = 500, 
  height = 400, 
  showColorbar = false 
}) => {
  // State variables
  const [wilayaData] = useState<WilayaData[]>(ALGERIA_WILAYAS);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedWilaya, setSelectedWilaya] = useState<WilayaData | null>(null);

  useEffect(() => {
    // No need to fetch data since we're using inline data
    setLoading(false);
  }, []);

  // Handle wilaya selection
  const handleWilayaSelection = (wilayaId: number) => {
    const selected = wilayaData.find(w => w.id === wilayaId) || null;
    setSelectedWilaya(selected);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading Algerian map data...</div>;
  }

  if (error) {
    return <div className="text-red-500 p-4">{error}</div>;
  }

  // Plotly map configuration - using scattergeo instead of choropleth to avoid GeoJSON requirement
  const mapConfig = {
    data: [{
      type: 'scattergeo',
      lon: [
        1.9, 1.3, 2.9, 7.1, 6.2, 4.8, 5.7, -2.2, 2.8, 3.9, 5.5, 8.1, -1.3, 1.8, 4.1, 
        3.0, 3.2, 5.8, 5.4, 0.1, 6.9, -0.6, 7.8, 7.4, 6.6, 2.8, 0.1, 4.5, 0.1, 5.3, 
        -0.6, 1.0, 8.5, 4.8, 3.5, 8.3, -8.1, 1.8, 6.8, 7.1, 7.9, 2.4, 6.3, 2.0, -0.9, 
        -0.9, 3.7, 0.6, 6.0, 2.9, 5.9, -0.3, -2.5, 0.3, 6.1, 9.5, 2.5, 7.8
      ],
      lat: [
        27.9, 36.2, 33.8, 35.9, 35.6, 36.8, 34.9, 31.6, 36.5, 36.4, 22.8, 35.4, 34.9, 35.4, 
        36.7, 36.7, 34.7, 36.8, 36.2, 34.8, 36.9, 35.2, 36.9, 36.5, 36.4, 36.3, 35.9, 35.7, 
        35.4, 31.9, 35.7, 33.7, 26.5, 36.1, 36.8, 36.7, 27.7, 35.6, 33.4, 35.4, 36.3, 36.6, 
        36.4, 36.3, 32.9, 33.3, 32.1, 36.6, 33.1, 30.6, 30.1, 34.7, 29.7, 27.9, 33.1, 24.6, 
        27.2, 19.1
      ],
      marker: {
        size: wilayaData.map(w => Math.sqrt(w.population) / 200), // Size based on population (reduced)
        color: wilayaData.map(w => w.population), // Color based on population
        colorscale: [
          [0, 'rgba(37, 99, 235, 0.3)'],   // #2563eb with low opacity for low values
          [0.5, 'rgba(37, 99, 235, 0.7)'], // #2563eb with medium opacity for mid values
          [1, 'rgba(37, 99, 235, 1)']      // #2563eb with full opacity for high values
        ],
        colorbar: showColorbar ? {
          title: 'Population',
          titlefont: { color: '#2563eb', size: 12, family: 'Arial, sans-serif' },
          tickfont: { color: '#4B5563', size: 10 },
          thickness: 12,
          outlinewidth: 0,
          bgcolor: 'rgba(255, 255, 255, 0.8)'
        } : undefined,
        line: {
          width: 1,
          color: 'white'
        },
        opacity: 0.9,
        symbol: 'circle'
      },
      text: wilayaData.map(w => `
        <b style="font-size: 12px">${w.name}</b><br>
        <span style="color: #4B5563">Population:</span> <b>${w.population.toLocaleString()}</b><br>
        <span style="color: #4B5563">Surface:</span> <b>${w.surface.toLocaleString()} km²</b>
      `),
      hoverinfo: 'text',
      hoverlabel: {
        bgcolor: 'white',
        bordercolor: '#2563eb',
        font: { family: 'Arial, sans-serif', size: 11 }
      },
      mode: 'markers',
      ids: wilayaData.map(w => String(w.id))
    }],
    layout: {
      title: undefined, // Removed title
      paper_bgcolor: 'rgba(0,0,0,0)',
      geo: {
        scope: 'africa',
        resolution: 50,
        lonaxis: {
          range: [-10, 12] // Approximate longitude range of Algeria
        },
        lataxis: {
          range: [18, 38] // Approximate latitude range of Algeria
        },
        showland: true,
        landcolor: 'rgb(240, 240, 240)',
        showocean: true,
        oceancolor: 'rgb(230, 242, 255)',
        showcountries: true,
        countrycolor: '#BACDDB',
        showframe: false,
        framecolor: '#2563eb',
        showcoastlines: true,
        coastlinecolor: '#BACDDB',
        showlakes: true,
        lakecolor: 'rgb(230, 242, 255)',
        projection: {
          type: 'mercator'
        }
      },
      width: width,
      height: height,
      autosize: true,
      margin: {
        l: 0,
        r: 0,
        b: 0,
        t: 10,
        pad: 2
      },
    }
  };

  return (
    <div className="flex flex-col items-center">
      {/* Plotly Map Component */}
      <div className="w-full">
        <Plot
          data={mapConfig.data as any}
          layout={mapConfig.layout as any}
          config={{ 
            responsive: true,
            displayModeBar: false,
            displaylogo: false
          }}
          onClick={(event) => {
            // Get the clicked point data
            if (event.points && event.points[0]) {
              const pointData = event.points[0];
              // Use type assertion to access the id property
              const wilayaId = Number((pointData as any).id);
              handleWilayaSelection(wilayaId);
            }
          }}
        />
      </div>
      
      
    </div>
  );
};

export default AlgeriaMap;