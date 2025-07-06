import pandas as pd
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch_geometric.data import Data, DataLoader
from torch_geometric.nn import GATConv, TransformerConv
from torch.nn import Dropout, Linear, Sequential, LSTM
from torch.optim import Adam
from sklearn.metrics import r2_score, accuracy_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
from imblearn.over_sampling import SMOTE, ADASYN
from imblearn.combine import SMOTETomek
from torch.nn import Linear, LSTM, Sequential, ReLU, Dropout, Sigmoid, Softmax
import logging
import warnings
import os
import shutil
from tabulate import tabulate
import matplotlib.pyplot as plt
import seaborn as sns
from datetime import datetime, timedelta

warnings.filterwarnings('ignore')

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class Config:
    def __init__(self):
        self.current_date = '2024-12-01'
        self.sequence_length = 12
        self.prediction_horizon = 6
        self.min_family_size = 3
        self.target_health_cols = ['Tension_artérielle_systolique', 'Tension_artérielle_diastolique', 'Glycémie_à_jeun', 'Cholestérol_total', 'IMC', 'LDL', 'Triglycérides', 'Fréquence_cardiaque_au_repos']
        self.target_disease_cols = ['Hypertension', 'Diabète_type_2', 'Obésité', 'Asthme', 'Cancer_du_poumon', 'Cancer_du_sein', 'Cancer_de_la_prostate', 'Maladie_cardiovasculaire']
        self.node_feature_dim = 50
        self.edge_feature_dim = 4
        self.hidden_dims = [64, 128, 256, 512]
        self.gat_heads = 8
        self.lstm_hidden_size = 8
        self.lstm_layers = 2
        self.batch_size = 32
        self.learning_rate = 0.0001
        self.num_epochs = 1000
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.alpha = 0.4
        self.beta = 0.4
        self.gamma = 0.2
        self.apply_smote = True
        self.smote_strategy = 'minority'
        self.smote_k_neighbors = 5
        self.smote_method = 'standard'
        self.min_samples_for_smote = 10

