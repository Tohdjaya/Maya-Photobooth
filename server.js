import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;
const ADMIN_PIN = process.env.ADMIN_PIN || '1234';

const DATA_DIR = path.join(__dirname, 'data');
const LEADS_JSON = path.join(DATA_DIR, 'leads.json');
const LEADS_CSV = path.join(DATA_DIR, 'biodata.csv');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function ensureDataFiles() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(LEADS_JSON)) fs.writeFileSync(LEADS_JSON, '[]', 'utf-8');
}

function readLeads() {
  ensureDataFiles();
  try {
    const raw = fs.readFileSync(LEADS_JSON, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function csvCell(val) {
  const s = String(val ?? '').replace(/\r?\n/g, ' ').trim();
  if (/[",]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function formatPhoneForExcel(raw) {
  const digits = String(raw || '').replace(/[^\d+]/g, '');
  if (/^08\d{8,12}$/.test(digits)) {
    return `${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8)}`;
  }
  return digits || String(raw || '').trim();
}

function buildCSV(leads) {
  const headers = [
    'No',
    'Waktu',
    'Nama Lengkap',
    'Asal SMA/SMK/MA',
    'Kelas',
    'Minat Prodi',
    'Email',
    'No. HP / WA',
    'Frame Dipilih',
  ];
  const lines = [headers.map(csvCell).join(',')];
  leads.forEach((item, idx) => {
    lines.push([
      idx + 1,
      item.waktu || item.createdAt || '',
      item.nama || '',
      item.asalSekolah || '',
      item.kelas || '-',
      item.minatProdi || '-',
      item.email || '',
      formatPhoneForExcel(item.noHp),
      item.frameName || '-',
    ].map(csvCell).join(','));
  });
  // UTF-8 BOM so Microsoft Excel renders UTF-8 characters properly
  return '\uFEFF' + lines.join('\r\n') + '\r\n';
}

function writeLeads(leads) {
  ensureDataFiles();
  fs.writeFileSync(LEADS_JSON, JSON.stringify(leads, null, 2), 'utf-8');
  fs.writeFileSync(LEADS_CSV, buildCSV(leads), 'utf-8');
}

function sendJSON(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 1024 * 1024) {
        reject(new Error('Payload too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function isAuthorized(req, urlObj) {
  const pin = req.headers['x-admin-pin'] || urlObj.searchParams.get('pin') || '';
  return String(pin) === String(ADMIN_PIN);
}

const server = http.createServer(async (req, res) => {
  const urlObj = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const pathname = decodeURIComponent(urlObj.pathname);

  // ==================== API ROUTES ====================
  if (pathname === '/api/leads' && req.method === 'POST') {
    try {
      const body = await readJsonBody(req);
      const nama = String(body.nama || '').trim();
      const asalSekolah = String(body.asalSekolah || '').trim();
      const email = String(body.email || '').trim();
      const noHp = String(body.noHp || '').trim();
      const kelas = String(body.kelas || '').trim();
      const minatProdi = String(body.minatProdi || '').trim();
      const frameId = String(body.frameId || '').trim();
      const frameName = String(body.frameName || '').trim();

      if (!nama || !asalSekolah || !email || !noHp) {
        return sendJSON(res, 400, { ok: false, error: 'Nama, asal sekolah, email, dan nomor HP wajib diisi.' });
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return sendJSON(res, 400, { ok: false, error: 'Format email tidak valid.' });
      }
      const digitsOnly = noHp.replace(/\D/g, '');
      if (digitsOnly.length < 9 || digitsOnly.length > 15) {
        return sendJSON(res, 400, { ok: false, error: 'Nomor HP/WA harus terdiri dari 9–15 digit.' });
      }

      const now = new Date();
      const waktu = now.toLocaleString('id-ID', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      const leads = readLeads();
      const entry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        createdAt: now.toISOString(),
        waktu,
        nama,
        asalSekolah,
        kelas: kelas || '-',
        minatProdi: minatProdi || '-',
        email,
        noHp: digitsOnly,
        frameId,
        frameName: frameName || '-',
      };
      leads.unshift(entry);
      writeLeads(leads);

      return sendJSON(res, 201, { ok: true, lead: entry, total: leads.length });
    } catch (err) {
      return sendJSON(res, 400, { ok: false, error: err.message || 'Gagal memproses data.' });
    }
  }

  if (pathname === '/api/leads' && req.method === 'GET') {
    if (!isAuthorized(req, urlObj)) {
      return sendJSON(res, 401, { ok: false, error: 'PIN Panitia salah.' });
    }
    const leads = readLeads();
    return sendJSON(res, 200, { ok: true, total: leads.length, leads });
  }

  if (pathname === '/api/leads/export.csv' && req.method === 'GET') {
    if (!isAuthorized(req, urlObj)) {
      res.writeHead(401, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('PIN Panitia salah.');
      return;
    }
    const leads = readLeads();
    const csv = buildCSV(leads);
    const stamp = new Date().toISOString().slice(0, 10);
    res.writeHead(200, {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="rekap-biodata-maya-photobooth-${stamp}.csv"`,
      'Cache-Control': 'no-store',
    });
    res.end(csv);
    return;
  }

  if (pathname.startsWith('/api/leads/') && req.method === 'DELETE') {
    if (!isAuthorized(req, urlObj)) {
      return sendJSON(res, 401, { ok: false, error: 'PIN Panitia salah.' });
    }
    const id = pathname.slice('/api/leads/'.length);
    const leads = readLeads();
    const next = leads.filter((item) => item.id !== id);
    writeLeads(next);
    return sendJSON(res, 200, { ok: true, total: next.length });
  }

  if (pathname === '/api/leads' && req.method === 'DELETE') {
    if (!isAuthorized(req, urlObj)) {
      return sendJSON(res, 401, { ok: false, error: 'PIN Panitia salah.' });
    }
    writeLeads([]);
    return sendJSON(res, 200, { ok: true, total: 0 });
  }

  // ==================== STATIC FILES ====================
  const safePath = path.normalize(pathname).replace(/^(\.\.[/\\])+/, '');
  let filePath = path.join(__dirname, safePath === '/' || safePath === '\\' ? 'index.html' : safePath);

  if (!filePath.startsWith(__dirname) || filePath.startsWith(DATA_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': ext === '.png' ? 'public, max-age=3600' : 'no-cache',
    });
    fs.createReadStream(filePath).pipe(res);
  });
});

ensureDataFiles();
server.listen(PORT, '127.0.0.1', () => {
  console.log(`\n  Maya Photobooth siap digunakan!`);
  console.log(`  Buka di browser : http://localhost:${PORT}`);
  console.log(`  Data biodata    : ${LEADS_CSV}`);
  console.log(`  PIN Panitia     : ${ADMIN_PIN}\n`);
});
