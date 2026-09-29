/* © 2026 Gabriel Mota Silva. Todos os direitos reservados.
 * Smoke test de integração com módulos nativos do Node.js.
 */
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'portal-smoke-'));
const adminEmail = 'admin@portal.local';
const adminPassword = 'Admin@123';
const backendPort = 32000 + Math.floor(Math.random() * 10000);
const frontendPort = backendPort + 10000;
const backendUrl = 'http://127.0.0.1:' + backendPort;
const frontendUrl = 'http://127.0.0.1:' + frontendPort;
const children = [];
let cookie = '';

function start(script, env) {
  const child = spawn(process.execPath, [path.join(root, script)], {
    cwd: root,
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  child.logs = '';
  child.stdout.on('data', data => { child.logs += data.toString(); });
  child.stderr.on('data', data => { child.logs += data.toString(); });
  children.push(child);
  return child;
}
async function stop(child) {
  if (!child || child.exitCode !== null) return;
  child.kill();
  await Promise.race([once(child, 'exit'), new Promise(resolve => setTimeout(resolve, 3000))]);
}
async function waitFor(url, child) {
  let lastError;
  for (let i = 0; i < 60; i++) {
    if (child.exitCode !== null) throw new Error('Processo encerrou inesperadamente: ' + child.logs);
    try {
      const response = await fetch(url);
      if (response.ok) return response;
    } catch (error) { lastError = error; }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error('Serviço não iniciou em tempo hábil: ' + (lastError?.message || '') + '\n' + child.logs);
}
async function api(url, options = {}, auth = true) {
  const headers = { 'content-type': 'application/json', ...(options.headers || {}) };
  if (auth && cookie) headers.cookie = cookie;
  return fetch(url, { ...options, headers });
}
async function login(baseUrl = backendUrl) {
  const response = await fetch(baseUrl + '/api/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: adminEmail, password: adminPassword })
  });
  assert.equal(response.status, 200, 'Login de demonstração deve funcionar');
  cookie = (response.headers.get('set-cookie') || '').split(';')[0];
  assert.match(cookie, /^sid=/, 'Backend deve retornar cookie de sessão');
  return response.json();
}

(async () => {
  try {
    const common = {
      HOST: '127.0.0.1',
      PORT: String(backendPort),
      DB_PATH: path.join(temp, 'portal.db'),
      ADMIN_EMAIL: adminEmail,
      ADMIN_PASSWORD: adminPassword,
      ADMIN_NAME: 'Administrador de Teste',
      SEED_DEMO_DATA: 'false'
    };
    let backend = start('server.js', common);
    await waitFor(backendUrl + '/api/health', backend);
    const health = await fetch(backendUrl + '/api/health');
    assert.deepEqual(await health.json(), { ok: true, service: 'portal-backend' });

    const unauthorized = await api(backendUrl + '/api/dashboard', {}, false);
    assert.equal(unauthorized.status, 401, 'Dashboard exige autenticação');
    await login();
    const me = await (await api(backendUrl + '/api/me')).json();
    assert.equal(me.email, adminEmail);

    const createdResponse = await api(backendUrl + '/api/requests', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Teste automatizado',
        description: 'Validar o ciclo de vida da solicitação.',
        category: 'TI'
      })
    });
    assert.equal(createdResponse.status, 201);
    const created = await createdResponse.json();

    const filtered = await (await api(backendUrl + '/api/requests?q=automatizado')).json();
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].id, created.id);

    const editedResponse = await api(backendUrl + '/api/requests/' + created.id, {
      method: 'PATCH',
      body: JSON.stringify({
        title: 'Teste automatizado editado',
        description: 'Validar persistência e atualização do registro.',
        category: 'TI'
      })
    });
    assert.equal(editedResponse.status, 200);

    const statusResponse = await api(backendUrl + '/api/requests/' + created.id + '/status', {
      method: 'PUT',
      body: JSON.stringify({ status: 'Em Atendimento' })
    });
    assert.equal(statusResponse.status, 200);
    assert.equal((await statusResponse.json()).status, 'Em Atendimento');

    const forbiddenDelete = await api(backendUrl + '/api/requests/' + created.id, { method: 'DELETE' });
    assert.equal(forbiddenDelete.status, 403, 'Solicitação em atendimento não deve ser excluída pelo solicitante');

    const dashboard = await (await api(backendUrl + '/api/dashboard')).json();
    assert.equal(dashboard.total, 1);
    assert.equal(dashboard.atendimento, 1);

    const front = start('frontend-server.js', {
      FRONTEND_PORT: String(frontendPort),
      BACKEND_URL: backendUrl
    });
    const page = await waitFor(frontendUrl + '/', front);
    assert.match(await page.text(), /Solicitações internas/);
    const proxiedHealth = await fetch(frontendUrl + '/api/health');
    assert.equal(proxiedHealth.status, 200, 'Frontend deve encaminhar a API ao backend');

    await stop(front);
    await stop(backend);

    backend = start('server.js', common);
    await waitFor(backendUrl + '/api/health', backend);
    await login();
    const persisted = await (await api(backendUrl + '/api/requests?q=automatizado')).json();
    assert.equal(persisted.length, 1, 'Registro deve persistir após reiniciar o backend');
    assert.equal(persisted[0].status, 'Em Atendimento');

    const logout = await api(backendUrl + '/api/logout', { method: 'POST', body: '{}' });
    assert.equal(logout.status, 200);
    cookie = '';
    const afterLogout = await api(backendUrl + '/api/me', {}, false);
    assert.equal(afterLogout.status, 401);

    console.log('PASS: healthcheck, autenticação, autorização, CRUD, filtros, dashboard, proxy frontend e persistência SQLite.');
  } catch (error) {
    console.error('FAIL:', error.stack || error.message);
    for (const child of children) if (child.logs) console.error(child.logs);
    process.exitCode = 1;
  } finally {
    for (const child of children.reverse()) await stop(child);
    try { fs.rmSync(temp, { recursive: true, force: true }); } catch {}
  }
})();
