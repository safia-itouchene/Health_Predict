# model_utils.py
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
import torch.nn.functional as F
from sklearn.preprocessing import LabelEncoder, StandardScaler
import networkx as nx
from torch_geometric.nn import GCNConv, GATConv
import logging
import os
import warnings
from datetime import datetime

warnings.filterwarnings('ignore')

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("model_training.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Device
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
logger.info(f"Using device: {device}")
# Device setup
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

class Config:
    def __init__(self, config_file=None):
        self.seq_length = 12
        self.pred_length = 6
        self.hidden_dim = 128
        self.batch_size = 64
        self.epochs = 1
        self.learning_rate = 1e-3
        self.patience = 15
        self.cutoff_date = '2024-01-01'
        self.health_loss_weight = 0.3
        self.disease_loss_weight = 0.7
        self.feature_cols = [
            'Sex_encoded', 'BloodGroup_encoded', 'Wilaya', 'age_norm',
            'Tension_artérielle_systolique', 'Tension_artérielle_diastolique',
            'Glycémie_à_jeun', 'Cholestérol_total', 'IMC', 'LDL',
            'Triglycérides', 'Fréquence_cardiaque_au_repos',
            'Hypertension', 'Diabète_type_2', 'Obésité', 'Asthme',
            'Cancer_du_poumon', 'Cancer_du_sein', 'Cancer_de_la_prostate',
            'Maladie_cardiovasculaire', 'Dépression',
            'Statut_tabagique_encoded', 'Consommation_alcool_encoded',
            'Activité_physique_encoded', 'Qualité_alimentation_encoded',
            'Qualité_sommeil_encoded', 'Niveau_stress_encoded',
            'Années_de_tabagisme_encoded', 'Heures_activité_hebdo_encoded',
            'Heures_sommeil_encoded', 'Cigarettes_par_jour_encoded'
        ]
        self.target_health_cols = [
            'Tension_artérielle_systolique', 'Tension_artérielle_diastolique',
            'Glycémie_à_jeun', 'Cholestérol_total', 'IMC', 'LDL',
            'Triglycérides', 'Fréquence_cardiaque_au_repos'
        ]
        self.target_disease_cols = [
            'Hypertension', 'Diabète_type_2', 'Obésité', 'Asthme',
            'Cancer_du_poumon', 'Cancer_du_sein', 'Cancer_de_la_prostate',
            'Maladie_cardiovasculaire', 'Dépression'
        ]
        if config_file and os.path.exists(config_file):
            with open(config_file) as f:
                data = yaml.safe_load(f)
                for k, v in data.items():
                    setattr(self, k, v)

class DataProcessor:
    # (Copy the entire DataProcessor class from model_backend__.py)
    def __init__(self, config):
        self.config = config
        self.encoders = {}
        self.scalers = {}

        # Initialize encoders
        encoder_names = [
            'sex', 'blood', 'wilaya', 'smoking', 'alcohol', 'activity',
            'diet', 'sleep', 'stress', 'years_smoking', 'hours_activity',
            'hours_sleep', 'cigarettes'
        ]

        for name in encoder_names:
            self.encoders[name] = LabelEncoder()

        # Initialize scalers
        self.health_scaler = StandardScaler()
        self.age_scaler = StandardScaler()
        self.feature_scaler = StandardScaler()

    def load_data(self, data_dir):
        """Load data from CSV files"""
        logger.info("Loading data...")

        try:
            patients = pd.read_csv(f"{data_dir}/patients.csv" ,dtype={'NIN': str})
            temporal = pd.read_csv(f"{data_dir}/temporal_data.csv" ,dtype={'NIN': str})
            parents = pd.read_csv(f"{data_dir}/parent_relations.csv")

            # Convert date columns to datetime
            patients['BirthDate'] = pd.to_datetime(patients['BirthDate'])
            temporal['Monthly_Date'] = pd.to_datetime(temporal['Monthly_Date'])

            logger.info(f"Loaded {len(patients)} patients, {len(temporal)} temporal records, {len(parents)} parent relations")
            return patients, temporal, parents

        except Exception as e:
            logger.error(f"Error loading data: {e}")
            raise

    def preprocess_data(self, patients, temporal, parents):
        """Preprocess the data for model input"""
        logger.info("Preprocessing data...")

        try:
            # Calculate age
            current_date = datetime(2025, 5, 11)
            patients['age'] = (current_date - patients['BirthDate']).dt.days / 365.25

            # Handle missing values in patients data
            patients = patients.fillna(method='ffill').fillna(method='bfill')

            # Encode categorical variables for patients
            patients['Sex_encoded'] = self.encoders['sex'].fit_transform(patients['Sex'].fillna('Unknown'))
            patients['BloodGroup_encoded'] = self.encoders['blood'].fit_transform(patients['BloodGroup'].fillna('Unknown'))
            patients['Wilaya'] = self.encoders['wilaya'].fit_transform(patients['Wilaya'].fillna('Unknown'))

            # Normalize age
            patients['age_norm'] = self.age_scaler.fit_transform(patients[['age']]).flatten()

            # Handle missing values in temporal data
            temporal = temporal.sort_values(['NIN', 'Monthly_Date'])
            temporal = temporal.groupby('NIN').apply(lambda x: x.fillna(method='ffill').fillna(method='bfill')).reset_index(drop=True)

            # Encode categorical variables for temporal data
            categorical_mappings = {
                'Statut_tabagique_encoded': 'smoking',
                'Consommation_alcool_encoded': 'alcohol',
                'Activité_physique_encoded': 'activity',
                'Qualité_alimentation_encoded': 'diet',
                'Qualité_sommeil_encoded': 'sleep',
                'Niveau_stress_encoded': 'stress',
                'Années_de_tabagisme_encoded': 'years_smoking',
                'Heures_activité_hebdo_encoded': 'hours_activity',
                'Heures_sommeil_encoded': 'hours_sleep',
                'Cigarettes_par_jour_encoded': 'cigarettes'
            }

            for col, encoder_key in categorical_mappings.items():
                original_col = col.replace('_encoded', '')
                if original_col in temporal.columns:
                    temporal[col] = self.encoders[encoder_key].fit_transform(
                        temporal[original_col].fillna('Unknown').astype(str)
                    )
                else:
                    temporal[col] = 0  # Default value if column doesn't exist

            # Normalize health metrics
            health_cols = [col for col in self.config.target_health_cols if col in temporal.columns]
            if health_cols:
                temporal[health_cols] = self.health_scaler.fit_transform(temporal[health_cols])

            logger.info("Data preprocessing completed")
            return patients, temporal, parents

        except Exception as e:
            logger.error(f"Error preprocessing data: {e}")
            raise

#_____________________________________________________
    def create_patient_graph(self, patients, temporal, parents):
            """Enhanced version with better edge handling"""
            logger.info("Creating enhanced patient graph...")
            
            try:
                G = nx.DiGraph()
                
                # Convert to string and clean NIDs
                parents['ParentNIN'] = parents['ParentNIN'].astype(str).str.strip()
                parents['ChildNIN'] = parents['ChildNIN'].astype(str).str.strip()
                
                # Remove rows with missing values
                parents = parents.dropna(subset=['ParentNIN', 'ChildNIN'])
                
                # Get unique patients from both datasets
                all_nins = set(patients['NIN'].unique()) | set(temporal['NIN'].unique())
                
                # Create NID mapping for fuzzy matching (optional)
                nin_variations = {}
                for nin in all_nins:
                    # Handle potential formatting variations
                    variations = [
                        nin,
                        nin.zfill(10),  # Pad with zeros
                        nin.lstrip('0'), # Remove leading zeros
                    ]
                    for var in variations:
                        nin_variations[var] = nin
                
                # Add nodes with features
                node_features = []
                nin_to_idx = {}
                
                for idx, nin in enumerate(sorted(all_nins)):
                    nin_to_idx[nin] = idx
                    
                    # Get patient data
                    patient_data = patients[patients['NIN'] == nin]
                    if not patient_data.empty:
                        patient_data = patient_data.iloc[0]
                        features = [
                            patient_data.get('Sex_encoded', 0),
                            patient_data.get('BloodGroup_encoded', 0),
                            patient_data.get('Wilaya', 0),
                            patient_data.get('age_norm', 0)
                        ]
                    else:
                        features = [0, 0, 0, 0]
                    
                    G.add_node(nin, features=features)
                    node_features.append(features)
                
                # Add edges with enhanced matching
                edges_added = 0
                failed_relations = []
                
                for _, row in parents.iterrows():
                    parent_nin = str(row['ParentNIN'])
                    child_nin = str(row['ChildNIN'])
                    
                    # Try direct match first
                    parent_found = parent_nin in nin_to_idx
                    child_found = child_nin in nin_to_idx
                    
                    # Try fuzzy match if direct match fails
                    if not parent_found and parent_nin in nin_variations:
                        parent_nin = nin_variations[parent_nin]
                        parent_found = True
                        
                    if not child_found and child_nin in nin_variations:
                        child_nin = nin_variations[child_nin]
                        child_found = True
                    
                    if parent_found and child_found:
                        G.add_edge(parent_nin, child_nin)
                        edges_added += 1
                    else:
                        failed_relations.append({
                            'parent': row['ParentNIN'],
                            'child': row['ChildNIN'],
                            'parent_found': parent_found,
                            'child_found': child_found
                        })
                
                # Log failed relations for analysis
                if failed_relations:
                    logger.info(f"Failed to create {len(failed_relations)} edges")
                    # Save failed relations to file for analysis
                    failed_df = pd.DataFrame(failed_relations)
                    failed_df.to_csv('./data/failed_parent_relations.csv', index=False)
                    logger.info("Failed relations saved to ./data/failed_parent_relations.csv")
                
                # Create edge index for PyTorch Geometric
                edge_list = []
                for edge in G.edges():
                    edge_list.append([nin_to_idx[edge[0]], nin_to_idx[edge[1]]])
                
                # Add self-loops
                for i in range(len(nin_to_idx)):
                    edge_list.append([i, i])
                
                # Add random connections for isolated nodes (optional)
                isolated_nodes = [node for node in G.nodes() if G.degree(node) == 0]
                if isolated_nodes:
                    logger.info(f"Adding random connections for {len(isolated_nodes)} isolated nodes")
                    for node in isolated_nodes[:min(100, len(isolated_nodes))]:  # Limit to avoid too many edges
                        # Connect to a random node with similar features
                        node_idx = nin_to_idx[node]
                        # Simple random connection (you could make this more sophisticated)
                        import random
                        target_idx = random.randint(0, len(nin_to_idx) - 1)
                        edge_list.append([node_idx, target_idx])
                
                if edge_list:
                    edge_index = torch.tensor(edge_list, dtype=torch.long).t().contiguous()
                else:
                    edge_index = torch.zeros((2, 0), dtype=torch.long)
                
                node_features = torch.tensor(node_features, dtype=torch.float)
                
                logger.info(f"Enhanced graph created with {len(nin_to_idx)} nodes and {edges_added} family edges")
                return G, edge_index.to(device), nin_to_idx, node_features.to(device)
            
            except Exception as e:
                logger.error(f"Error creating enhanced patient graph: {e}")
                raise

        # Analysis function to understand missing relations
    def analyze_missing_relations(patients_file, parent_relations_file):
        """Analyze why some parent relations fail to create edges"""
        
        patients = pd.read_csv(patients_file, dtype={'NIN': str})
        parents = pd.read_csv(parent_relations_file, dtype={'ParentNIN': str, 'ChildNIN': str})
        
        patient_nids = set(patients['NIN'])
        parent_nids = set(parents['ParentNIN'])
        child_nids = set(parents['ChildNIN'])
        
        print("=== MISSING RELATIONS ANALYSIS ===")
        print(f"Total unique patients in dataset: {len(patient_nids)}")
        print(f"Total unique parents in relations: {len(parent_nids)}")
        print(f"Total unique children in relations: {len(child_nids)}")
        
        missing_parents = parent_nids - patient_nids
        missing_children = child_nids - patient_nids
        
        print(f"Parents not in patient data: {len(missing_parents)}")
        print(f"Children not in patient data: {len(missing_children)}")
        
        if missing_parents:
            print(f"Sample missing parents: {list(missing_parents)[:10]}")
        
        if missing_children:
            print(f"Sample missing children: {list(missing_children)[:10]}")
        
        # Check for potential formatting issues
        def check_format_patterns(nids, name):
            lengths = [len(str(nid)) for nid in nids]
            print(f"{name} NID lengths: min={min(lengths)}, max={max(lengths)}, unique={set(lengths)}")
            
            # Check for leading zeros
            with_leading_zeros = [nid for nid in nids if str(nid).startswith('0')]
            print(f"{name} with leading zeros: {len(with_leading_zeros)}")
        
        check_format_patterns(patient_nids, "Patient")
        check_format_patterns(parent_nids, "Parent")
        check_format_patterns(child_nids, "Child")
        
        print("=== END ANALYSIS ===")

#____________________________________________________

    # Also add this method to help verify your parent_relations.csv file
    def verify_parent_relations_file(file_path):
        """
        Verify the parent_relations.csv file format and content
        """
        try:
            parents = pd.read_csv(file_path)
            print("=== PARENT RELATIONS FILE VERIFICATION ===")
            print(f"File: {file_path}")
            print(f"Shape: {parents.shape}")
            print(f"Columns: {parents.columns.tolist()}")
            print("\nFirst 10 rows:")
            print(parents.head(10))
            
            print(f"\nData types:")
            print(parents.dtypes)
            
            print(f"\nUnique values:")
            print(f"Unique ParentNIN: {parents['ParentNIN'].nunique()}")
            print(f"Unique ChildNIN: {parents['ChildNIN'].nunique()}")
            
            print(f"\nMissing values:")
            print(parents.isnull().sum())
            
            print(f"\nSample ParentNIN values: {parents['ParentNIN'].unique()[:10]}")
            print(f"Sample ChildNIN values: {parents['ChildNIN'].unique()[:10]}")
            
            # Check for potential issues
            if parents['ParentNIN'].dtype != parents['ChildNIN'].dtype:
                print("WARNING: ParentNIN and ChildNIN have different data types!")
            
            if parents.isnull().any().any():
                print("WARNING: Found missing values in parent relations!")
            
            print("=== END VERIFICATION ===")
            return parents
            
        except Exception as e:
            print(f"Error reading parent relations file: {e}")
            return None

    def prepare_sequences(self, patients, temporal, nin_to_idx):
        """Prepare sequence data for model input"""
        logger.info(f"Preparing sequences with length {self.config.seq_length}")

        try:
            sequences = []
            targets_health = []
            targets_disease = []
            patient_indices = []
            cutoff_times = []

            # Sort temporal data
            temporal = temporal.sort_values(['NIN', 'Monthly_Date'])

            # Merge patient and temporal data
            merged_df = pd.merge(patients[['NIN'] + [col for col in patients.columns if col in self.config.feature_cols]],
                               temporal, on='NIN', how='inner')

            # Create feature columns that might be missing
            for col in self.config.feature_cols:
                if col not in merged_df.columns:
                    merged_df[col] = 0

            # Process each patient's data
            for nin, group in tqdm(merged_df.groupby('NIN'), desc="Processing patients"):
                if nin not in nin_to_idx:
                    continue

                group = group.sort_values('Monthly_Date')

                # Skip patients with insufficient data
                if len(group) <= self.config.seq_length + self.config.pred_length:
                    continue

                patient_idx = nin_to_idx[nin]

                # Create sliding window sequences
                for i in range(len(group) - self.config.seq_length - self.config.pred_length + 1):
                    seq_window = group.iloc[i:i+self.config.seq_length]
                    target_window = group.iloc[i+self.config.seq_length:i+self.config.seq_length+self.config.pred_length]

                    # Extract features
                    try:
                        seq_features = seq_window[self.config.feature_cols].values

                        # Extract health targets
                        health_targets = []
                        for col in self.config.target_health_cols:
                            if col in target_window.columns:
                                health_targets.append(target_window[col].values)
                            else:
                                health_targets.append(np.zeros(self.config.pred_length))
                        health_targets = np.array(health_targets).T

                        # Extract disease targets (multi-class)
                        disease_targets = []
                        for col in self.config.target_disease_cols:
                            if col in target_window.columns:
                                disease_targets.append(target_window[col].values)
                            else:
                                disease_targets.append(np.zeros(self.config.pred_length))
                        disease_targets = np.array(disease_targets).T

                        # Check for NaN values
                        if (np.isnan(seq_features).any() or
                            np.isnan(health_targets).any() or
                            np.isnan(disease_targets).any()):
                            continue

                        sequences.append(seq_features)
                        targets_health.append(health_targets)
                        targets_disease.append(disease_targets)
                        patient_indices.append(patient_idx)
                        cutoff_times.append(seq_window['Monthly_Date'].iloc[-1])

                    except Exception as e:
                        logger.warning(f"Error processing sequence for patient {nin}: {e}")
                        continue

            if not sequences:
                raise ValueError("No valid sequences created. Check your data and feature columns.")

            # Convert to numpy arrays
            sequences = np.array(sequences)
            targets_health = np.array(targets_health)
            targets_disease = np.array(targets_disease)
            patient_indices = np.array(patient_indices)

            logger.info(f"Created {len(sequences)} sequences")
            return sequences, targets_health, targets_disease, patient_indices, cutoff_times

        except Exception as e:
            logger.error(f"Error preparing sequences: {e}")
            raise

    def split_data(self, sequences, targets_health, targets_disease, patient_indices, cutoff_times):
        """Split data into train, validation, and test sets"""
        logger.info("Splitting data...")

        try:
            # Temporal split
            cutoff_date = pd.to_datetime(self.config.cutoff_date)
            train_mask = np.array([ct < cutoff_date for ct in cutoff_times])

            # Ensure we have data in all splits
            if train_mask.sum() == 0:
                logger.warning("No training data before cutoff date. Using 70% for training.")
                train_size = int(0.7 * len(sequences))
                train_mask = np.zeros(len(sequences), dtype=bool)
                train_mask[:train_size] = True

            # Split data
            train_seq = sequences[train_mask]
            train_th = targets_health[train_mask]
            train_td = targets_disease[train_mask]
            train_pi = patient_indices[train_mask]

            # Remaining data for val/test
            remain_seq = sequences[~train_mask]
            remain_th = targets_health[~train_mask]
            remain_td = targets_disease[~train_mask]
            remain_pi = patient_indices[~train_mask]

            if len(remain_seq) == 0:
                raise ValueError("No data remaining for validation/test split")

            # Split remaining data
            val_seq, test_seq, val_th, test_th, val_td, test_td, val_pi, test_pi = train_test_split(
                remain_seq, remain_th, remain_td, remain_pi,
                test_size=0.5, random_state=42
            )

            # Convert to tensors
            def to_tensor(arr):
                return torch.tensor(arr, dtype=torch.float32).to(device)

            def to_long_tensor(arr):
                return torch.tensor(arr, dtype=torch.long).to(device)

            train_data = (to_tensor(train_seq), to_tensor(train_th), to_tensor(train_td), to_long_tensor(train_pi))
            val_data = (to_tensor(val_seq), to_tensor(val_th), to_tensor(val_td), to_long_tensor(val_pi))
            test_data = (to_tensor(test_seq), to_tensor(test_th), to_tensor(test_td), to_long_tensor(test_pi))

            logger.info(f"Data split - Train: {len(train_seq)}, Val: {len(val_seq)}, Test: {len(test_seq)}")
            return train_data, val_data, test_data

        except Exception as e:
            logger.error(f"Error splitting data: {e}")
            raise

class GCNLSTMModel(nn.Module):
    # (Copy the entire GCNLSTMModel class)
    def __init__(self, input_dim, node_feature_dim, hidden_dim,
                 output_dim_health, output_dim_disease, pred_length=1, dropout=0.3):
        super().__init__()

        self.hidden_dim = hidden_dim
        self.pred_length = pred_length
        self.output_dim_disease = output_dim_disease

        # Graph attention layers
        self.gat1 = GATConv(node_feature_dim, hidden_dim, heads=4, dropout=dropout)
        self.gat2 = GATConv(hidden_dim * 4, hidden_dim, heads=1, dropout=dropout)

        # Temporal processing
        self.lstm = nn.LSTM(
            input_dim, hidden_dim,
            num_layers=2,
            batch_first=True,
            dropout=dropout,
            bidirectional=True
        )

        # Multi-head attention for temporal sequences
        self.temporal_attention = nn.MultiheadAttention(
            hidden_dim * 2, num_heads=8, dropout=dropout, batch_first=True
        )

        # Feature fusion
        self.fusion_layer = nn.Sequential(
            nn.Linear(hidden_dim * 3, hidden_dim * 2),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim * 2, hidden_dim)
        )

        # Health prediction head (regression)
        self.health_head = nn.Sequential(
            nn.Linear(hidden_dim, hidden_dim),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim, output_dim_health * pred_length)
        )

        # Disease prediction head (multi-class classification)
        self.disease_head = nn.Sequential(
            nn.Linear(hidden_dim, hidden_dim),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim, output_dim_disease)
        )

        # Initialize weights
        self.apply(self._init_weights)

    def _init_weights(self, module):
        if isinstance(module, nn.Linear):
            nn.init.xavier_uniform_(module.weight)
            if module.bias is not None:
                nn.init.zeros_(module.bias)
        elif isinstance(module, nn.LSTM):
            for param in module.parameters():
                if len(param.shape) >= 2:
                    nn.init.orthogonal_(param.data)
                else:
                    nn.init.normal_(param.data)

    def forward(self, x, edge_index, patient_indices, node_features):
        batch_size = x.size(0)

        # Graph processing
        x_graph = F.elu(self.gat1(node_features, edge_index))
        x_graph = F.dropout(x_graph, p=0.3, training=self.training)
        x_graph = self.gat2(x_graph, edge_index)
        patient_graph_emb = x_graph[patient_indices]

        # Temporal processing
        lstm_out, _ = self.lstm(x)

        # Apply temporal attention
        attn_out, _ = self.temporal_attention(lstm_out, lstm_out, lstm_out)

        # Global pooling of temporal features
        temporal_emb = torch.mean(attn_out, dim=1)

        # Feature fusion
        combined = torch.cat([temporal_emb, patient_graph_emb], dim=1)
        fused_features = self.fusion_layer(combined)

        # Multi-task predictions
        health_pred = self.health_head(fused_features)
        health_pred = health_pred.view(batch_size, self.pred_length, -1)

        disease_pred = self.disease_head(fused_features)

        return health_pred, disease_pred

