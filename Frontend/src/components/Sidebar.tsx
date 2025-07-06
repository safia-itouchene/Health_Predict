import React, { useState, useEffect } from 'react';
import { Search, Activity, Users, PieChart, Clock } from 'lucide-react';
import Papa from 'papaparse';

// Define the Patient interface
interface Patient {
  NIN: string;
  Nom: string;
  Prénom: string;
  [key: string]: any; // Allow additional properties
}

interface SidebarProps {
  selectedPatient: string | null;
  onSelectPatient: (nin: string) => void;
  defaultActiveSection?: 'patients' | 'statistics';
}

const Sidebar: React.FC<SidebarProps> = ({ 
  selectedPatient, 
  onSelectPatient,
  defaultActiveSection = 'statistics'
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSection, setActiveSection] = useState<'patients' | 'statistics'>(defaultActiveSection);
  const [csvPatients, setCsvPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentPatients, setRecentPatients] = useState<string[]>([]);
  const [lastSelectedPatient, setLastSelectedPatient] = useState<string | null>(null);

  // Load CSV data on component mount
  useEffect(() => {
    const loadCSVData = () => {
      setLoading(true);
      setError(null);
      
      Papa.parse('/data/patients.csv', {
        download: true,
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
        delimitersToGuess: [',', '\t', '|', ';'],
        complete: (result) => {
          console.log('CSV parse result:', result);
          
          if (result.errors.length > 0) {
            console.error('CSV parsing errors:', result.errors);
            setError(`Error parsing CSV file: ${result.errors[0].message}`);
          } else {
            console.log('Raw CSV data:', result.data);
            
            const parsedPatients = result.data
              .map((row: any, index: number) => {
                console.log(`Processing row ${index}:`, row);
                
                const nin = row.NIN || row.nin || row.ID || row.id || '';
                const nom = row.LastName || row.Nom || row.nom || row.lastName || row.last_name || '';
                const prenom = row.FirstName || row.Prénom || row.prénom || row.firstName || row.first_name || '';
                
                if (!nin || !nom) {
                  console.warn(`Row ${index} missing required fields:`, { nin, nom, prenom });
                  return null;
                }
                
                return {
                  NIN: String(nin).trim(),
                  Nom: String(nom).trim(),
                  Prénom: String(prenom).trim(),
                  ...row
                };
              })
              .filter(patient => patient !== null) as Patient[];
            
            console.log('Parsed patients:', parsedPatients);
            setCsvPatients(prevPatients => [...parsedPatients]);
          }
          setLoading(false);
        },
        error: (error) => {
          console.error('Error loading CSV:', error);
          setError(`Failed to load CSV file: ${error.message}`);
          setLoading(false);
        }
      });
    };

    loadCSVData();
  }, []);

  // Track when selectedPatient changes to update lastSelectedPatient
  useEffect(() => {
    if (selectedPatient && selectedPatient !== 'statistics') {
      setLastSelectedPatient(selectedPatient);
    }
  }, [selectedPatient]);

  // Combine patients from props and CSV data
  const allPatients = [...csvPatients];

  // Handle patient selection and update recent patients
  const handlePatientSelect = (nin: string) => {
    console.log('Selected NIN:', nin, 'Type:', typeof nin);
    onSelectPatient(nin); // Trigger parent callback with NIN
    setLastSelectedPatient(nin);
    
    setRecentPatients(prev => {
      const filtered = prev.filter(id => id !== nin);
      return [nin, ...filtered].slice(0, 5);
    });
  };

  // Handle section switching
  const handleSectionSwitch = (section: 'patients' | 'statistics') => {
    setActiveSection(section);
    
    if (section === 'statistics') {
      onSelectPatient('statistics');
    } else if (section === 'patients') {
      if (lastSelectedPatient && allPatients.some(p => p.NIN === lastSelectedPatient)) {
        onSelectPatient(lastSelectedPatient);
      } else {
        onSelectPatient('');
      }
      setSearchTerm('');
    }
  };

  // Filter patients based on search term
  const filteredPatients = searchTerm.trim().length === 0 
    ? []
    : allPatients.filter(patient =>
        patient.Nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.Prénom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.NIN?.includes(searchTerm)
      );

  // Get recent patients data
  const recentPatientsData = searchTerm.trim().length === 0
    ? recentPatients
        .map(nin => allPatients.find(p => p.NIN === nin))
        .filter(patient => patient !== undefined)
        .slice(0, 3) as Patient[]
    : [];

  const isSearching = searchTerm.trim().length > 0;
  const shouldShowNoResults = isSearching && filteredPatients.length === 0;

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <Activity className="h-6 w-6 text-blue-600" />
          <h1 className="text-lg font-bold text-gray-800">HealthPredict</h1>
        </div>
      </div>
      
      <div className="p-4 border-b border-gray-200">
        <div className="space-y-3">
          <button
            onClick={() => handleSectionSwitch('statistics')}
            className={`flex-1 flex items-center justify-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeSection === 'statistics'
                ? 'bg-gray-100 text-blue-600 hover:bg-gray-200'
                : 'text-gray-700 hover:bg-gray-200'
            }`}
          >
            <PieChart className="h-4 w-4 mr-2" />
            Statistique générale
          </button>
          <button
            onClick={() => handleSectionSwitch('patients')}
            className={`flex-1 flex items-center justify-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeSection === 'patients'
                ? 'bg-gray-100 text-blue-600 hover:bg-gray-200'
                : 'text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Users className="h-4 w-4 mr-2" />
            Profils de santé 
          </button>
        </div>
      </div>
      
      {activeSection === 'patients' && (
        <div className="flex-1 flex flex-col transition-all duration-300 ease-in-out">
          {(loading || error || csvPatients.length > 0) && (
            <div className="p-2 text-xs">
              {loading && <div className="text-blue-600">Loading CSV...</div>}
              {error && <div className="text-red-600">Error: {error}</div>}
              {csvPatients.length > 0 && (
                <div className="text-green-600">
                  Loaded {csvPatients.length} patients
                </div>
              )}
            </div>
          )}
          
          <div className="p-4 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Rechercher par nom, prénom ou ID..."
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {searchTerm.trim().length > 0 && (
              <div className="flex items-center justify-between mt-2">
                <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                  🔍 Recherche active
                </div>
                <button
                  onClick={() => setSearchTerm('')}
                  className="text-xs text-gray-500 hover:text-gray-700 underline"
                >
                  Effacer
                </button>
              </div>
            )}
          </div>
          
          {!searchTerm.trim() && recentPatientsData.length > 0 && (
            <div className="px-4 pb-3">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-3 border border-green-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 text-green-600 mr-2" />
                    <h3 className="text-xs font-medium text-green-700">Consultés récemment</h3>
                  </div>
                  <div className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                    {recentPatientsData.length}
                  </div>
                </div>
                <div className="space-y-1">
                  {recentPatientsData.map((patient) => (
                    <button
                      key={patient.NIN}
                      className={`w-full text-left px-3 py-2 rounded-md text-xs transition ${
                        selectedPatient === patient.NIN
                          ? 'bg-green-200 text-green-800 border border-green-300'
                          : 'hover:bg-green-100 text-green-700 border border-transparent'
                      }`}
                      onClick={() => handlePatientSelect(patient.NIN)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{patient.Nom} {patient.Prénom}</div>
                          <div className="text-green-500">ID: {patient.NIN.substring(0, 8)}...</div>
                        </div>
                        <div className="text-green-400">
                          ⭐
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {!searchTerm.trim() && recentPatientsData.length === 0 && (
            <div className="flex-1 flex items-center justify-center px-4">
              <div className="text-center text-gray-500 py-8">
                <div className="bg-blue-50 rounded-full p-6 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                  <Search className="h-10 w-10 text-blue-400" />
                </div>
                <p className="text-sm font-medium mb-2 text-gray-700">Rechercher un patient</p>
                <p className="text-xs text-gray-500 mb-4 max-w-48 mx-auto leading-relaxed">
                  Utilisez la barre de recherche ci-dessus pour trouver un patient par nom, prénom ou identifiant.
                </p>
                <div className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2 inline-block">
                  📋 {allPatients.length} patients disponibles
                </div>
              </div>
            </div>
          )}
          
          {isSearching && (
            <div className="flex-1 overflow-y-auto px-4">
              <div className="pb-2">
                <h3 className="text-sm font-medium text-gray-700 flex items-center">
                  <Search className="h-4 w-4 mr-2 text-blue-600" />
                  Résultats de recherche
                </h3>
              </div>
              
              {shouldShowNoResults && (
                <div className="text-center text-gray-500 py-8">
                  <div className="bg-gray-50 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <Search className="h-8 w-8 text-gray-300" />
                  </div>
                  <p className="text-sm font-medium mb-2">Aucun patient trouvé</p>
                  <p className="text-xs text-gray-400 mb-4">
                    Aucun résultat pour "<strong>{searchTerm}</strong>"
                  </p>
                  <button
                    onClick={() => setSearchTerm('')}
                    className="text-xs text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-lg transition"
                  >
                    ← Effacer la recherche
                  </button>
                </div>
              )}
              
              {filteredPatients.length > 0 && (
                <div>
                  <ul className="space-y-2">
                    {filteredPatients.map((patient) => (
                      <li key={patient.NIN}>
                        <button
                          className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 border group ${
                            selectedPatient === patient.NIN
                              ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-sm'
                              : 'hover:bg-gray-50 text-gray-700 border-transparent hover:border-gray-200 hover:shadow-sm'
                          }`}
                          onClick={() => handlePatientSelect(patient.NIN)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="font-medium text-sm">{patient.Nom} {patient.Prénom}</div>
                              <div className="text-xs text-gray-500 mt-1 flex items-center">
                                <span className="mr-3">NIN: {patient.NIN.substring(0, 8)}...</span>
                              </div>
                            </div>
                            <div className={`transition-transform duration-200 ${
                              selectedPatient === patient.NIN ? 'rotate-0' : 'group-hover:translate-x-1'
                            }`}>
                              {selectedPatient === patient.NIN ? '✓' : '→'}
                            </div>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                  
                  <div className="text-center mt-6 pt-4 border-t border-gray-100">
                    <div className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 inline-block">
                      📋 {filteredPatients.length} patient{filteredPatients.length > 1 ? 's' : ''} trouvé{filteredPatients.length > 1 ? 's' : ''}
                      <span className="ml-2 text-blue-600">
                        sur {allPatients.length} total
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      {activeSection === 'statistics' && (
        <div className="flex-1 overflow-y-auto p-3 transition-all duration-300 ease-in-out">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-gray-800 pl-1">
              Statistiques Algérie
            </h2>
            <div className="bg-blue-50 px-2 py-0.5 rounded-full">
              <span className="text-xs text-blue-700 font-medium">2025</span>
            </div>
          </div>
          
          <div className="relative mb-4 bg-gradient-to-r from-[#588cf4] to-[#2563eb] p-3 rounded-xl text-white shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs opacity-80 font-light">Population totale</p>
                <p className="text-xl font-semibold">{allPatients.length} Patient</p>
                <p className="text-xs mt-1 opacity-90">  </p>
              </div>
              <div className="bg-white/20 rounded-full p-2">
                <Users className="h-5 w-5 text-white" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100">
            <h3 className="text-xs font-medium text-gray-700 mb-3">Densité de population par région</h3>
            <div className="space-y-2">
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-blue-800 mr-2"></div>
                <span className="text-xs text-gray-600">Alger</span>
                <div className="ml-auto text-xs font-medium text-gray-700">3,415,000</div>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-blue-700 mr-2"></div>
                <span className="text-xs text-gray-600">Oran</span>
                <div className="ml-auto text-xs font-medium text-gray-700">1,584,000</div>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-blue-600 mr-2"></div>
                <span className="text-xs text-gray-600">Constantine</span>
                <div className="ml-auto text-xs font-medium text-gray-700">938,000</div>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                <span className="text-xs text-gray-600">Annaba</span>
                <div className="ml-auto text-xs font-medium text-gray-700">640,000</div>
              </div>
             
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-blue-200 mr-2"></div>
                <span className="text-xs text-gray-600">Autres régions</span>
                <div className="ml-auto text-xs font-medium text-gray-700">38,823,000</div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="p-4 border-t border-gray-200">
        <div className="text-xs text-gray-500 text-center">
          HealthPredict v1.0
        </div>
      </div>
    </div>
  );
};

export default Sidebar;