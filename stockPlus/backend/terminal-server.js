const os = require('os');
const pty = require('node-pty');
const WebSocket = require('ws');

const MASTER_KEY = process.env.TERMINAL_MASTER_KEY || 'stockplus1234'; // .env에서 로드
const wss = new WebSocket.Server({ port: 3000 });

console.log('>>> [Terminal Server] Master Key Mode Started');

wss.on('connection', (ws, req) => {
    // 1. URL 쿼리에서 마스터 키 추출 (?passkey=...)
    const url = new URL(req.url, `http://${req.headers.host}`);
    const clientKey = url.searchParams.get('passkey');

    if (clientKey !== MASTER_KEY) {
        console.warn('>>> [Security] Invalid Master Key attempt!');
        ws.send('\r\n\x1b[1;31m[Access Denied] Invalid Master Key.\x1b[0m\r\n');
        ws.close();
        return;
    }

    console.log('>>> [Terminal Server] Authorized access granted');

    // [v37.90] Heartbeat: 30초마다 핑을 보내 연결 유지 (1분 타임아웃 방지)
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
        cols: 80,
        rows: 24,
        cwd: '/Projects',
        env: {
            ...process.env,
            PS1: '\\[\\e[1;32m\\]lms@stockplus\\[\\e[0m\\]:\\[\\e[1;34m\\]\\w\\[\\e[0m\\]$ ',
            PATH: process.env.PATH + ':/usr/local/npm-global/bin'
        }
    });

    // pty -> ws
    ptyProcess.onData((data) => {
        ws.send(data);
    });

    // ws -> pty
    ws.on('message', (message) => {
        const data = message.toString();
        // 리사이즈 메시지 판별
        if (data.startsWith('{') && data.includes('cols')) {
            try {
                const { cols, rows } = JSON.parse(data);
                ptyProcess.resize(cols, rows);
            } catch (e) {}
        } else {
            ptyProcess.write(data);
        }
    });

    ws.on('close', () => {
        console.log('>>> [Terminal Server] Client disconnected');
        clearInterval(heartbeat);
        ptyProcess.kill();
    });
});