class PredictionService:
    # (Copy the entire PredictionService class)
    def __init__(self, model, config, data_processor):
        self.model = model
        self.config = config
        self.data_processor = data_processor

    def predict_future(self, patient_data, edge_index, node_features, patient_idx, steps_ahead=3):
        """Predict future health metrics and disease probabilities"""
        self.model.eval()

        with torch.no_grad():
            # Prepare input data
            if len(patient_data.shape) == 2:
                patient_data = patient_data.unsqueeze(0)  # Add batch dimension

            patient_indices = torch.tensor([patient_idx], dtype=torch.long).to(device)

            # Make predictions
            health_pred, disease_pred = self.model(
                patient_data, edge_index, patient_indices, node_features
            )

            # Process outputs
            # Process health predictions
            health_pred_np = health_pred.cpu().numpy()  # Shape: (1, pred_length, num_health_metrics)
            # Reshape for inverse transform: (pred_length, num_health_metrics)
            health_pred_reshaped = health_pred_np.reshape(-1, health_pred_np.shape[-1])
            # Inverse transform using health_scaler
            health_pred_original = self.data_processor.health_scaler.inverse_transform(health_pred_reshaped)
            # Reshape back to (1, pred_length, num_health_metrics)
            health_pred_original = health_pred_original.reshape(health_pred_np.shape)

            disease_probs = torch.sigmoid(disease_pred).cpu().numpy()
            disease_pred_binary = (disease_probs > 0.5).astype(int)

            # Create prediction dictionary
            predictions = {
                'health_predictions': {
                    name: health_pred_original[0, :, i].tolist()
                    for i, name in enumerate(self.config.target_health_cols)
                },
                'disease_probabilities': {
                    name: disease_probs[0, i]
                    for i, name in enumerate(self.config.target_disease_cols)
                },
                'disease_predictions': {
                    name: bool(disease_pred_binary[0, i])
                    for i, name in enumerate(self.config.target_disease_cols)
                },
                'prediction_horizon': self.config.pred_length
            }

            return predictions

    def batch_predict(self, test_data, edge_index, node_features):
        """Make batch predictions for multiple patients"""
        test_seq, test_th, test_td, test_pi = test_data

        self.model.eval()
        with torch.no_grad():
            health_pred, disease_pred = self.model(test_seq, edge_index, test_pi, node_features)

            # Convert to numpy
            health_pred = health_pred.cpu().numpy()
            disease_probs = torch.sigmoid(disease_pred).cpu().numpy()

            return health_pred, disease_probs