import pymysql
import pandas as pd
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from sklearn.preprocessing import MinMaxScaler
from ai_engine import StockLSTM # 기존에 정의한 모델 클래스 재사용

# DB 설정
DB_CONFIG = {
    'host': '127.0.0.1', 'port': 3306, 'user': 'lms', 'password': 'cnbas.2015', 'database': 'stockplus', 'charset': 'utf8mb4'
}

def load_and_preprocess_data():
    print(">>> [Train] Loading data from DB...")
    conn = pymysql.connect(**DB_CONFIG)
    try:
        # 특정 업종(예: '생물공학') 데이터로 테스트 학습 진행
        query = "SELECT change_rate, trade_volume FROM industry_history WHERE industry_name = '생물공학' ORDER BY captured_at ASC LIMIT 1000"
        df = pd.read_sql(query, conn)
        
        if len(df) < 50:
            print(">>> [Error] Not enough data to train.")
            return None, None, None

        # 1. 정규화 (MinMax Scaling)
        scaler = MinMaxScaler()
        scaled_data = scaler.fit_transform(df)

        # 2. 시퀀스 데이터 생성 (Window Size: 10)
        # 10개 데이터를 보고 11번째 change_rate를 예측
        window_size = 10
        X, y = [], []
        for i in range(len(scaled_data) - window_size):
            X.append(scaled_data[i:i + window_size])
            y.append(scaled_data[i + window_size, 0]) # 0번 인덱스가 change_rate

        return np.array(X), np.array(y), scaler
    finally:
        conn.close()

def train():
    X, y, scaler = load_and_preprocess_data()
    if X is None: return

    # 텐서 변환
    X_tensor = torch.FloatTensor(X)
    y_tensor = torch.FloatTensor(y).view(-1, 1)

    # 모델 설정 (입력 피처 2개: 등락률, 거래량)
    model = StockLSTM(input_size=2, hidden_size=64, num_layers=2, output_size=1)
    criterion = nn.MSELoss()
    optimizer = optim.Adam(model.parameters(), lr=0.001)

    print(">>> [Train] Starting LSTM Training Loop...")
    epochs = 50
    for epoch in range(epochs):
        model.train()
        optimizer.zero_grad()
        
        outputs = model(X_tensor)
        loss = criterion(outputs, y_tensor)
        
        loss.backward()
        optimizer.step()
        
        if (epoch + 1) % 10 == 0:
            print(f"Epoch [{epoch+1}/{epochs}], Loss: {loss.item():.6f}")

    # 모델 저장
    torch.save(model.state_dict(), "stock_lstm_test.pth")
    print(">>> [Success] Model saved as 'stock_lstm_test.pth'")

if __name__ == "__main__":
    train()
