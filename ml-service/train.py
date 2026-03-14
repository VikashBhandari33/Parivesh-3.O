import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.metrics import accuracy_score, r2_score, classification_report
import joblib
import os

print("--- CECB ML Training Pipeline ---")
csv_path = "../dataset/cecb_proponent_dataset_large.csv"

if not os.path.exists(csv_path):
    print(f"Dataset not found at {csv_path}")
    exit(1)

print(f"Dataset found at {csv_path}. Loading data...")
df = pd.read_csv(csv_path)

print(f"Loaded {len(df)} records. Processing...")

# 1. Feature Engineering
# Target 1: Is Approved? (Binary Classification)
df['is_approved'] = df['approval_status'].str.strip() == 'Approved'
df['is_approved'] = df['is_approved'].astype(int)

# Target 2: Days to Approval (Regression)
# We only train this on approved applications
df['submission_date'] = pd.to_datetime(df['submission_date'])
df['approval_date'] = pd.to_datetime(df['approval_date'])
df['approval_days'] = (df['approval_date'] - df['submission_date']).dt.days

# Features
# Handle missing values if any
df['area_hectare'] = df['area_hectare'].fillna(df['area_hectare'].median())
df['environmental_risk_score'] = df['environmental_risk_score'].fillna(df['environmental_risk_score'].median())
df['eds_count'] = df['eds_count'].fillna(0)

# One-hot encode categorical variables
categorical_features = ['project_type', 'project_location']
df_encoded = pd.get_dummies(df, columns=categorical_features, drop_first=False)

# Select X (features)
features = ['area_hectare', 'environmental_risk_score', 'eds_count'] + \
           [col for col in df_encoded.columns if col.startswith('project_type_') or col.startswith('project_location_')]

X = df_encoded[features]
y_class = df_encoded['is_approved']

# Save the expected column layout so the API knows which features exist
joblib.dump(features, 'model_columns.pkl')
print(f"Saved {len(features)} feature columns schema to 'model_columns.pkl'.")

# 2. Train Classification Model (Approval Chance)
print("\n--- Training Approval Classifier (Random Forest) ---")
X_train_c, X_test_c, y_train_c, y_test_c = train_test_split(X, y_class, test_size=0.2, random_state=42)

clf = RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42)
clf.fit(X_train_c, y_train_c)

# Evaluate Classifier
y_pred_c = clf.predict(X_test_c)
acc = accuracy_score(y_test_c, y_pred_c)
print(f"Classifier Accuracy: {acc * 100:.2f}%")
print("Classification Report:")
print(classification_report(y_test_c, y_pred_c))

joblib.dump(clf, 'approval_classifier.pkl')
print("Saved model to 'approval_classifier.pkl'.")

# 3. Train Regression Model (Estimated Days)
print("\n--- Training Days Regressor (Random Forest) ---")
# Only train regressor on actually approved datasets where days is valid
df_approved = df_encoded[df_encoded['is_approved'] == 1].dropna(subset=['approval_days'])
X_reg = df_approved[features]
y_reg = df_approved['approval_days']

X_train_r, X_test_r, y_train_r, y_test_r = train_test_split(X_reg, y_reg, test_size=0.2, random_state=42)

reg = RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42)
reg.fit(X_train_r, y_train_r)

# Evaluate Regressor
y_pred_r = reg.predict(X_test_r)
r2 = r2_score(y_test_r, y_pred_r)
print(f"Regressor R^2 Score (Accuracy of timeline): {r2:.4f}")

joblib.dump(reg, 'days_regressor.pkl')
print("Saved model to 'days_regressor.pkl'.")

print("\n--- ML Pipeline Training Complete! ---")
