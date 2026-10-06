import pymysql
import pandas as pd
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from sklearn.preprocessing import StandardScaler
from scipy.stats import spearmanr
import joblib
import xgboost as xgb
from ai_engine import StockLSTM, StockTCN

# DB 설정
DB_CONFIG = {
    'host': '127.0.0.1', 'port': 3306, 'user': 'lms', 'password': 'cnbas.2015', 'database': 'stockplus', 'charset': 'utf8mb4'
}

def load_and_preprocess_data():
    """
    [v60.0] 스케일 불변 정상 시계열 피처 및 3일 후 미래 수익률 타깃 생성
    - 피처 6종: 1일 수익률, 5일 이평 괴리율, 외인 순매수 비중, 기관 순매수 비중, 개인 순매수 비중, 거래량 서지
    - 타깃: 3일 후 미래 수익률(%)
    """
    print(">>> [Train] Loading High-Quality Daily Investor Data from DB...")
    conn = pymysql.connect(**DB_CONFIG)
    try:
        query = """
            SELECT d.stock_code, d.bsop_date, d.close_price, 
                   d.individual_net_buy, d.foreign_net_buy, d.institution_net_buy, d.volume 
            FROM daily_stock_investor d
            LEFT JOIN ai_next_leaders f ON d.stock_code = f.stock_code 
                 AND DATE(d.bsop_date) = DATE(f.captured_at)
            WHERE (f.feedback_tag IS NULL OR f.feedback_tag NOT IN ('실패', '노이즈'))
            ORDER BY d.stock_code, d.bsop_date ASC
        """
        df = pd.read_sql(query, conn)
        
        if len(df) < 500:
            print(">>> [Error] Not enough data in daily_stock_investor to train.")
            return None, None, None, None, None

        for col in ['close_price', 'individual_net_buy', 'foreign_net_buy', 'institution_net_buy', 'volume']:
            df[col] = df[col].astype(float)

        feature_dfs = []
        for code, group in df.groupby('stock_code'):
            g = group.copy()
            if len(g) < 15: continue
            
            # 1. 1일 수익률 (%)
            g['ret_1d'] = (g['close_price'].pct_change() * 100).fillna(0.0).clip(-15.0, 15.0)
            
            # 2. 5일 이평선 괴리율 (%)
            ma5 = g['close_price'].rolling(5, min_periods=1).mean()
            g['ma5_ratio'] = ((g['close_price'] / ma5 - 1) * 100).fillna(0.0).clip(-20.0, 20.0)
            
            # 3. 거래량 대비 외인/기관/개인 순매수 비중 (%)
            vol_safe = g['volume'].replace(0, np.nan)
            g['foreign_ratio'] = (g['foreign_net_buy'] / vol_safe * 100).fillna(0.0).clip(-50.0, 50.0)
            g['institution_ratio'] = (g['institution_net_buy'] / vol_safe * 100).fillna(0.0).clip(-50.0, 50.0)
            g['retail_ratio'] = (g['individual_net_buy'] / vol_safe * 100).fillna(0.0).clip(-50.0, 50.0)
            
            # 4. 과거 5일 대비 거래량 급증율 (Surge)
            vol5 = g['volume'].rolling(5, min_periods=1).mean()
            g['vol_surge'] = (g['volume'] / vol5.replace(0, np.nan)).fillna(1.0).clip(0.1, 5.0)
            
            # 5. 타깃: 3일 후 미래 수익률 (%)
            g['target_3d'] = ((g['close_price'].shift(-3) - g['close_price']) / g['close_price'] * 100).clip(-20.0, 20.0)
            
            feature_dfs.append(g)

        all_df = pd.concat(feature_dfs, ignore_index=True).dropna()
        feat_cols = ['ret_1d', 'ma5_ratio', 'foreign_ratio', 'institution_ratio', 'retail_ratio', 'vol_surge']
        
        # 정상 시계열 피처에 대한 StandardScaler 적합 및 저장
        scaler = StandardScaler()
        scaler.fit(all_df[feat_cols].values.astype(np.float32))
        joblib.dump(scaler, 'stock_scaler.gz')
        print(f">>> [Success] Scaler saved with {len(feat_cols)} stationary features.")

        window_size = 5
        X, y = [], []

        for code, group in all_df.groupby('stock_code'):
            scaled_vals = scaler.transform(group[feat_cols].values.astype(np.float32))
            targs = group['target_3d'].values.astype(np.float32)
            if len(scaled_vals) < window_size: continue
            
            for i in range(len(scaled_vals) - window_size):
                X.append(scaled_vals[i:i + window_size])
                y.append(targs[i + window_size - 1])

        X = np.array(X, dtype=np.float32)
        y = np.array(y, dtype=np.float32)

        # 80% Train, 20% Validation 분할
        split_idx = int(len(X) * 0.8)
        indices = np.random.RandomState(42).permutation(len(X))
        train_idx, val_idx = indices[:split_idx], indices[split_idx:]

        X_train, y_train = X[train_idx], y[train_idx]
        X_val, y_val = X[val_idx], y[val_idx]

        print(f">>> [Data Ready] Total samples: {len(X)} (Train: {len(X_train)}, Val: {len(X_val)})")
        return X_train, y_train, X_val, y_val, scaler
    finally:
        conn.close()

