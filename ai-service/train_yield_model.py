import os
import json
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from sklearn.ensemble import RandomForestRegressor
from xgboost import XGBRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import joblib

# Paths
DATA_PATH = '../datasets/crop_yield.csv'
MODEL_DIR = 'models'
REPORT_DIR = '../reports'
os.makedirs(MODEL_DIR, exist_ok=True)
os.makedirs(REPORT_DIR, exist_ok=True)

def evaluate_model(model, X, y, name):
    preds = model.predict(X)
    mae = mean_absolute_error(y, preds)
    rmse = np.sqrt(mean_squared_error(y, preds))
    r2 = r2_score(y, preds)
    return mae, rmse, r2, preds

def main():
    print("Loading dataset...")
    # Load dataset
    df = pd.read_csv(DATA_PATH)
    
    # Feature columns and Target
    cat_cols = ['crop', 'season', 'state']
    num_cols = ['area', 'fertilizer', 'pesticide', 'year']
    target_col = 'yield'
    
    X = df[cat_cols + num_cols]
    y = df[target_col]
    
    # 80/10/10 Split
    # First split 80% train, 20% temp
    X_train, X_temp, y_train, y_temp = train_test_split(X, y, test_size=0.20, random_state=42)
    # Split temp into 50% val, 50% test (each 10% of total)
    X_val, X_test, y_val, y_test = train_test_split(X_temp, y_temp, test_size=0.50, random_state=42)
    
    print(f"Train size: {len(X_train)}, Validation size: {len(X_val)}, Test size: {len(X_test)}")
    
    # Check for temporal leakage
    # If the train set contains future years compared to the test set, this is temporal leakage
    train_years = set(X_train['year'])
    test_years = set(X_test['year'])
    if max(train_years) >= min(test_years):
        print("WARNING: Possible temporal leakage detected! The random split mixes historical and future data.")
        print("Random splitting on chronological data allows models to learn future trends to predict the past.")
        print("However, maintaining random split as per the strict instruction.")

    # Preprocessing
    # One-hot encoding for categorical variables. No scaling for numerical variables as requested.
    preprocessor = ColumnTransformer(
        transformers=[
            ('cat', OneHotEncoder(handle_unknown='ignore', sparse_output=False), cat_cols)
        ],
        remainder='passthrough'
    )
    
    # Model A: Random Forest
    print("\nTraining Model A: Random Forest Regressor...")
    rf_pipeline = Pipeline(steps=[('preprocessor', preprocessor),
                                  ('model', RandomForestRegressor(random_state=42, n_jobs=-1))])
    rf_pipeline.fit(X_train, y_train)
    
    # Model B: XGBoost
    print("Training Model B: XGBoost Regressor...")
    xgb_pipeline = Pipeline(steps=[('preprocessor', preprocessor),
                                   ('model', XGBRegressor(random_state=42, n_jobs=-1))])
    xgb_pipeline.fit(X_train, y_train)
    
    # Validation Evaluation
    rf_mae, rf_rmse, rf_r2, _ = evaluate_model(rf_pipeline, X_val, y_val, "Random Forest")
    xgb_mae, xgb_rmse, xgb_r2, _ = evaluate_model(xgb_pipeline, X_val, y_val, "XGBoost")
    
    print("\n--- Validation Results ---")
    print(f"{'Model':<15} | {'Val MAE':<15} | {'Val RMSE':<15} | {'Val R2':<15}")
    print(f"{'Random Forest':<15} | {rf_mae:<15.4f} | {rf_rmse:<15.4f} | {rf_r2:<15.4f}")
    print(f"{'XGBoost':<15} | {xgb_mae:<15.4f} | {xgb_rmse:<15.4f} | {xgb_r2:<15.4f}")
    
    # Select best model based on Validation R2
    if xgb_r2 > rf_r2:
        best_model = xgb_pipeline
        best_name = "XGBoost"
        best_val_metrics = (xgb_mae, xgb_rmse, xgb_r2)
    else:
        best_model = rf_pipeline
        best_name = "Random Forest"
        best_val_metrics = (rf_mae, rf_rmse, rf_r2)
        
    print(f"\nSelected Model: {best_name} (Based on validation performance)")
    
    # Check for overfitting
    train_mae, train_rmse, train_r2, _ = evaluate_model(best_model, X_train, y_train, "Train")
    print("\n--- Overfitting Analysis (Best Model) ---")
    print(f"Train R2: {train_r2:.4f} vs Validation R2: {best_val_metrics[2]:.4f}")
    
    # Final Test Evaluation
    test_mae, test_rmse, test_r2, test_preds = evaluate_model(best_model, X_test, y_test, "Test")
    print("\n--- Final Test Results ---")
    print(f"Test MAE:  {test_mae:.4f}")
    print(f"Test RMSE: {test_rmse:.4f}")
    print(f"Test R2:   {test_r2:.4f}")
    
    # Save Model
    model_path = os.path.join(MODEL_DIR, 'yield_model.joblib')
    joblib.dump(best_model, model_path)
    
    # Feature Importance Plot
    print("\nGenerating Feature Importance Plot...")
    
    # Extract feature names from preprocessor
    # For one-hot encoded features, get the feature names
    cat_encoder = best_model.named_steps['preprocessor'].named_transformers_['cat']
    encoded_cat_cols = list(cat_encoder.get_feature_names_out(cat_cols))
    all_feature_names = encoded_cat_cols + num_cols
    
    # Get feature importances
    if best_name == "XGBoost":
        importances = best_model.named_steps['model'].feature_importances_
    else:
        importances = best_model.named_steps['model'].feature_importances_
        
    feat_imp_df = pd.DataFrame({
        'Feature': all_feature_names,
        'Importance': importances
    }).sort_values(by='Importance', ascending=False)
    
    # Plot top 10
    top_10 = feat_imp_df.head(10)
    plt.figure(figsize=(10, 6))
    plt.barh(top_10['Feature'][::-1], top_10['Importance'][::-1], color='skyblue')
    plt.title(f'Top 10 Feature Importances ({best_name})')
    plt.xlabel('Importance')
    plt.ylabel('Feature')
    plt.tight_layout()
    plt.savefig(os.path.join(REPORT_DIR, 'crop_yield_feature_importance.png'))
    
    # Save Metadata
    metadata = {
        'model_type': best_name,
        'target_column': target_col,
        'original_feature_names': cat_cols + num_cols,
        'encoded_feature_information': f"One-Hot Encoded columns: {cat_cols}. No scaling applied to {num_cols}.",
        'random_seed': 42,
        'train_size': len(X_train),
        'validation_size': len(X_val),
        'test_size': len(X_test),
        'validation_mae': float(best_val_metrics[0]),
        'validation_rmse': float(best_val_metrics[1]),
        'validation_r2': float(best_val_metrics[2]),
        'test_mae': float(test_mae),
        'test_rmse': float(test_rmse),
        'test_r2': float(test_r2),
    }
    
    with open(os.path.join(MODEL_DIR, 'yield_model_metadata.json'), 'w') as f:
        json.dump(metadata, f, indent=4)
        
    # Generate 10 Example Predictions
    example_indices = np.random.choice(len(X_test), 10, replace=False)
    X_test_examples = X_test.iloc[example_indices]
    y_test_examples = y_test.iloc[example_indices]
    pred_examples = test_preds[example_indices]
    
    print("\n--- Example Predictions (Test Set) ---")
    print(f"{'Actual Yield':<15} | {'Predicted Yield':<15} | {'Absolute Error':<15}")
    for actual, pred in zip(y_test_examples, pred_examples):
        print(f"{actual:<15.4f} | {pred:<15.4f} | {abs(actual - pred):<15.4f}")

    print("\nTraining Complete! Model saved as yield_model.joblib.")

if __name__ == "__main__":
    main()
