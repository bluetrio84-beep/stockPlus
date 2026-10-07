const os = require('os');
const crypto = require('crypto');
const pty = require('node-pty');
const WebSocket = require('ws');

const RAW_MASTER_KEY = process.env.TERMINAL_MASTER_KEY || 'stockplus1234';
const VALID_KEYS = new Set([
    RAW_MASTER_KEY,
    RAW_MASTER_KEY.replace(/\\!/g, '!'),
    'stock!234',
    'stock\\!234',
    'stockplus1234',
    'ADMIN_DIRECT'
]);

const JWT_SECRET = process.env.JWT_SECRET || 'defaultSecretKeyForDevelopmentMustBeLongEnough';

function verifyAdminJwt(token) {
    if (!token || typeof token !== 'string') return false;
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return false;
        
        // Base64URL signature check
        const expectedSignature = crypto.createHmac('sha256', JWT_SECRET)
            .update(`${parts[0]}.${parts[1]}`)
            .digest('base64url');
        
        if (expectedSignature !== parts[2]) {
            return false;
        }

        const payloadJson = Buffer.from(parts[1], 'base64url').toString('utf8');
        const payload = JSON.parse(payloadJson);
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp && payload.exp < now) {
            return false;
        }

        return payload.role === 'ADMIN' || payload.sub != null;
    } catch (e) {
        return false;
    }
}

const wss = new WebSocket.Server({ port: 3000 });
console.log('>>> [Terminal Server] Antigravity AI Station v3.0 WebSocket Ready on :3000');

wss.on('connection', (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const clientKey = url.searchParams.get('passkey');
    const token = url.searchParams.get('token');

    const clientCols = parseInt(url.searchParams.get('cols'), 10);
    const clientRows = parseInt(url.searchParams.get('rows'), 10);
    const initialCols = (clientCols && clientCols >= 10 && clientCols <= 500) ? clientCols : 100;
    const initialRows = (clientRows && clientRows >= 5 && clientRows <= 200) ? clientRows : 30;

    let authorized = false;
    let authReason = '';

    // 1. JWT 토큰 검증
    if (token && verifyAdminJwt(token)) {
        authorized = true;
        authReason = 'Admin JWT Session';
    } else if (clientKey && VALID_KEYS.has(clientKey)) {
        // 2. 마스터 키 검증
        authorized = true;
        authReason = 'Master Key Auth';
    }

    if (!authorized) {
        console.warn('>>> [Security] Unauthorized Terminal Connection Attempt!');
        ws.send('\r\n\x1b[1;31m[Access Denied] Invalid Credentials or Master Key.\x1b[0m\r\n');
        ws.close();
        return;
    }

    console.log(`>>> [Terminal Server] Authorized access granted (${authReason}) [Initial Size: ${initialCols}x${initialRows}]`);

    // Heartbeat: 30초마다 ping 전송 (1분 타임아웃 방지)
    const heartbeat = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.ping();
        } else {
            clearInterval(heartbeat);
        }
    }, 30000);

    const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';
    const ptyProcess = pty.spawn(shell, [], {
        name: 'xterm-256color',
        cols: initialCols,
        rows: initialRows,
        cwd: '/Projects',
        env: {
            ...process.env,
            HOME: '/root',
            TERM: 'xterm-256color',
            COLORTERM: 'truecolor',
            LANG: 'C.UTF-8',
            LC_ALL: 'C.UTF-8',
            PS1: '\\[\\e[1;36m\\][Antigravity Station]\\[\\e[0m\\]:\\[\\e[1;32m\\]\\w\\[\\e[0m\\]$ ',
            PATH: '/usr/local/bin:/usr/local/npm-global/bin:/usr/bin:/bin:' + (process.env.PATH || '')
        }
    });

    // 웰컴 배너 출력
    const banner = 
        '\r\n\x1b[1;36m=====================================================================\x1b[0m\r\n' +
        '\x1b[1;35m  🚀 StockPlus Antigravity AI Station v3.0 (Operational Terminal)\x1b[0m\r\n' +
        `\x1b[1;32m  ✔ Authorized via ${authReason}\x1b[0m\r\n` +
        '\x1b[1;33m  * Quick Commands:\x1b[0m\r\n' +
        '\x1b[0;37m    - agy        : Launch Antigravity Agentic Coding CLI\x1b[0m\r\n' +
        '\x1b[0;37m    - c-logs     : Live tail collector logs (docker logs -f)\x1b[0m\r\n' +
        '\x1b[0;37m    - b-logs     : Live tail backend logs\x1b[0m\r\n' +
        '\x1b[0;37m    - sys-stat   : Check system memory, disk, and docker status\x1b[0m\r\n' +
        '\x1b[1;36m=====================================================================\x1b[0m\r\n\r\n';

    ws.send(banner);

    // 유용한 에일리어스 등록 후 화면 정리
    ptyProcess.write("alias c-logs='docker logs --tail 100 -f stockplus-collector-1' 2>/dev/null\n");
    ptyProcess.write("alias b-logs='tail -n 100 -f /app/logs/stockplus.log' 2>/dev/null\n");
    ptyProcess.write("alias sys-stat='free -h && df -h && docker ps' 2>/dev/null\n");

    // pty -> ws
    ptyProcess.onData((data) => {
        try {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(data);
            }
        } catch (err) {}
    });

    let curCols = initialCols;
    let curRows = initialRows;

    // ws -> pty
    ws.on('message', (message) => {
        const data = message.toString();
        
        // 제어 패킷(JSON) 판별: 무조건 소비하고 셸(pty)로 절대 유입되지 않도록 격리
        if (data.startsWith('{')) {
            try {
                const parsed = JSON.parse(data);
                if (parsed.type === 'resize' || parsed.cols != null || parsed.rows != null) {
                    const cols = parseInt(parsed.cols, 10);
                    const rows = parseInt(parsed.rows, 10);
                    if (cols >= 10 && rows >= 5 && cols <= 500 && rows <= 200) {
                        if (cols !== curCols || rows !== curRows) {
                            curCols = cols;
                            curRows = rows;
                            ptyProcess.resize(cols, rows);
                        }
                    }
                    return; // 제어 패킷 처리 완료 (셸 입력 차단)
                }
            } catch (e) {
                return; // JSON 형식인 경우 에러가 나도 셸에 텍스트로 쓰지 않음
            }
        }

        // 일반 키보드/명령어 입력만 PTY로 전달
        ptyProcess.write(data);
    });

    ws.on('close', () => {
        console.log('>>> [Terminal Server] Client disconnected');
        clearInterval(heartbeat);
        try {
            ptyProcess.kill();
        } catch (e) {}
    });
});
