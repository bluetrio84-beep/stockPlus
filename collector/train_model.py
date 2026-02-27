import pymysql
import pandas as pd
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from sklearn.preprocessing import MinMaxScaler
import joblib
import xgboost as xgb
from ai_engine import StockLSTM, StockTCN 

# DB 설정
DB_CONFIG = {
    'host': '127.0.0.1', 'port': 3306, 'user': 'lms', 'password': 'cnbas.2015', 'database': 'stockplus', 'charset': 'utf8mb4'
}

def load_and_preprocess_data():
    print(">>> [Train] Loading High-Quality Daily Investor Data from DB...")
    conn = pymysql.connect(**DB_CONFIG)
    try:
        # [v15.6] 일자별 수급 테이블 기반으로 5피처 학습 데이터 원복
        query = """
            SELECT stock_code, close_price, 
                   individual_net_buy, foreign_net_buy, institution_net_buy, volume 
            FROM daily_stock_investor 
            ORDER BY stock_code, bsop_date ASC
        """
        df = pd.read_sql(query, conn)
        
        if len(df) < 500:
            print(">>> [Error] Not enough data in daily_stock_investor to train.")
            return None, None, None

        # 5개 피처 (개인 순매수 포함)
        features = ['close_price', 'individual_net_buy', 'foreign_net_buy', 'institution_net_buy', 'volume']
        
        scaler = MinMaxScaler()
        scaler.fit(df[features].values.astype(float))
        joblib.dump(scaler, 'stock_scaler.gz')

        window_size = 5
        X, y = [], []

        for code in df['stock_code'].unique():
            stock_data = df[df['stock_code'] == code][features].values.astype(float)
            if len(stock_data) <= window_size: continue
            
            scaled_stock_data = scaler.transform(stock_data)
            
            for i in range(len(scaled_stock_data) - window_size):
                X.append(scaled_stock_data[i:i + window_size])
                y.append(scaled_stock_data[i + window_size, 0])

        return np.array(X), np.array(y), scaler
    finally:
        conn.close()

def train():
    X, y, scaler = load_and_preprocess_data()
    if X is None or len(X) == 0: 
        print(">>> [Error] No training sequences generated.")
        return

    X_tensor = torch.FloatTensor(X)
    y_tensor = torch.FloatTensor(y).view(-1, 1)

    # 피처 수가 5개로 원복됨
    input_size = 5
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    X_tensor, y_tensor = X_tensor.to(device), y_tensor.to(device)

    print(f">>> [Train] Starting 3-Model Ensemble Training with {len(X)} samples...")
    epochs = 100
    criterion = nn.MSELoss()

    # --- 1. LSTM Training ---
    print("--- [1/3] Training LSTM ---")
    lstm_model = StockLSTM(input_size=input_size, hidden_size=64, num_layers=2, output_size=1).to(device)
    optimizer_lstm = optim.Adam(lstm_model.parameters(), lr=0.001)

    for epoch in range(epochs):
        lstm_model.train()
        optimizer_lstm.zero_grad()
        outputs = lstm_model(X_tensor)
        loss = criterion(outputs, y_tensor)
        loss.backward()
        optimizer_lstm.step()
        if (epoch + 1) % 50 == 0:
            print(f"LSTM Epoch [{epoch+1}/{epochs}], Loss: {loss.item():.6f}")

    torch.save(lstm_model.state_dict(), "stock_lstm_v1.pth")
    print(">>> [Success] LSTM saved as 'stock_lstm_v1.pth'")

    # --- 2. TCN Training ---
    print("\n--- [2/3] Training TCN ---")
    tcn_model = StockTCN(input_size=input_size).to(device)
    optimizer_tcn = optim.Adam(tcn_model.parameters(), lr=0.001)

    for epoch in range(epochs):
        tcn_model.train()
        optimizer_tcn.zero_grad()
        outputs = tcn_model(X_tensor)
        loss = criterion(outputs, y_tensor)
        loss.backward()
        optimizer_tcn.step()
        if (epoch + 1) % 50 == 0:
            print(f"TCN Epoch [{epoch+1}/{epochs}], Loss: {loss.item():.6f}")

    torch.save(tcn_model.state_dict(), "stock_tcn_v1.pth")
    print(">>> [Success] TCN saved as 'stock_tcn_v1.pth'")

    # --- 3. XGBoost Training ---
    print("\n--- [3/3] Training XGBoost ---")
    # XGBoost는 2D 입력이 필요하므로 (샘플수, 시퀀스길이 * 피처수)로 변환
    X_xgb = X.reshape(X.shape[0], -1)
    xgb_model = xgb.XGBRegressor(n_estimators=100, max_depth=4, learning_rate=0.05, objective='reg:squarederror')
    xgb_model.fit(X_xgb, y)
    
    xgb_model.save_model("stock_xgb_v1.json")
    print(">>> [Success] XGBoost saved as 'stock_xgb_v1.json'")

    print("\n>>> [Success] All Ensemble Models Trained Successfully!")

if __name__ == "__main__":
    train()