class SMOTEHandler:
    def __init__(self, config):
        self.config = config
        self.smote_samplers = {}
        
    def _get_smote_sampler(self, strategy='minority', k_neighbors=5, method='standard'):
        if method == 'standard':
            return SMOTE(
                sampling_strategy=strategy,
                k_neighbors=k_neighbors,
                random_state=42
            )
        elif method == 'borderline':
            from imblearn.over_sampling import BorderlineSMOTE
            return BorderlineSMOTE(
                sampling_strategy=strategy,
                k_neighbors=k_neighbors,
                random_state=42
            )
        elif method == 'adasyn':
            return ADASYN(
                sampling_strategy=strategy,
                n_neighbors=k_neighbors,
                random_state=42
            )
        elif method == 'combined':
            return SMOTETomek(
                smote=SMOTE(sampling_strategy=strategy, k_neighbors=k_neighbors, random_state=42),
                random_state=42
            )
        else:
            return SMOTE(sampling_strategy=strategy, k_neighbors=k_neighbors, random_state=42)
    
    def analyze_class_distribution(self, y_data, class_names):
        logger.info("Analyzing class distribution...")
        if len(y_data.shape) > 1:
            class_counts = {}
            for i, class_name in enumerate(class_names):
                if i < y_data.shape[1]:
                    positive_count = np.sum(y_data[:, i] == 1)
                    negative_count = np.sum(y_data[:, i] == 0)
                    class_counts[class_name] = {
                        'positive': positive_count,
                        'negative': negative_count,
                        'ratio': positive_count / (positive_count + negative_count) if (positive_count + negative_count) > 0 else 0
                    }
                    logger.info(f"{class_name}: Positive={positive_count}, Negative={negative_count}, Ratio={class_counts[class_name]['ratio']:.3f}")
                else:
                    logger.warning(f"Skipping {class_name}: index {i} out of bounds for y_data with {y_data.shape[1]} columns")
        else:
            unique, counts = np.unique(y_data, return_counts=True)
            class_counts = dict(zip(unique, counts))
            logger.info(f"Class distribution: {class_counts}")
        return class_counts
    
    def apply_smote_to_graphs(self, graphs):
        if not self.config.apply_smote:
            logger.info("SMOTE disabled, returning original graphs")
            return graphs
        logger.info("Applying SMOTE to balance disease classes...")
        all_node_features = []
        all_disease_targets = []
        all_health_targets = []
        all_temporal_data = []
        graph_indices = []
        for graph_idx, graph in enumerate(graphs):
            n_nodes = graph.x.shape[0]
            for node_idx in range(n_nodes):
                node_feature = graph.x[node_idx].numpy()
                if hasattr(graph, 'temporal_data') and graph.temporal_data is not None:
                    temporal_features = graph.temporal_data[node_idx].numpy()
                    temporal_mean = np.mean(temporal_features, axis=0)
                    combined_features = np.concatenate([node_feature, temporal_mean])
                else:
                    combined_features = node_feature
                all_node_features.append(combined_features)
                all_disease_targets.append(graph.targets_disease[node_idx].numpy())
                all_health_targets.append(graph.targets_health[node_idx].numpy())
                if hasattr(graph, 'temporal_data') and graph.temporal_data is not None:
                    all_temporal_data.append(graph.temporal_data[node_idx].numpy())
                else:
                    default_temporal = np.zeros((self.config.sequence_length, len(self.config.target_health_cols) + 4))
                    all_temporal_data.append(default_temporal)
                graph_indices.append((graph_idx, node_idx))
        X = np.array(all_node_features)
        y_disease = np.array(all_disease_targets)
        y_health = np.array(all_health_targets)
        temporal_data = np.array(all_temporal_data)
        logger.info(f"y_disease shape: {y_disease.shape}, expected diseases: {len(self.config.target_disease_cols)}")
        logger.info(f"Original dataset size: {X.shape[0]} samples")
        class_distribution = self.analyze_class_distribution(y_disease, self.config.target_disease_cols)
        balanced_data = self._apply_smote_multi_label(X, y_disease, y_health, temporal_data)
        if balanced_data is not None:
            X_balanced, y_disease_balanced, y_health_balanced, temporal_balanced = balanced_data
            logger.info(f"Balanced dataset size: {X_balanced.shape[0]} samples")
            balanced_graphs = self._reconstruct_graphs(
                X_balanced, y_disease_balanced, y_health_balanced, 
                temporal_balanced, graphs
            )
            return balanced_graphs
        else:
            logger.warning("SMOTE failed, returning original graphs")
            return graphs
    
    def _apply_smote_multi_label(self, X, y_disease, y_health, temporal_data):
        try:
            logger.info(f"Applying SMOTE for {y_disease.shape[1]} diseases, config expects {len(self.config.target_disease_cols)}")
            X_balanced_list = []
            y_disease_balanced_list = []
            y_health_balanced_list = []
            temporal_balanced_list = []
            for disease_idx, disease_name in enumerate(self.config.target_disease_cols):
                if disease_idx >= y_disease.shape[1]:
                    logger.warning(f"Skipping SMOTE for {disease_name}: index {disease_idx} out of bounds")
                    continue
                y_current = y_disease[:, disease_idx]
                positive_count = np.sum(y_current == 1)
                if positive_count < self.config.min_samples_for_smote:
                    logger.warning(f"Skipping SMOTE for {disease_name}: only {positive_count} positive samples")
                    continue
                try:
                    smote = self._get_smote_sampler(
                        strategy=self.config.smote_strategy,
                        k_neighbors=min(self.config.smote_k_neighbors, positive_count - 1),
                        method=self.config.smote_method
                    )
                    X_resampled, y_resampled = smote.fit_resample(X, y_current)
                    original_indices = []
                    new_indices = []
                    for i, (x_orig, y_orig) in enumerate(zip(X, y_current)):
                        matches = np.where(np.all(X_resampled == x_orig, axis=1))[0]
                        if len(matches) > 0:
                            original_indices.extend(matches.tolist())
                            new_indices.extend([i] * len(matches))
                    y_disease_new = np.zeros((X_resampled.shape[0], y_disease.shape[1]))
                    y_health_new = np.zeros((X_resampled.shape[0], len(self.config.target_health_cols)))
                    temporal_new = np.zeros((X_resampled.shape[0], temporal_data.shape[1], temporal_data.shape[2]))
                    for new_idx, orig_idx in zip(original_indices[:len(new_indices)], new_indices):
                        if new_idx < y_disease_new.shape[0] and orig_idx < y_disease.shape[0]:
                            y_disease_new[new_idx] = y_disease[orig_idx]
                            y_health_new[new_idx] = y_health[orig_idx]
                            temporal_new[new_idx] = temporal_data[orig_idx]
                    y_disease_new[:, disease_idx] = y_resampled
                    X_balanced_list.append(X_resampled)
                    y_disease_balanced_list.append(y_disease_new)
                    y_health_balanced_list.append(y_health_new)
                    temporal_balanced_list.append(temporal_new)
                    logger.info(f"SMOTE applied to {disease_name}: {len(X)} -> {len(X_resampled)} samples")
                except Exception as e:
                    logger.warning(f"SMOTE failed for {disease_name}: {e}")
                    continue
            if X_balanced_list:
                X_final = np.vstack(X_balanced_list)
                y_disease_final = np.vstack(y_disease_balanced_list)
                y_health_final = np.vstack(y_health_balanced_list)
                temporal_final = np.vstack(temporal_balanced_list)
                unique_indices = np.unique(X_final, axis=0, return_index=True)[1]
                X_final = X_final[unique_indices]
                y_disease_final = y_disease_final[unique_indices]
                y_health_final = y_health_final[unique_indices]
                temporal_final = temporal_final[unique_indices]
                return X_final, y_disease_final, y_health_final, temporal_final
            else:
                return None
        except Exception as e:
            logger.error(f"Error in SMOTE application: {e}")
            return None
    
    def _reconstruct_graphs(self, X_balanced, y_disease_balanced, y_health_balanced, temporal_balanced, original_graphs):
        logger.info("Reconstructing graphs with balanced data...")
        total_original_nodes = sum(graph.x.shape[0] for graph in original_graphs)
        avg_nodes_per_graph = total_original_nodes / len(original_graphs)
        new_total_nodes = X_balanced.shape[0]
        estimated_new_graphs = max(1, int(new_total_nodes / avg_nodes_per_graph))
        new_graphs = []
        nodes_per_new_graph = max(3, new_total_nodes // estimated_new_graphs)
        for i in range(0, new_total_nodes, nodes_per_new_graph):
            end_idx = min(i + nodes_per_new_graph, new_total_nodes)
            graph_X = X_balanced[i:end_idx]
            graph_y_disease = y_disease_balanced[i:end_idx]
            graph_y_health = y_health_balanced[i:end_idx]
            graph_temporal = temporal_balanced[i:end_idx]
            node_features = graph_X[:, :self.config.node_feature_dim]
            num_nodes = len(graph_X)
            edge_index = []
            edge_attr = []
            for src in range(num_nodes):
                for dst in range(num_nodes):
                    if src != dst:
                        edge_index.append([src, dst])
                        edge_attr.append([0.5, 0.1, 0.1, 0.1])
            if not edge_index:
                for node in range(num_nodes):
                    edge_index.append([node, node])
                    edge_attr.append([1.0, 0.0, 0.0, 0.0])
            graph = Data(
                x=torch.FloatTensor(node_features),
                edge_index=torch.LongTensor(edge_index).T,
                edge_attr=torch.FloatTensor(edge_attr),
                temporal_data=torch.FloatTensor(graph_temporal),
                targets_health=torch.FloatTensor(graph_y_health),
                targets_disease=torch.FloatTensor(graph_y_disease)
            )
            new_graphs.append(graph)
        logger.info(f"Reconstructed {len(new_graphs)} graphs from balanced data")
        return new_graphs
        
class DataPreprocessor:
    def __init__(self, config):
        self.config = config
        self.encoders = {'sex': LabelEncoder(), 'blood': LabelEncoder(), 'wilaya': LabelEncoder(), 'job': LabelEncoder(), 'smoking': LabelEncoder(), 'alcohol': LabelEncoder(), 'activity': LabelEncoder(), 'diet': LabelEncoder(), 'sleep': LabelEncoder(), 'stress': LabelEncoder(), 'years_smoking': LabelEncoder(), 'hours_activity': LabelEncoder(), 'hours_sleep': LabelEncoder(), 'cigarettes': LabelEncoder()}
        self.age_scaler = StandardScaler()
        self.health_scaler = StandardScaler()
        self.lifestyle_scaler = StandardScaler()
        self.smote_handler = SMOTEHandler(config)
        
    def preprocess_data(self, patients, temporal, parents, fit_scalers=True):
        logger.info("Preprocessing data...")
        try:
            current_date = pd.to_datetime(self.config.current_date)
            patients['BirthDate'] = pd.to_datetime(patients['BirthDate'])
            patients['age'] = (current_date - patients['BirthDate']).dt.days / 365.25
            numerical_cols = patients.select_dtypes(include=[np.number]).columns
            categorical_cols = patients.select_dtypes(exclude=[np.number]).columns
            for col in numerical_cols:
                patients[col] = patients[col].fillna(patients[col].median())
            for col in categorical_cols:
                if col != 'BirthDate':
                    patients[col] = patients[col].fillna('missing')
            if fit_scalers:
                patients['Sex_encoded'] = self.encoders['sex'].fit_transform(patients['Sex'].astype(str))
                patients['BloodGroup_encoded'] = self.encoders['blood'].fit_transform(patients['BloodGroup'].astype(str))
                patients['Wilaya_encoded'] = self.encoders['wilaya'].fit_transform(patients['Wilaya'].astype(str))
                patients['Job_encoded'] = self.encoders['job'].fit_transform(patients['Job'].astype(str))
            else:
                patients['Sex_encoded'] = self.encoders['sex'].transform(patients['Sex'].astype(str))
                patients['BloodGroup_encoded'] = self.encoders['blood'].transform(patients['BloodGroup'].astype(str))
                patients['Wilaya_encoded'] = self.encoders['wilaya'].transform(patients['Wilaya'].astype(str))
                patients['Job_encoded'] = self.encoders['job'].transform(patients['Job'].astype(str))
            if fit_scalers:
                patients['age_norm'] = self.age_scaler.fit_transform(patients[['age']]).flatten()
            else:
                patients['age_norm'] = self.age_scaler.transform(patients[['age']]).flatten()
            logger.info(f"Number of patients after preprocessing: {len(patients)}")
            temporal = temporal.sort_values(['NIN', 'Monthly_Date'])
            temporal['Monthly_Date'] = pd.to_datetime(temporal['Monthly_Date'])
            numerical_cols = temporal.select_dtypes(include=[np.number]).columns
            categorical_cols = temporal.select_dtypes(exclude=[np.number]).columns
            for col in numerical_cols:
                temporal[col] = temporal[col].fillna(temporal[col].median())
            for col in categorical_cols:
                if col not in ['NIN', 'Monthly_Date']:
                    temporal[col] = temporal[col].fillna('missing')
            categorical_mappings = {
                'Statut_tabagique': 'smoking',
                'Consommation_alcohol': 'alcohol',
                'Activité_physique': 'activity',
                'Qualité_alimentation': 'diet',
                'Qualité_sommeil': 'sleep',
                'Niveau_stress': 'stress'
            }
            for col, encoder_key in categorical_mappings.items():
                if col in temporal.columns:
                    if fit_scalers:
                        temporal[f'{col}_encoded'] = self.encoders[encoder_key].fit_transform(temporal[col].astype(str))
                    else:
                        temporal[f'{col}_encoded'] = self.encoders[encoder_key].transform(temporal[col].astype(str))
            health_cols = [col for col in self.config.target_health_cols if col in temporal.columns]
            if health_cols:
                if fit_scalers:
                    temporal[health_cols] = self.health_scaler.fit_transform(temporal[health_cols])
                else:
                    temporal[health_cols] = self.health_scaler.transform(temporal[health_cols])
            lifestyle_cols = ['Cigarettes_par_jour', 'Années_de_tabagisme', 'Heures_activité_hebdo', 'Heures_sommeil']
            lifestyle_cols = [col for col in lifestyle_cols if col in temporal.columns]
            if lifestyle_cols:
                if fit_scalers:
                    temporal[lifestyle_cols] = self.lifestyle_scaler.fit_transform(temporal[lifestyle_cols])
                else:
                    temporal[lifestyle_cols] = self.lifestyle_scaler.transform(temporal[lifestyle_cols])
            logger.info("Data preprocessing completed")
            return patients, temporal, parents
        except Exception as e:
            logger.error(f"Error preprocessing data: {e}")
            raise

    def create_family_graphs(self, patients, temporal, parents, apply_smote=None):
        logger.info("Creating family graphs...")
        if apply_smote is None:
            apply_smote = self.config.apply_smote
        families = self._build_family_networks(parents)
        logger.info(f"Total families found before size filtering: {len(families)}")
        min_size = self.config.min_family_size
        families = [f for f in families if len(f) >= min_size]
        logger.info(f"Families after filtering for min size {min_size}: {len(families)}")
        graphs = []
        for family_members in families:
            try:
                graph = self._create_single_family_graph(family_members, patients, temporal)
                if graph is not None: graphs.append(graph)
            except Exception as e:
                logger.warning(f"Error creating graph for family: {e}")
                continue
        logger.info(f"Created {len(graphs)} family graphs before SMOTE")
        if apply_smote and graphs:
            graphs = self.smote_handler.apply_smote_to_graphs(graphs)
            logger.info(f"Final number of graphs after SMOTE: {len(graphs)}")
        return graphs

    def _build_family_networks(self, parents):
        relationships = set()
        for _, row in parents.iterrows():
            child = row['ChildNIN']
            parent = row['ParentNIN']
            relationships.add((child, parent))
            relationships.add((parent, child))
        visited = set()
        families = []
        all_people = set([p for pair in relationships for p in pair])
        def dfs(person):
            stack = [person]
            component = []
            while stack:
                curr = stack.pop()
                if curr not in visited:
                    visited.add(curr)
                    component.append(curr)
                    for (a,b) in relationships:
                        if a == curr and b not in visited:
                            stack.append(b)
            return component
        for person in all_people:
            if person not in visited:
                family = dfs(person)
                families.append(family)
        logger.info(f"Total connected components found: {len(families)}")
        return families

    def _create_single_family_graph(self, family_members, patients, temporal):
        family_patients = patients[patients['NIN'].isin(family_members)].copy()
        logger.info(f"Creating graph for family members: {family_members}, found patients: {len(family_patients)}")
        if len(family_patients) < self.config.min_family_size:
            logger.warning(f"Family size {len(family_patients)} is less than minimum required {self.config.min_family_size}.")
            return None
        nin_to_idx = {nin: idx for idx, nin in enumerate(family_patients['NIN'])}
        node_features = self._create_node_features(family_patients, temporal)
        edge_index, edge_attr = self._create_edges(family_members, family_patients, nin_to_idx, patients)
        temporal_data = self._create_temporal_sequences(family_patients, temporal)
        targets = self._create_multistep_targets(family_patients, temporal)
        graph = Data(
            x=torch.FloatTensor(node_features),
            edge_index=torch.LongTensor(edge_index),
            edge_attr=torch.FloatTensor(edge_attr),
            temporal_data=torch.FloatTensor(temporal_data),
            targets_health=targets['health'],
            targets_disease=targets['disease'],
            nin_list=list(family_patients['NIN'])
        )
        return graph

    def _create_node_features(self, family_patients, temporal):
        features = []
        for _, patient in family_patients.iterrows():
            demo_features = [
                patient['age_norm'],
                patient['Sex_encoded'],
                patient['BloodGroup_encoded'],
                patient['Wilaya_encoded'],
                patient['Job_encoded']
            ]
            patient_temporal = temporal[temporal['NIN'] == patient['NIN']]
            if not patient_temporal.empty:
                latest_record = patient_temporal.sort_values('Monthly_Date').iloc[-1]
                health_features = [float(latest_record.get(col, 0.0)) for col in self.config.target_health_cols]
                lifestyle_cols = ['Statut_tabagique_encoded', 'Consommation_alcool_encoded',
                                  'Activité_physique_encoded', 'Qualité_alimentation_encoded',
                                  'Qualité_sommeil_encoded', 'Niveau_stress_encoded']
                lifestyle_features = [float(latest_record.get(col, 0.0)) for col in lifestyle_cols]
                disease_features = [float(latest_record.get(col, 0.0)) for col in self.config.target_disease_cols]
            else:
                health_features = [0.0] * len(self.config.target_health_cols)
                lifestyle_features = [0.0] * 6
                disease_features = [0.0] * len(self.config.target_disease_cols)
            node_feature = demo_features + health_features + lifestyle_features + disease_features
            if len(node_feature) < self.config.node_feature_dim:
                node_feature.extend([0.0] * (self.config.node_feature_dim - len(node_feature)))
            else:
                node_feature = node_feature[:self.config.node_feature_dim]
            features.append(node_feature)
        return np.array(features)

    def _create_edges(self, family_members, family_patients, nin_to_idx, patients):
        edge_index = []
        edge_attr = []
        for i, nin1 in enumerate(family_patients['NIN']):
            for j, nin2 in enumerate(family_patients['NIN']):
                if i != j:
                    relationship_weight = self._calculate_relationship_weight(nin1, nin2, patients)
                    if relationship_weight > 0:
                        edge_index.append([i, j])
                        age_diff = abs(family_patients.iloc[i]['age'] - family_patients.iloc[j]['age'])
                        age_diff_norm = min(age_diff / 50.0, 1.0)
                        edge_feature = [
                            relationship_weight,
                            age_diff_norm,
                            0.5,
                            0.5
                        ]
                        edge_attr.append(edge_feature)
        if not edge_index:
            for i in range(len(family_patients)):
                edge_index.append([i, i])
                edge_attr.append([1.0, 0.0, 0.0, 0.0])
        return np.array(edge_index).T, np.array(edge_attr)

    def _calculate_relationship_weight(self, nin1, nin2, patients):
        if nin1 in patients['NIN'].values and nin2 in patients['NIN'].values:
            return 0.5
        return 0.0

    def _create_temporal_sequences(self, family_patients, temporal):
        sequences = []
        seq_len = self.config.sequence_length
        for _, patient in family_patients.iterrows():
            patient_temporal = temporal[temporal['NIN'] == patient['NIN']].sort_values('Monthly_Date')
            sequence = []
            for _, record in patient_temporal.iterrows():
                features = []
                for col in self.config.target_health_cols:
                    features.append(float(record.get(col, 0.0)))
                lifestyle_cols = ['Cigarettes_par_jour', 'Années_de_tabagisme', 'Heures_activité_hebdo', 'Heures_sommeil']
                for col in lifestyle_cols:
                    features.append(float(record.get(col, 0.0)))
                sequence.append(features)
            while len(sequence) < seq_len:
                if sequence:
                    sequence.insert(0, [0.0] * len(sequence[0]))
                else:
                    features_len = len(self.config.target_health_cols) + 4
                    sequence.insert(0, [0.0] * features_len)
            if len(sequence) > seq_len:
                sequence = sequence[-seq_len:]
            sequences.append(sequence)
        return np.array(sequences)

    def _create_multistep_targets(self, family_patients, temporal):
        health_targets = []
        disease_targets = []
        available_disease_cols = [col for col in self.config.target_disease_cols if col in temporal.columns]
        logger.info(f"Available disease columns: {available_disease_cols}")
        if not available_disease_cols:
            logger.warning("No disease columns found in temporal data. Using zeros for disease targets.")
            available_disease_cols = self.config.target_disease_cols
        logger.info(f"Updating target_disease_cols from {len(self.config.target_disease_cols)} to {len(available_disease_cols)}")
        self.config.target_disease_cols = available_disease_cols
        for _, patient in family_patients.iterrows():
            patient_temporal = temporal[temporal['NIN'] == patient['NIN']].sort_values('Monthly_Date')
            if len(patient_temporal) >= self.config.sequence_length + self.config.prediction_horizon:
                target_records = patient_temporal.iloc[-self.config.prediction_horizon:]
                health_target = []
                disease_target = []
                for _, record in target_records.iterrows():
                    health_step = [float(record.get(col, 0.0)) for col in self.config.target_health_cols]
                    disease_step = [float(record.get(col, 0.0)) for col in available_disease_cols]
                    logger.info(f"Disease step length: {len(disease_step)}, expected: {len(available_disease_cols)}")
                    health_target.append(health_step)
                    disease_target.append(disease_step)
            else:
                if not patient_temporal.empty:
                    latest_record = patient_temporal.iloc[-1]
                    health_step = [float(latest_record.get(col, 0.0)) for col in self.config.target_health_cols]
                    disease_step = [float(latest_record.get(col, 0.0)) for col in available_disease_cols]
                else:
                    health_step = [0.0] * len(self.config.target_health_cols)
                    disease_step = [0.0] * len(available_disease_cols)
                health_target = [health_step] * self.config.prediction_horizon
                disease_target = [disease_step] * self.config.prediction_horizon
            health_targets.append(health_target)
            disease_targets.append(disease_target)
        return {'health': torch.FloatTensor(health_targets), 'disease': torch.FloatTensor(disease_targets)}

class HealthGNN(nn.Module):
    def __init__(self, config):
        super(HealthGNN, self).__init__()
        self.config = config
        self.gat_layer = GATConv(
            config.node_feature_dim,
            config.hidden_dims[0],
            heads=config.gat_heads,
            edge_dim=config.edge_feature_dim,
            concat=True
        )
        self.transformer_layer = TransformerConv(
            config.hidden_dims[0] * config.gat_heads,
            config.hidden_dims[3],
            heads=8,
            concat=False
        )
        self.dropout = Dropout(0.3)

    def forward(self, x, edge_index, edge_attr):
        x = self.gat_layer(x, edge_index, edge_attr)
        x = F.relu(x)
        x = self.dropout(x)
        x = self.transformer_layer(x, edge_index)
        return x

class TemporalGraphFusion(nn.Module):
    def __init__(self, config):
        super(TemporalGraphFusion, self).__init__()
        self.config = config
        self.temporal_lstm = LSTM(input_size=len(config.target_health_cols) + 4, hidden_size=config.lstm_hidden_size, num_layers=config.lstm_layers, bidirectional=True, batch_first=True, dropout=0.3)
        self.graph_gnn = HealthGNN(config)
        self.fusion_linear = Linear(config.lstm_hidden_size * 2 + config.hidden_dims[-1], config.hidden_dims[-1])
        self.fusion_attention = nn.MultiheadAttention(embed_dim=config.hidden_dims[-1], num_heads=8, batch_first=True)
        self.decoder_lstm = LSTM(input_size=config.hidden_dims[-1], hidden_size=config.lstm_hidden_size, num_layers=config.lstm_layers, batch_first=True, dropout=0.3)

    def forward(self, temporal_data, graph_data):
        batch_size = temporal_data.size(0)
        temporal_out, (hidden, cell) = self.temporal_lstm(temporal_data)
        temporal_emb = temporal_out[:, -1, :]
        graph_emb = self.graph_gnn(graph_data.x, graph_data.edge_index, graph_data.edge_attr)
        combined_emb = torch.cat([temporal_emb, graph_emb], dim=1)
        combined_emb = self.fusion_linear(combined_emb)
        combined_emb = combined_emb.unsqueeze(1)
        attended_emb, _ = self.fusion_attention(combined_emb, combined_emb, combined_emb)
        attended_emb = attended_emb.squeeze(1)
        decoder_input = attended_emb.unsqueeze(1).repeat(1, self.config.prediction_horizon, 1)
        decoder_out, _ = self.decoder_lstm(decoder_input)
        return decoder_out, attended_emb

class MultiTaskHealthPredictor(nn.Module):
    def __init__(self, config):
        super(MultiTaskHealthPredictor, self).__init__()
        self.config = config
        self.shared_encoder = TemporalGraphFusion(config)
        self.temporal_head = Sequential(Linear(config.lstm_hidden_size, 256), ReLU(), Dropout(0.3), Linear(256, 128), ReLU(), Linear(128, len(config.target_health_cols)))
        self.disease_head = Sequential(Linear(config.lstm_hidden_size, 256), ReLU(), Dropout(0.3), Linear(256, 128), ReLU(), Linear(128, len(config.target_disease_cols)), Sigmoid())

    def forward(self, temporal_data, graph_data):
        decoder_out, attended_emb = self.shared_encoder(temporal_data, graph_data)
        temporal_predictions = []
        disease_predictions = []
        for t in range(self.config.prediction_horizon):
            temporal_pred = self.temporal_head(decoder_out[:, t, :])
            disease_pred = self.disease_head(decoder_out[:, t, :])
            temporal_predictions.append(temporal_pred)
            disease_predictions.append(disease_pred)
        temporal_pred = torch.stack(temporal_predictions, dim=1)
        disease_risk = torch.stack(disease_predictions, dim=1)
        return temporal_pred, disease_risk

class GNNHealthcareModel:
    def __init__(self, config=None):
        self.config = config or Config()
        self.preprocessor = DataPreprocessor(self.config)
        self.model = None
        self.optimizer = None
        self.device = self.config.device
        
    def load_data(self, patients_path, temporal_path, parents_path):
        logger.info("Loading data...")
        try:
            patients = pd.read_csv(patients_path)
            temporal = pd.read_csv(temporal_path)
            parents = pd.read_csv(parents_path)
            logger.info(f"Loaded {len(patients)} patients, {len(temporal)} temporal records, {len(parents)} parent relations")
            logger.info(f"Patients NIN unique count: {patients['NIN'].nunique()}")
            logger.info(f"Temporal NIN unique count: {temporal['NIN'].nunique()}")
            logger.info(f"Parents NIN unique count: {parents['ChildNIN'].nunique()} and {parents['ParentNIN'].nunique()}")
            logger.info(f"Temporal data columns: {list(temporal.columns)}")
            missing_diseases = [col for col in self.config.target_disease_cols if col not in temporal.columns]
            if missing_diseases:
                logger.warning(f"Missing disease columns in temporal data: {missing_diseases}")
            return patients, temporal, parents
        except Exception as e:
            logger.error(f"Error loading data: {e}")
            raise

    def prepare_data(self, patients, temporal, parents):
        patients, temporal, parents = self.preprocessor.preprocess_data(patients, temporal, parents)
        graphs = self.preprocessor.create_family_graphs(patients, temporal, parents, apply_smote=True)
        if self.config.apply_smote:
            self._log_smote_statistics(graphs)
        train_graphs, test_graphs = train_test_split(graphs, test_size=0.2, random_state=42)
        self.build_model()
        return train_graphs, test_graphs
        
    def _log_smote_statistics(self, graphs):
        logger.info("SMOTE Statistics:")
        all_disease_targets = []
        for graph in graphs:
            all_disease_targets.append(graph.targets_disease.numpy())
        if all_disease_targets:
            combined_targets = np.vstack(all_disease_targets)
            logger.info(f"combined_targets shape: {combined_targets.shape}, target_disease_cols: {len(self.config.target_disease_cols)}")
            for i, disease_name in enumerate(self.config.target_disease_cols):
                if i < combined_targets.shape[1]:
                    positive_count = np.sum(combined_targets[:, i] == 1)
                    negative_count = np.sum(combined_targets[:, i] == 0)
                    total_count = positive_count + negative_count
                    if total_count > 0:
                        ratio = positive_count / total_count
                        logger.info(f"{disease_name}: {positive_count}/{total_count} ({ratio:.3f}) positive samples")
                else:
                    logger.warning(f"Skipping {disease_name}: index {i} out of bounds for combined_targets with {combined_targets.shape[1]} columns")

    def build_model(self):
        logger.info("Building model...")
        self.model = MultiTaskHealthPredictor(self.config).to(self.device)
        self.optimizer = torch.optim.Adam(self.model.parameters(), lr=self.config.learning_rate)
        logger.info("Model built successfully")

    def train(self, train_graphs, test_graphs):
        logger.info("Starting training...")
        train_losses = []
        test_losses = []
        train_loader = DataLoader(train_graphs, batch_size=self.config.batch_size, shuffle=True)
        test_loader = DataLoader(test_graphs, batch_size=self.config.batch_size, shuffle=False)
        for epoch in range(self.config.num_epochs):
            self.model.train()
            train_loss = 0
            for batch in train_loader:
                self.optimizer.zero_grad()
                temporal_pred, disease_pred = self.model(batch.temporal_data.to(self.device), batch.to(self.device))
                temporal_loss = F.mse_loss(temporal_pred, batch.targets_health.to(self.device))
                disease_loss = F.binary_cross_entropy(disease_pred, batch.targets_disease.to(self.device))
                total_loss = (self.config.alpha * temporal_loss + self.config.beta * disease_loss)
                total_loss.backward()
                self.optimizer.step()
                train_loss += total_loss.item()
            train_loss /= len(train_loader)
            train_losses.append(train_loss)
            if epoch % 10 == 0 or epoch == self.config.num_epochs - 1:
                test_loss = self.evaluate(test_loader)
                test_losses.append(test_loss)
                logger.info(f"Epoch {epoch}: Train Loss = {train_loss:.4f}, Test Loss = {test_loss:.4f}")
        return train_losses, test_losses

    def evaluate(self, data_loader):
        self.model.eval()
        total_loss = 0
        with torch.no_grad():
            for batch in data_loader:
                temporal_pred, disease_pred = self.model(batch.temporal_data.to(self.device), batch.to(self.device))
                temporal_loss = F.mse_loss(temporal_pred, batch.targets_health.to(self.device))
                disease_loss = F.binary_cross_entropy(disease_pred, batch.targets_disease.to(self.device))
                total_loss += (self.config.alpha * temporal_loss + self.config.beta * disease_loss).item()
        return total_loss / len(data_loader)

    def predict(self, patients, temporal, parents):
        self.model.eval()
        patients, temporal, parents = self.preprocessor.preprocess_data(patients, temporal, parents, fit_scalers=False)
        graphs = self.preprocessor.create_family_graphs(patients, temporal, parents, apply_smote=False)
        predictions = []
        dataloader = DataLoader(graphs, batch_size=self.config.batch_size, shuffle=False)
        with torch.no_grad():
            for batch in dataloader:
                temporal_pred, disease_pred = self.model(batch.temporal_data.to(self.device), batch.to(self.device))
                for i in range(temporal_pred.shape[0]):
                    pred = {'temporal': temporal_pred[i].cpu().numpy(), 'disease': disease_pred[i].cpu().numpy()}
                    predictions.append(pred)
        return predictions

    def save_model(self, path):
        try:
            save_dir = '/kaggle/working/'
            if not os.path.exists(save_dir):
                os.makedirs(save_dir)
            full_path = os.path.join(save_dir, os.path.basename(path))
            stat = shutil.disk_usage(save_dir)
            free_space = stat.free / (1024 ** 3)
            logger.info(f"Free disk space: {free_space:.2f} GB")
            if free_space < 1:
                logger.warning(f"Low disk space ({free_space:.2f} GB). Skipping model save.")
                return
            logger.info(f"Saving model to {full_path}")
            torch.save({
                'model_state_dict': self.model.state_dict(),
                'optimizer_state_dict': self.optimizer.state_dict(),
                'config': self.config,
                'preprocessor': self.preprocessor
            }, full_path)
            logger.info(f"Model saved successfully to {full_path}")
        except Exception as e:
            logger.error(f"Failed to save model to {path}: {e}")

    def load_model(self, path):
        checkpoint = torch.load(path, map_location=self.device)
        self.config = checkpoint['config']
        self.preprocessor = checkpoint['preprocessor']
        self.build_model()
        self.model.load_state_dict(checkpoint['model_state_dict'])
        self.optimizer = torch.optim.Adam(self.model.parameters(), lr=self.config.learning_rate)
        self.optimizer.load_state_dict(checkpoint['optimizer_state_dict'])
        logger.info(f"Model loaded from {path}")

    def evaluate_with_metrics(self, test_graphs):
        self.model.eval()
        all_temporal_true = []
        all_temporal_pred = []
        all_disease_true = []
        all_disease_pred = []
        test_loader = DataLoader(test_graphs, batch_size=self.config.batch_size, shuffle=False)
        with torch.no_grad():
            for batch in test_loader:
                temporal_pred, disease_pred = self.model(batch.temporal_data.to(self.device), batch.to(self.device))
                all_temporal_true.append(batch.targets_health.cpu().numpy())
                all_temporal_pred.append(temporal_pred.cpu().numpy())
                all_disease_true.append(batch.targets_disease.cpu().numpy())
                all_disease_pred.append(disease_pred.cpu().numpy())
        temporal_true = np.concatenate(all_temporal_true, axis=0)
        temporal_pred = np.concatenate(all_temporal_pred, axis=0)
        disease_true = np.concatenate(all_disease_true, axis=0)
        disease_pred = np.concatenate(all_disease_pred, axis=0)
        regression_metrics = self._calculate_multistep_regression_metrics(temporal_true, temporal_pred)
        classification_metrics = self._calculate_multistep_classification_metrics(disease_true, disease_pred)
        return regression_metrics, classification_metrics
    
    def _calculate_multistep_regression_metrics(self, y_true, y_pred):
        metrics = {}
        metrics['overall'] = {'r2': r2_score(y_true.reshape(-1), y_pred.reshape(-1))}
        metrics['per_timestep'] = {}
        for t in range(self.config.prediction_horizon):
            metrics['per_timestep'][f'step_{t+1}'] = {'r2': r2_score(y_true[:, t, :].reshape(-1), y_pred[:, t, :].reshape(-1))}
        metrics['per_feature'] = {}
        for i, feature in enumerate(self.config.target_health_cols):
            if i < y_true.shape[2]:
                metrics['per_feature'][feature] = {'r2': r2_score(y_true[:, :, i].reshape(-1), y_pred[:, :, i].reshape(-1))}
        return metrics
    
    def _calculate_multistep_classification_metrics(self, y_true, y_pred):
        y_pred_binary = (y_pred > 0.5).astype(int)
        metrics = {}
        metrics['overall'] = {'accuracy': accuracy_score(y_true.reshape(-1), y_pred_binary.reshape(-1))}
        metrics['per_timestep'] = {}
        for t in range(self.config.prediction_horizon):
            metrics['per_timestep'][f'step_{t+1}'] = {'accuracy': accuracy_score(y_true[:, t, :].reshape(-1), y_pred_binary[:, t, :].reshape(-1))}
        metrics['per_disease'] = {}
        for i, disease in enumerate(self.config.target_disease_cols):
            if i < y_true.shape[2]:
                metrics['per_disease'][disease] = {'accuracy': accuracy_score(y_true[:, :, i].reshape(-1), y_pred_binary[:, :, i].reshape(-1))}
        return metrics
    

class PatientPredictionAnalyzer:
    def __init__(self, model, config):
        self.model = model
        self.config = config
        
    def get_patient_comprehensive_prediction(self, nin, patients, temporal, parents, graphs):
        if nin not in patients['NIN'].values:
            print(f"❌ Error: NIN {nin} not found in patients data")
            return None
            
        patient_info = patients[patients['NIN'] == nin].iloc[0]
        
        # Find the target graph for the patient
        target_graph = None
        patient_idx_in_graph = None
        for graph in graphs:
            if nin in graph.nin_list:
                target_graph = graph
                patient_idx_in_graph = graph.nin_list.index(nin)
                break
        
        if target_graph is None:
            print(f"❌ Error: Patient {nin} not found in any family graph")
            return None
        
        # Make predictions using the precomputed graph
        self.model.model.eval()
        with torch.no_grad():
            temporal_pred, disease_pred = self.model.model(
                target_graph.temporal_data.to(self.model.device),
                target_graph.to(self.model.device)
            )

        # Inverse transform predictions using the existing scaler
        num_health_features = len(self.config.target_health_cols)
        temporal_pred_np = temporal_pred.cpu().numpy()
        temporal_pred_reshaped = temporal_pred_np.reshape(-1, num_health_features)
        temporal_pred_original = self.model.preprocessor.health_scaler.inverse_transform(temporal_pred_reshaped)
        temporal_pred_original = temporal_pred_original.reshape(
            temporal_pred_np.shape[0], temporal_pred_np.shape[1], num_health_features
        )

        patient_temporal_pred = temporal_pred_original[patient_idx_in_graph, :, :]
        patient_disease_pred = disease_pred[patient_idx_in_graph, :, :].cpu().numpy()
        
        # Generate the report
        report = self._create_comprehensive_report(
            nin, patient_info, patient_temporal_pred, patient_disease_pred
        )
        
        return report
    
    def _create_comprehensive_report(self, nin, patient_info, temporal_pred, disease_pred):
        report = {
            'patient_info': self._format_patient_info(nin, patient_info),
            'health_metrics_prediction': self._format_health_predictions(temporal_pred),
            'disease_risk_prediction': self._format_disease_predictions(disease_pred),
            'recommendations': self._generate_recommendations(temporal_pred, disease_pred)
        }
        return report
    
    def _format_patient_info(self, nin, patient_info):
        current_date = pd.to_datetime(self.config.current_date)
        birth_date = pd.to_datetime(patient_info['BirthDate'])
        age = (current_date - birth_date).days / 365.25
        
        return {
            'NIN': nin,
            'Age': f"{age:.1f} years",
            'Sex': patient_info['Sex'],
            'Blood_Group': patient_info['BloodGroup'],
            'Location': patient_info['Wilaya'],
            'Occupation': patient_info['Job']
        }
    
    def _format_health_predictions(self, temporal_pred):
        predictions = []
        for step in range(self.config.prediction_horizon):
            step_pred = {}
            for i, metric in enumerate(self.config.target_health_cols):
                if i < temporal_pred.shape[1]:
                    step_pred[metric] = round(temporal_pred[step, i], 2)
            predictions.append({
                'time_step': f"Month {step + 1}",
                'predictions': step_pred
            })
        return predictions
    
    def _format_disease_predictions(self, disease_pred):
        last_step_pred = disease_pred[-1, :]
        predictions = {}
        for i, disease in enumerate(self.config.target_disease_cols):
            if i < last_step_pred.shape[0]:
                risk_score = last_step_pred[i]
                risk_level = self._get_risk_level(risk_score)
                predictions[disease] = {
                    'risk_score': round(risk_score, 3),
                    'risk_level': risk_level,
                    'percentage': f"{risk_score * 100:.1f}%"
                }
        return predictions
    
    def _generate_recommendations(self, temporal_pred, disease_pred):
        recommendations = []
        
        high_risk_diseases = []
        for i, disease in enumerate(self.config.target_disease_cols):
            if i < disease_pred.shape[1]:
                max_risk = disease_pred[-1, i]
                if max_risk > 0.7:
                    high_risk_diseases.append((disease, max_risk))
        
        if high_risk_diseases:
            recommendations.append({
                'category': 'High Risk Alert',
                'priority': 'High',
                'message': f"High risk detected for: {', '.join([d[0] for d in high_risk_diseases])}"
            })
        
        health_trends = []
        for i, metric in enumerate(self.config.target_health_cols):
            if i < temporal_pred.shape[1]:
                trend = temporal_pred[-1, i] - temporal_pred[0, i]
                if abs(trend) > 0.1:
                    direction = "increasing" if trend > 0 else "decreasing"
                    health_trends.append(f"{metric} is {direction}")
        
        if health_trends:
            recommendations.append({
                'category': 'Health Metrics Monitoring',
                'priority': 'Medium',
                'message': f"Monitor: {', '.join(health_trends)}"
            })
        
        recommendations.append({
            'category': 'General Health',
            'priority': 'Low',
            'message': 'Maintain regular check-ups and healthy lifestyle'
        })
        
        return recommendations
    
    def _get_risk_level(self, risk_score):
        if risk_score < 0.3:
            return "Low"
        elif risk_score < 0.7:
            return "Medium"
        else:
            return "High"
    
    def display_patient_report(self, report):
        if report is None:
            return
        
        print("=" * 80)
        print("🏥 COMPREHENSIVE PATIENT HEALTH PREDICTION REPORT")
        print("=" * 80)
        
        print("\n👤 PATIENT INFORMATION")
        print("-" * 40)
        for key, value in report['patient_info'].items():
            print(f"{key:15}: {value}")
        
        print("\n📊 FUTURE HEALTH METRICS PREDICTIONS (Next 6 Months)")
        print("-" * 50)
        health_data = []
        headers = ["Metric"] + [f"Month {i+1}" for i in range(self.config.prediction_horizon)]
        for metric in self.config.target_health_cols:
            row = [metric]
            for step in range(self.config.prediction_horizon):
                if metric in report['health_metrics_prediction'][step]['predictions']:
                    value = report['health_metrics_prediction'][step]['predictions'][metric]
                    row.append(f"{value:.2f}")
                else:
                    row.append("N/A")
            health_data.append(row)
        print(tabulate(health_data, headers=headers, tablefmt="grid"))
        
        print("\n🚨 DISEASE RISK PREDICTIONS (At Month 6)")
        print("-" * 40)
        disease_data = []
        headers = ["Disease", "Risk Score", "Risk Level", "Percentage"]
        for disease, risk_info in report['disease_risk_prediction'].items():
            disease_data.append([
                disease,
                f"{risk_info['risk_score']:.3f}",
                risk_info['risk_level'],
                risk_info['percentage']
            ])
        print(tabulate(disease_data, headers=headers, tablefmt="grid"))
        
        print("\n💡 RECOMMENDATIONS")
        print("-" * 30)
        for rec in report['recommendations']:
            priority_emoji = "🔴" if rec['priority'] == "High" else "🟡" if rec['priority'] == "Medium" else "🟢"
            print(f"  {priority_emoji} [{rec['priority']}] {rec['category']}: {rec['message']}")
        
        print("\n" + "=" * 80)
        print("📅 Report generated on:", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
        print("=" * 80)

def add_patient_analysis_to_model():
    def get_patient_prediction(self, nin, patients, temporal, parents,graphs):
        analyzer = PatientPredictionAnalyzer(self, self.config)
        report = analyzer.get_patient_comprehensive_prediction(nin, patients, temporal, parents,graphs)
        if report:
            analyzer.display_patient_report(report)
            return report
        else:
            return None
    
    def predict_patient_batch(self, nins, patients, temporal, parents,graphs):
        reports = {}
        analyzer = PatientPredictionAnalyzer(self, self.config)
        for nin in nins:
            print(f"\nProcessing patient {nin}...")
            report = analyzer.get_patient_comprehensive_prediction(nin, patients, temporal, parents,graphs)
            if report:
                reports[nin] = report
                print(f"✅ Successfully processed patient {nin}")
            else:
                print(f"❌ Failed to process patient {nin}")
        return reports
    
    def export_patient_report(self, nin, patients, temporal, parents, filename=None):
        analyzer = PatientPredictionAnalyzer(self, self.config)
        report = analyzer.get_patient_comprehensive_prediction(nin, patients, temporal, parents)
        if report and filename:
            import json
            with open(filename, 'w') as f:
                json.dump(report, f, indent=2, default=str)
            print(f"Report exported to {filename}")
        return report
    
    GNNHealthcareModel.get_patient_prediction = get_patient_prediction
    GNNHealthcareModel.predict_patient_batch = predict_patient_batch
    GNNHealthcareModel.export_patient_report = export_patient_report

add_patient_analysis_to_model()

class ModelTrainer:
    def __init__(self, model, config):
        self.model = model
        self.config = config
        self.training_history = {'train_losses': [], 'val_losses': [], 'temporal_losses': [], 'disease_losses': []}

    def train_with_early_stopping(self, train_graphs, val_graphs, patience=10):
        best_val_loss = float('inf')
        patience_counter = 0
        train_loader = DataLoader(train_graphs, batch_size=self.config.batch_size, shuffle=True)
        val_loader = DataLoader(val_graphs, batch_size=self.config.batch_size, shuffle=False)
        latest_checkpoint = None
        for epoch in range(self.config.num_epochs):
            train_loss, temporal_loss, disease_loss = self._train_epoch(train_loader)
            val_loss = self.model.evaluate(val_loader)
            self.training_history['train_losses'].append(train_loss)
            self.training_history['val_losses'].append(val_loss)
            self.training_history['temporal_losses'].append(temporal_loss)
            self.training_history['disease_losses'].append(disease_loss)
            if val_loss < best_val_loss or epoch % 10 == 0:
                if val_loss < best_val_loss:
                    best_val_loss = val_loss
                    patience_counter = 0
                checkpoint_path = f'best_model_epoch_{epoch}.pth'
                self.save_checkpoint(checkpoint_path)
                if latest_checkpoint and os.path.exists(latest_checkpoint):
                    try:
                        os.remove(latest_checkpoint)
                        logger.info(f"Deleted old checkpoint: {latest_checkpoint}")
                    except Exception as e:
                        logger.warning(f"Failed to delete old checkpoint {latest_checkpoint}: {e}")
                latest_checkpoint = os.path.join('/kaggle/working/', checkpoint_path)
            else:
                patience_counter += 1
                if patience_counter >= patience:
                    logger.info(f"Early stopping at epoch {epoch}")
                    break
            if epoch % 10 == 0 or epoch == self.config.num_epochs - 1:
                logger.info(f"Epoch {epoch}: Train Loss={train_loss:.4f}, Val Loss={val_loss:.4f}")
        return self.training_history

    def _train_epoch(self, train_loader):
        self.model.model.train()
        total_loss = 0
        temporal_loss_sum = 0
        disease_loss_sum = 0
        for batch in train_loader:
            self.model.optimizer.zero_grad()
            temporal_pred, disease_pred = self.model.model(batch.temporal_data.to(self.model.device), batch.to(self.model.device))
            temporal_loss = F.mse_loss(temporal_pred, batch.targets_health.to(self.model.device))
            disease_loss = F.binary_cross_entropy(disease_pred, batch.targets_disease.to(self.model.device))
            total_loss_batch = (self.config.alpha * temporal_loss + self.config.beta * disease_loss)
            total_loss_batch.backward()
            self.model.optimizer.step()
            total_loss += total_loss_batch.item()
            temporal_loss_sum += temporal_loss.item()
            disease_loss_sum += disease_loss.item()
        return (total_loss / len(train_loader), temporal_loss_sum / len(train_loader), disease_loss_sum / len(train_loader))

    def save_checkpoint(self, path):
        try:
            save_dir = '/kaggle/working/'
            if not os.path.exists(save_dir):
                os.makedirs(save_dir)
            full_path = os.path.join(save_dir, os.path.basename(path))
            stat = shutil.disk_usage(save_dir)
            free_space = stat.free / (1024 ** 3)
            logger.info(f"Free disk space: {free_space:.2f} GB")
            if free_space < 1:
                logger.warning(f"Low disk space ({free_space:.2f} GB). Skipping checkpoint save.")
                return
            logger.info(f"Saving checkpoint to {full_path}")
            torch.save({
                'model_state_dict': self.model.model.state_dict(),
                'optimizer_state_dict': self.model.optimizer.state_dict()
            }, full_path)
            logger.info(f"Checkpoint saved successfully to {full_path}")
        except Exception as e:
            logger.error(f"Failed to save checkpoint to {path}: {e}")

def run_healthcare_prediction_pipeline(patients_path, temporal_path, parents_path, model_save_path="healthcare_model.pth", prediction_horizon=6):
    logger.info(f"Starting Healthcare Prediction Pipeline with SMOTE - Predicting {prediction_horizon} future steps")
    config = Config()
    config.apply_smote = True
    config.smote_strategy = 'minority'
    config.smote_method = 'standard'
    config.smote_k_neighbors = 5
    config.min_samples_for_smote = 10
    config.prediction_horizon = prediction_horizon
    model = GNNHealthcareModel(config)
    patients, temporal, parents = model.load_data(patients_path, temporal_path, parents_path)
    train_graphs, test_graphs = model.prepare_data(patients, temporal, parents)
    logger.info(f"Training graphs: {len(train_graphs)}, Test graphs: {len(test_graphs)}")
    trainer = ModelTrainer(model, config)
    training_history = trainer.train_with_early_stopping(train_graphs, test_graphs)
    regression_metrics, classification_metrics = model.evaluate_with_metrics(test_graphs)
    predictions = model.predict(patients, temporal, parents)
    model.save_model(model_save_path)
    results = {'training_history': training_history, 'regression_metrics': regression_metrics, 'classification_metrics': classification_metrics, 'predictions': predictions, 'prediction_horizon': prediction_horizon}
    logger.info("Pipeline completed successfully")
    logger.info(f"Generated file: {model_save_path}")
    return results