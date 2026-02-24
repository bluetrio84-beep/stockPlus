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
        # 전 종목의 일별 데이터를 날짜순으로 가져옴
        query = "SELECT stock_code, close_price, individual_net_buy, foreign_net_buy, institution_net_buy, volume FROM daily_stock_investor ORDER BY bsop_date ASC"
        df = pd.read_sql(query, conn)
        
        if len(df) < 100:
            print(">>> [Error] Not enough data to train. Current count:", len(df))
            return None, None, None

        # 피처 선정 (종가, 개인, 외인, 기관, 거래량)
        features = ['close_price', 'individual_net_buy', 'foreign_net_buy', 'institution_net_buy', 'volume']
        data = df[features].values.astype(float)

        # 1. 정규화 (MinMax Scaling)
        scaler = MinMaxScaler()
        scaled_data = scaler.fit_transform(data)
        # 스케일러 저장 (나중에 추론 시 사용)
        joblib.dump(scaler, 'stock_scaler.gz')

        # 2. 시퀀스 데이터 생성 (Window Size: 5 - 일주일간의 흐름 학습)
        window_size = 5
        X, y = [], []
        for i in range(len(scaled_data) - window_size):
            X.append(scaled_data[i:i + window_size])
            # 다음 날 종가의 상승 여부를 예측 (단순 수치 예측보다 방향성 예측이 실전적임)
            # 여기서는 다음 날 종가의 스케일링된 수치를 목표값으로 설정
            y.append(scaled_data[i + window_size, 0]) 

        return np.array(X), np.array(y), scaler
    finally:
        conn.close()

def train():
    X, y, scaler = load_and_preprocess_data()
    if X is None: return

    # 텐서 변환
    X_tensor = torch.FloatTensor(X)
    y_tensor = torch.FloatTensor(y).view(-1, 1)

    # 모델 설정 (입력 피처 5개)
    input_size = 5
    model = StockLSTM(input_size=input_size, hidden_size=64, num_layers=2, output_size=1)
    
    # 만약 GPU 사용 가능하다면 이동 (옵션)
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    model.to(device)
    X_tensor = X_tensor.to(device)
    y_tensor = y_tensor.to(device)

    criterion = nn.MSELoss()
    optimizer = optim.Adam(model.parameters(), lr=0.001)

    print(f">>> [Train] Starting LSTM Training with {len(X)} samples...")
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

    # 모델 저장
    torch.save(model.state_dict(), "stock_lstm_v1.pth")
    print(">>> [Success] Model saved as 'stock_lstm_v1.pth'")

if __name__ == "__main__":
    train()
