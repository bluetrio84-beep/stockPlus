import pymysql
import pandas as pd
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from sklearn.preprocessing import MinMaxScaler
import joblib
from ai_engine import StockLSTM 

# DB 설정
DB_CONFIG = {
    'host': '127.0.0.1', 'port': 3306, 'user': 'lms', 'password': 'cnbas.2015', 'database': 'stockplus', 'charset': 'utf8mb4'
}

def load_and_preprocess_data():
    print(">>> [Train] Loading Daily Investor Data from DB...")
    conn = pymysql.connect(**DB_CONFIG)
    try:
        # stock_code순, bsop_date순으로 정렬해서 가져옴
        query = "SELECT stock_code, close_price, individual_net_buy, foreign_net_buy, institution_net_buy, volume FROM daily_stock_investor ORDER BY stock_code, bsop_date ASC"
        df = pd.read_sql(query, conn)
        
        if len(df) < 100:
            print(">>> [Error] Not enough data to train.")
            return None, None, None

        features = ['close_price', 'individual_net_buy', 'foreign_net_buy', 'institution_net_buy', 'volume']
        
        # 전체 데이터에 대한 스케일러 학습 및 저장
        scaler = MinMaxScaler()
        scaler.fit(df[features].values.astype(float))
        joblib.dump(scaler, 'stock_scaler.gz')

        window_size = 5
        X, y = [], []

        # [핵심 개선] 종목별로 루프를 돌며 시퀀스 생성 (데이터 섞임 방지)
        for code in df['stock_code'].unique():
            stock_data = df[df['stock_code'] == code][features].values.astype(float)
            if len(stock_data) <= window_size: continue
            
            # 해당 종목 데이터만 정규화
            scaled_stock_data = scaler.transform(stock_data)
            
            for i in range(len(scaled_stock_data) - window_size):
                X.append(scaled_stock_data[i:i + window_size])
                y.append(scaled_stock_data[i + window_size, 0]) # 다음날 종가 예측

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

    input_size = 5
    model = StockLSTM(input_size=input_size, hidden_size=64, num_layers=2, output_size=1)
    
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    model.to(device)
    X_tensor, y_tensor = X_tensor.to(device), y_tensor.to(device)

    criterion = nn.MSELoss()
    optimizer = optim.Adam(model.parameters(), lr=0.001)

    print(f">>> [Train] Starting HIGH-QUALITY Training with {len(X)} samples...")
    epochs = 100
    for epoch in range(epochs):
        model.train()
        optimizer.zero_grad()
        outputs = model(X_tensor)
        loss = criterion(outputs, y_tensor)
        loss.backward()
        optimizer.step()
        if (epoch + 1) % 20 == 0:
            print(f"Epoch [{epoch+1}/{epochs}], Loss: {loss.item():.6f}")

    torch.save(model.state_dict(), "stock_lstm_v1.pth")
    print(">>> [Success] Smart Model saved as 'stock_lstm_v1.pth'")

if __name__ == "__main__":
    train()