def train():
    X_train, y_train, X_val, y_val, scaler = load_and_preprocess_data()
    if X_train is None or len(X_train) == 0: 
        print(">>> [Error] No training sequences generated.")
        return

    input_size = 6
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f">>> [Device] Using {device} for Deep Learning Training")

    X_train_t = torch.FloatTensor(X_train).to(device)
    y_train_t = torch.FloatTensor(y_train).view(-1, 1).to(device)
    X_val_t = torch.FloatTensor(X_val).to(device)
    y_val_t = torch.FloatTensor(y_val).view(-1, 1).to(device)

    # 금융 데이터에 강건한 SmoothL1 (Huber) 손실 함수 적용
    criterion = nn.SmoothL1Loss(beta=1.0)
    batch_size = 256
    epochs = 80

    train_dataset = torch.utils.data.TensorDataset(X_train_t, y_train_t)
    train_loader = torch.utils.data.DataLoader(train_dataset, batch_size=batch_size, shuffle=True)

    # --- 1. LSTM Training ---
    print("\n--- [1/3] Training LSTM (Expected Return Forecaster) ---")
    lstm_model = StockLSTM(input_size=input_size, hidden_size=64, num_layers=2, output_size=1).to(device)
    optimizer_lstm = optim.Adam(lstm_model.parameters(), lr=0.001, weight_decay=1e-5)

    for epoch in range(epochs):
        lstm_model.train()
        epoch_loss = 0.0
        for b_x, b_y in train_loader:
            optimizer_lstm.zero_grad()
            preds = lstm_model(b_x)
            loss = criterion(preds, b_y)
            loss.backward()
            optimizer_lstm.step()
            epoch_loss += loss.item() * len(b_x)
        
        if (epoch + 1) % 20 == 0:
            lstm_model.eval()
            with torch.no_grad():
                val_loss = criterion(lstm_model(X_val_t), y_val_t).item()
            print(f"LSTM Epoch [{epoch+1}/{epochs}] Train Loss: {epoch_loss/len(X_train):.4f} | Val Loss: {val_loss:.4f}")

    torch.save(lstm_model.state_dict(), "stock_lstm_v1.pth")
    print(">>> [Success] LSTM saved as 'stock_lstm_v1.pth'")

    # --- 2. TCN Training ---
    print("\n--- [2/3] Training TCN (Dilated Temporal Conv Network) ---")
    tcn_model = StockTCN(input_size=input_size, num_channels=[32, 64], kernel_size=2, dropout=0.2).to(device)
    optimizer_tcn = optim.Adam(tcn_model.parameters(), lr=0.001, weight_decay=1e-5)

    for epoch in range(epochs):
        tcn_model.train()
        epoch_loss = 0.0
        for b_x, b_y in train_loader:
            optimizer_tcn.zero_grad()
            preds = tcn_model(b_x)
            loss = criterion(preds, b_y)
            loss.backward()
            optimizer_tcn.step()
            epoch_loss += loss.item() * len(b_x)
        
        if (epoch + 1) % 20 == 0:
            tcn_model.eval()
            with torch.no_grad():
                val_loss = criterion(tcn_model(X_val_t), y_val_t).item()
            print(f"TCN Epoch [{epoch+1}/{epochs}] Train Loss: {epoch_loss/len(X_train):.4f} | Val Loss: {val_loss:.4f}")

    torch.save(tcn_model.state_dict(), "stock_tcn_v1.pth")
    print(">>> [Success] TCN saved as 'stock_tcn_v1.pth'")

    # --- 3. XGBoost Stacking (Meta-Learner) Training ---
    print("\n--- [3/3] Training XGBoost Meta-Learner (Stacking) ---")
    lstm_model.eval()
    tcn_model.eval()
    
    with torch.no_grad():
        train_lstm_pred = lstm_model(X_train_t).cpu().numpy().flatten()
        train_tcn_pred = tcn_model(X_train_t).cpu().numpy().flatten()
        val_lstm_pred = lstm_model(X_val_t).cpu().numpy().flatten()
        val_tcn_pred = tcn_model(X_val_t).cpu().numpy().flatten()

    X_train_meta = np.column_stack([
        train_lstm_pred,
        train_tcn_pred,
        X_train[:, -1, :] # 6개 피처
    ])
    X_val_meta = np.column_stack([
        val_lstm_pred,
        val_tcn_pred,
        X_val[:, -1, :] # 6개 피처
    ])

    xgb_meta_model = xgb.XGBRegressor(
        n_estimators=100, 
        max_depth=4, 
        learning_rate=0.05, 
        subsample=0.8,
        colsample_bytree=0.8,
        objective='reg:squarederror',
        random_state=42
    )
    xgb_meta_model.fit(X_train_meta, y_train)
    val_xgb_pred = xgb_meta_model.predict(X_val_meta)

    xgb_meta_model.save_model("stock_xgb_v1.json")
    print(">>> [Success] XGBoost Meta-Learner saved as 'stock_xgb_v1.json'")

    # --- 4. Validation Performance & IC Evaluation ---
    print("\n=== Validation Evaluation (Information Coefficient & Accuracy) ===")
    ic_lstm, _ = spearmanr(val_lstm_pred, y_val)
    ic_tcn, _ = spearmanr(val_tcn_pred, y_val)
    ic_xgb, _ = spearmanr(val_xgb_pred, y_val)

    # 앙상블 평균 예측
    ensemble_val_pred = (val_lstm_pred * 0.33) + (val_tcn_pred * 0.33) + (val_xgb_pred * 0.34)
    ic_ens, _ = spearmanr(ensemble_val_pred, y_val)

    # 방향성 적중률 (Sign Accuracy)
    dir_acc = np.mean(np.sign(ensemble_val_pred) == np.sign(y_val)) * 100

    print(f"LSTM Rank IC       : {ic_lstm:+.4f}")
    print(f"TCN Rank IC        : {ic_tcn:+.4f}")
    print(f"XGBoost Rank IC    : {ic_xgb:+.4f}")
    print(f"Ensemble Rank IC   : {ic_ens:+.4f}")
    print(f"Direction Accuracy : {dir_acc:.2f}%")
    print(">>> [Complete] LTX Triad Deep Learning Models Successfully Rebuilt!")

if __name__ == "__main__":
    train()
