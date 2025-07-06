import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.model_selection import train_test_split, TimeSeriesSplit
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from sklearn.preprocessing import LabelEncoder
import xgboost as xgb
from datetime import datetime, timedelta
import warnings
import calendar
import os
import joblib
import multiprocessing

warnings.filterwarnings('ignore')

class HealthForecastingModel:
    def __init__(self, data_path=None, df=None, save_dir='plots'):
        """
        Initialize the forecasting model
        
        Parameters:
        data_path (str): Path to the CSV file
        df (DataFrame): DataFrame if data is already loaded
        save_dir (str): Directory to save all plots and models
        """
        if df is not None:
            self.df = df.copy()
        elif data_path:
            self.df = pd.read_csv(data_path)
        else:
            raise ValueError("Either data_path or df must be provided")
        
        self.diseases = ['Hypertension', 'Diabète_type_2', 'Obésité', 'Asthme', 
                        'Cancer_du_poumon', 'Cancer_du_sein', 'Cancer_de_la_prostate', 
                        'Maladie_cardiovasculaire']
        
        self.models = {}
        self.scores = {}
        self.training_history = {}
        self.wilaya_encoder = LabelEncoder()
        self.save_dir = save_dir
        
        os.makedirs(self.save_dir, exist_ok=True)
        
        self._prepare_data()
    
    def load_models(self, model_dir):
        """Load pre-trained XGBoost models from a directory"""
        for disease in self.diseases:
            model_file = os.path.join(model_dir, f'xgboost_{disease}.pkl')
            if os.path.exists(model_file):
                self.models[disease] = joblib.load(model_file)
            else:
                raise FileNotFoundError(f"Model file not found: {model_file}")
    
    def _prepare_data(self):
        """Prepare and feature engineer the data"""
        self.df['date'] = pd.to_datetime(self.df['date'])
        self.df = self.df.sort_values(['date', 'wilaya_code']).reset_index(drop=True)
        
        self.df['year'] = self.df['date'].dt.year
        self.df['month'] = self.df['date'].dt.month
        self.df['quarter'] = self.df['date'].dt.quarter
        self.df['day_of_year'] = self.df['date'].dt.dayofyear
        self.df['is_summer'] = ((self.df['month'] >= 6) & (self.df['month'] <= 8)).astype(int)
        self.df['is_winter'] = ((self.df['month'] <= 2) | (self.df['month'] == 12)).astype(int)
        
        self.df['wilaya_encoded'] = self.wilaya_encoder.fit_transform(self.df['wilaya_code'])
        
        for disease in self.diseases:
            for wilaya in self.df['wilaya_code'].unique():
                wilaya_mask = self.df['wilaya_code'] == wilaya
                wilaya_data = self.df[wilaya_mask].copy()
                
                for lag in [1, 3, 6, 12]:
                    lag_col = f'{disease}_lag_{lag}'
                    wilaya_data[lag_col] = wilaya_data[disease].shift(lag)
                
                for window in [3, 6, 12]:
                    wilaya_data[f'{disease}_rolling_mean_{window}'] = wilaya_data[disease].rolling(window=window).mean()
                    wilaya_data[f'{disease}_rolling_std_{window}'] = wilaya_data[disease].rolling(window=window).std()
                
                self.df.loc[wilaya_mask, [col for col in wilaya_data.columns if col not in self.df.columns]] = wilaya_data[[col for col in wilaya_data.columns if col not in self.df.columns]]
        
        self.df = self.df.fillna(method='bfill').fillna(0)
        
        print(f"Data prepared successfully. Shape: {self.df.shape}")
        print(f"Date range: {self.df['date'].min()} to {self.df['date'].max()}")
        print(f"Number of wilayas: {self.df['wilaya_code'].nunique()}")
    
    def _create_features(self, disease):
        """Create feature matrix for a specific disease"""
        feature_cols = ['year', 'month', 'quarter', 'day_of_year', 'is_summer', 'is_winter', 'wilaya_encoded']
        lag_cols = [col for col in self.df.columns if f'{disease}_lag_' in col]
        rolling_cols = [col for col in self.df.columns if f'{disease}_rolling_' in col]
        other_diseases = [d for d in self.diseases if d != disease]
        
        all_features = feature_cols + lag_cols + rolling_cols + other_diseases
        return self.df[all_features], self.df[disease]
    
    def train_models(self, test_size=0.2, random_state=42):
        """Train XGBoost models for each disease with validation tracking and save them"""
        print("Training XGBoost models for each disease...")
        overall_predictions = []
        overall_actuals = []
        
        for disease in self.diseases:
            print(f"\nTraining model for {disease}...")
            X, y = self._create_features(disease)
            
            split_idx = int(len(X) * (1 - test_size))
            X_train, X_test = X[:split_idx], X[split_idx:]
            y_train, y_test = y[:split_idx], y[split_idx:]
            
            val_split_idx = int(len(X_train) * 0.8)
            X_train_sub, X_val = X_train[:val_split_idx], X_train[val_split_idx:]
            y_train_sub, y_val = y_train[:val_split_idx], y_train[val_split_idx:]
            
            model = xgb.XGBRegressor(
                n_estimators=500,
                max_depth=6,
                learning_rate=0.01,
                subsample=0.6,
                colsample_bytree=0.6,
                random_state=random_state,
                n_jobs=-1,
                early_stopping_rounds=50
            )
            
            model.fit(
                X_train_sub, y_train_sub,
                eval_set=[(X_train_sub, y_train_sub), (X_val, y_val)],
                eval_metric='rmse',
                verbose=False
            )
            
            results = model.evals_result()
            self.training_history[disease] = {
                'train_rmse': results['validation_0']['rmse'],
                'val_rmse': results['validation_1']['rmse']
            }
            
            final_model = xgb.XGBRegressor(
                n_estimators=len(results['validation_0']['rmse']),
                max_depth=6,
                learning_rate=0.01,
                subsample=0.6,
                colsample_bytree=0.1,
                random_state=random_state,
                n_jobs=-1
            )
            
            final_model.fit(X_train, y_train)
            
            self.models[disease] = final_model
            
            model_file = os.path.join(self.save_dir, f'xgboost_{disease}.pkl')
            joblib.dump(final_model, model_file)
            print(f"Model for {disease} saved to {model_file}")
            
            y_pred_train = final_model.predict(X_train)
            y_pred_test = final_model.predict(X_test)
            
            train_mse = mean_squared_error(y_train, y_pred_train)
            train_mae = mean_absolute_error(y_train, y_pred_train)
            train_r2 = r2_score(y_train, y_pred_train)
            test_mse = mean_squared_error(y_test, y_pred_test)
            test_mae = mean_absolute_error(y_test, y_pred_test)
            test_r2 = r2_score(y_test, y_pred_test)
            
            self.scores[disease] = {
                'train_mse': train_mse,
                'train_mae': train_mae,
                'train_r2': train_r2,
                'test_mse': test_mse,
                'test_mae': test_mae,
                'test_r2': test_r2,
                'y_test': y_test,
                'y_pred_test': y_pred_test
            }
            
            overall_predictions.extend(y_pred_test)
            overall_actuals.extend(y_test)
            
            print(f"Test MSE: {test_mse:.2f}, Test MAE: {test_mae:.2f}, Test R2: {test_r2:.4f}")
        
        overall_mse = mean_squared_error(overall_actuals, overall_predictions)
        overall_mae = mean_absolute_error(overall_actuals, overall_predictions)
        overall_r2 = r2_score(overall_actuals, overall_predictions)
        
        self.overall_scores = {
            'mse': overall_mse,
            'mae': overall_mae,
            'r2': overall_r2
        }
        
        print(f"\nOverall Performance:")
        print(f"MSE: {overall_mse:.2f}, MAE: {overall_mae:.2f}, R2: {overall_r2:.4f}")
    
    @staticmethod
    def compute_disease_predictions(args):
        disease, year, df, model, wilaya_encoder, diseases = args
        start_date = datetime(year, 1, 1)
        dates = [start_date + timedelta(days=30*i) for i in range(12)]
        all_feature_vectors = []
        wilaya_month_map = []
        for wilaya_code in df['wilaya_code'].unique():
            wilaya_encoded = wilaya_encoder.transform([wilaya_code])[0]
            wilaya_data = df[df['wilaya_code'] == wilaya_code].copy()
            last_values = wilaya_data[diseases].iloc[-12:].values
            for month_idx, date in enumerate(dates):
                features = {
                    'year': date.year,
                    'month': date.month,
                    'quarter': (date.month - 1) // 3 + 1,
                    'day_of_year': date.timetuple().tm_yday,
                    'is_summer': 1 if 6 <= date.month <= 8 else 0,
                    'is_winter': 1 if date.month <= 2 or date.month == 12 else 0,
                    'wilaya_encoded': wilaya_encoded
                }
                disease_idx = diseases.index(disease)
                for lag in [1, 3, 6, 12]:
                    if len(last_values) >= lag:
                        recent_values = last_values[-lag:, disease_idx]
                        features[f'{disease}_lag_{lag}'] = np.mean(recent_values)
                    else:
                        features[f'{disease}_lag_{lag}'] = 0
                for window in [3, 6, 12]:
                    recent_values = last_values[-window:, disease_idx]
                    features[f'{disease}_rolling_mean_{window}'] = np.mean(recent_values)
                    features[f'{disease}_rolling_std_{window}'] = np.std(recent_values)
                for other_disease in diseases:
                    if other_disease != disease:
                        other_idx = diseases.index(other_disease)
                        features[other_disease] = last_values[-1, other_idx]
                feature_names = model.get_booster().feature_names
                feature_vector = [features.get(feature_name, 0) for feature_name in feature_names]
                all_feature_vectors.append(feature_vector)
                wilaya_month_map.append((str(wilaya_code), str(date.month)))
        predictions_array = model.predict(np.array(all_feature_vectors))
        result = {}
        for (wilaya, month), prediction in zip(wilaya_month_map, predictions_array):
            if wilaya not in result:
                result[wilaya] = {}
            result[wilaya][month] = round(max(0, prediction), 2)
        return disease, result

    def predict_future(self, year):
        print(f"Generating predictions for year {year}...")
        with multiprocessing.Pool() as pool:
            args = [(disease, year, self.df, self.models[disease], self.wilaya_encoder, self.diseases) for disease in self.diseases]
            results = pool.map(HealthForecastingModel.compute_disease_predictions, args)
        predictions = {disease: result for disease, result in results}
        return predictions
    
    def plot_training_history(self):
        """Plot training and validation loss for each disease"""
        for disease in self.diseases:
            if disease in self.training_history:
                plt.figure(figsize=(10, 6))
                plt.plot(self.training_history[disease]['train_rmse'], label='Training RMSE')
                plt.plot(self.training_history[disease]['val_rmse'], label='Validation RMSE')
                plt.title(f'Training History for {disease}')
                plt.xlabel('Epoch')
                plt.ylabel('RMSE')
                plt.legend()
                plt.grid(True)
                plot_file = os.path.join(self.save_dir, f'training_history_{disease}.png')
                plt.savefig(plot_file)
                plt.close()
                print(f"Training history plot for {disease} saved to {plot_file}")
    
    def plot_predictions_vs_actual(self):
        """Plot predictions vs actual values for each disease"""
        for disease in self.diseases:
            if disease in self.scores:
                y_test = self.scores[disease]['y_test']
                y_pred_test = self.scores[disease]['y_pred_test']
                
                plt.figure(figsize=(10, 6))
                plt.scatter(y_test, y_pred_test, alpha=0.5)
                plt.plot([y_test.min(), y_test.max()], [y_test.min(), y_test.max()], 'r--', lw=2)
                plt.title(f'Predictions vs Actual for {disease}')
                plt.xlabel('Actual Values')
                plt.ylabel('Predicted Values')
                plt.grid(True)
                plot_file = os.path.join(self.save_dir, f'pred_vs_actual_{disease}.png')
                plt.savefig(plot_file)
                plt.close()
                print(f"Predictions vs Actual plot for {disease} saved to {plot_file}")
    
    def plot_feature_importance(self):
        """Plot feature importance for each disease model"""
        for disease in self.diseases:
            if disease in self.models:
                model = self.models[disease]
                plt.figure(figsize=(10, 6))
                xgb.plot_importance(model, max_num_features=10)
                plt.title(f'Feature Importance for {disease}')
                plot_file = os.path.join(self.save_dir, f'feature_importance_{disease}.png')
                plt.savefig(plot_file)
                plt.close()
                print(f"Feature importance plot for {disease} saved to {plot_file}")
    
    def get_model_summary(self):
        """Return a summary of model performance"""
        summary = {}
        for disease in self.diseases:
            if disease in self.scores:
                summary[disease] = {
                    'train_mse': self.scores[disease]['train_mse'],
                    'train_mae': self.scores[disease]['train_mae'],
                    'train_r2': self.scores[disease]['train_r2'],
                    'test_mse': self.scores[disease]['test_mse'],
                    'test_mae': self.scores[disease]['test_mae'],
                    'test_r2': self.scores[disease]['test_r2']
                }
        summary['overall'] = self.overall_scores
        return summary
