const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const crypto = require('crypto');
const app = express();
const port = 3000;

const frontendUrl = process.env.FRONTEND_URL || `http://localhost:${port}/fronend/index.html`;
const oauthStates = new Map();
const sessions = new Map();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

function createOAuthState(provider) {
    const state = crypto.randomBytes(24).toString('hex');
    oauthStates.set(state, { provider, expiresAt: Date.now() + 10 * 60 * 1000 });
    return state;
}

function getSessionId(req) {
    const cookies = req.headers.cookie || '';
    const sessionCookie = cookies.split(';').map(cookie => cookie.trim())
        .find(cookie => cookie.startsWith('helpdesk_session='));
    return sessionCookie ? decodeURIComponent(sessionCookie.split('=').slice(1).join('=')) : null;
}

function redirectToProvider(res, provider) {
    const state = createOAuthState(provider);
    const redirectUri = `http://localhost:${port}/auth/${provider}/callback`;
    const params = new URLSearchParams({ client_id: process.env[`${provider.toUpperCase()}_CLIENT_ID`], redirect_uri: redirectUri, state });

    if (provider === 'google') {
        params.set('response_type', 'code');
        params.set('scope', 'openid email profile');
        return res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
    }

    params.set('scope', 'read:user user:email');
    return res.redirect(`https://github.com/login/oauth/authorize?${params}`);
}

function missingProviderConfiguration(res, provider) {
    const name = provider === 'google' ? 'Google' : 'GitHub';
    return res.status(503).send(`Login com ${name} indisponível: configure ${provider.toUpperCase()}_CLIENT_ID e ${provider.toUpperCase()}_CLIENT_SECRET no ambiente do backend.`);
}

async function exchangeOAuthCode(provider, code) {
    const redirectUri = `http://localhost:${port}/auth/${provider}/callback`;
    const clientId = process.env[`${provider.toUpperCase()}_CLIENT_ID`];
    const clientSecret = process.env[`${provider.toUpperCase()}_CLIENT_SECRET`];
    const tokenUrl = provider === 'google' ? 'https://oauth2.googleapis.com/token' : 'https://github.com/login/oauth/access_token';
    const tokenResponse = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code, redirect_uri: redirectUri })
    });
    const token = await tokenResponse.json();
    if (!tokenResponse.ok || !token.access_token) throw new Error(token.error_description || token.error || 'Falha ao obter token');

    const profileUrl = provider === 'google' ? 'https://openidconnect.googleapis.com/v1/userinfo' : 'https://api.github.com/user';
    const profileResponse = await fetch(profileUrl, { headers: { Authorization: `Bearer ${token.access_token}`, Accept: 'application/json' } });
    const profile = await profileResponse.json();
    if (!profileResponse.ok) throw new Error('Falha ao obter perfil do provedor');

    return { provider, id: String(profile.sub || profile.id), name: profile.name || profile.login, email: profile.email || null };
}

function handleOAuthCallback(provider) {
    return async (req, res) => {
        const savedState = oauthStates.get(req.query.state);
        oauthStates.delete(req.query.state);
        if (!savedState || savedState.provider !== provider || savedState.expiresAt < Date.now()) {
            return res.status(400).send('Estado de autenticação inválido ou expirado. Tente novamente.');
        }
        try {
            const user = await exchangeOAuthCode(provider, req.query.code);
            const sessionId = crypto.randomBytes(32).toString('hex');
            sessions.set(sessionId, { user, expiresAt: Date.now() + 8 * 60 * 60 * 1000 });
            res.setHeader('Set-Cookie', `helpdesk_session=${encodeURIComponent(sessionId)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800`);
            return res.redirect(frontendUrl);
        } catch (error) {
            console.error(`Erro no login ${provider}:`, error.message);
            return res.status(502).send(`Não foi possível concluir o login com ${provider}. Verifique a configuração OAuth.`);
        }
    };
}

app.get('/auth/google', (req, res) => {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) return missingProviderConfiguration(res, 'google');
    return redirectToProvider(res, 'google');
});
app.get('/auth/github', (req, res) => {
    if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) return missingProviderConfiguration(res, 'github');
    return redirectToProvider(res, 'github');
});
app.get('/auth/google/callback', handleOAuthCallback('google'));
app.get('/auth/github/callback', handleOAuthCallback('github'));
app.get('/api/auth/me', (req, res) => {
    const session = sessions.get(getSessionId(req));
    if (!session || session.expiresAt < Date.now()) return res.status(401).json({ authenticated: false });
    return res.json({ authenticated: true, user: session.user });
});
app.post('/auth/logout', (req, res) => {
    sessions.delete(getSessionId(req));
    res.setHeader('Set-Cookie', 'helpdesk_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');
    res.json({ message: 'Logout realizado com sucesso' });
});

// ============================================
// CONEXÃO COM O BANCO
// ============================================
const connection = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'abertura_chamada'
});

connection.connect((err) => {
    if (err) {
        console.error('❌ Erro ao conectar:', err);
        return;
    }
    console.log('✅ Conectado ao banco: abertura_chamada');
});

// ============================================
// ROTAS DE CHAMADOS
// ============================================

// Listar todos os chamados
app.get('/api/chamados', (req, res) => {
    const query = `
        SELECT 
            C.ID_CHAMADO AS id,
            C.DATA_ABERTURA AS data_abertura,
            U.NOME_USUARIO AS solicitante,
            C.DESCRICAO AS descricao,
            T.NOME_TECNICO AS tecnico,
            D.NOME_DEPARTAMENTO AS departamento,
            E.NOME_EQUIPAMENTO AS equipamento,
            C.STATUS_CHAMADO AS status,
            C.PRIORIDADE AS prioridade,
            C.LOCAL_CHAMADO AS local
        FROM tb_CHAMADO C
        JOIN tb_USUARIO U ON C.FK_ID_USUARIO = U.ID_USUARIO
        JOIN tb_TECNICO T ON C.FK_ID_TECNICO = T.ID_TECNICO
        JOIN tb_DEPARTAMENTO D ON C.FK_ID_DEPARTAMENTO = D.ID_DEPARTAMENTO
        LEFT JOIN tb_EQUIPAMENTO E ON C.FK_ID_EQUIPAMENTO = E.ID_EQUIPAMENTO
        ORDER BY C.ID_CHAMADO DESC
    `;

    connection.query(query, (err, results) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(results);
    });
});

// Criar novo chamado
app.post('/api/chamados', (req, res) => {
    const { local, descricao, prioridade, usuario, tecnico, departamento, equipamento } = req.body;
    
    const query = `
        INSERT INTO tb_CHAMADO 
        (LOCAL_CHAMADO, DESCRICAO, PRIORIDADE, STATUS_CHAMADO, DATA_ABERTURA, 
         FK_ID_USUARIO, FK_ID_TECNICO, FK_ID_DEPARTAMENTO, FK_ID_EQUIPAMENTO)
        VALUES (?, ?, ?, 'Aberto', CURDATE(), ?, ?, ?, ?)
    `;

    const values = [local, descricao, prioridade, usuario, tecnico, departamento, equipamento || null];

    connection.query(query, values, (err, result) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ 
            message: 'Chamado criado com sucesso!',
            id: result.insertId 
        });
    });
});

// Atualizar status do chamado
app.put('/api/chamados/:id', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const query = 'UPDATE tb_CHAMADO SET STATUS_CHAMADO = ? WHERE ID_CHAMADO = ?';
    
    connection.query(query, [status, id], (err, result) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (result.affectedRows === 0) {
            res.status(404).json({ error: 'Chamado não encontrado' });
            return;
        }
        res.json({ message: 'Status atualizado com sucesso!' });
    });
});

// Deletar chamado
app.delete('/api/chamados/:id', (req, res) => {
    const { id } = req.params;

    const query = 'DELETE FROM tb_CHAMADO WHERE ID_CHAMADO = ?';
    
    connection.query(query, [id], (err, result) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (result.affectedRows === 0) {
            res.status(404).json({ error: 'Chamado não encontrado' });
            return;
        }
        res.json({ message: 'Chamado removido com sucesso!' });
    });
});

// ============================================
// ROTAS DE USUÁRIOS (CRUD Completo)
// ============================================

// Listar usuários
app.get('/api/usuarios', (req, res) => {
    const query = `
        SELECT U.ID_USUARIO AS id, U.NOME_USUARIO AS nome, U.EMAIL_USUARIO AS email, 
               U.CARGO AS cargo, D.NOME_DEPARTAMENTO AS departamento
        FROM tb_USUARIO U
        JOIN tb_DEPARTAMENTO D ON U.FK_ID_DEPARTAMENTO = D.ID_DEPARTAMENTO
        ORDER BY U.NOME_USUARIO
    `;
    connection.query(query, (err, results) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(results);
    });
});

// Criar usuário
app.post('/api/usuarios', (req, res) => {
    const { nome, email, cargo, departamento } = req.body;
    
    if (!nome || !email || !cargo || !departamento) {
        return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
    }

    const query = 'INSERT INTO tb_USUARIO (NOME_USUARIO, EMAIL_USUARIO, CARGO, FK_ID_DEPARTAMENTO) VALUES (?, ?, ?, ?)';
    
    connection.query(query, [nome, email, cargo, departamento], (err, result) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ 
            message: 'Usuário cadastrado com sucesso!',
            id: result.insertId 
        });
    });
});

// Atualizar usuário
app.put('/api/usuarios/:id', (req, res) => {
    const { id } = req.params;
    const { nome, email, cargo, departamento } = req.body;

    const query = 'UPDATE tb_USUARIO SET NOME_USUARIO = ?, EMAIL_USUARIO = ?, CARGO = ?, FK_ID_DEPARTAMENTO = ? WHERE ID_USUARIO = ?';
    
    connection.query(query, [nome, email, cargo, departamento, id], (err, result) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        res.json({ message: 'Usuário atualizado com sucesso!' });
    });
});

// Deletar usuário
app.delete('/api/usuarios/:id', (req, res) => {
    const { id } = req.params;

    const query = 'DELETE FROM tb_USUARIO WHERE ID_USUARIO = ?';
    
    connection.query(query, [id], (err, result) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        res.json({ message: 'Usuário removido com sucesso!' });
    });
});

// ============================================
// ROTAS DE TÉCNICOS (CRUD Completo)
// ============================================

// Listar técnicos
app.get('/api/tecnicos', (req, res) => {
    const query = `
        SELECT T.ID_TECNICO AS id, T.NOME_TECNICO AS nome, T.FUNCAO_TECNICO AS funcao,
               D.NOME_DEPARTAMENTO AS departamento
        FROM tb_TECNICO T
        JOIN tb_DEPARTAMENTO D ON T.FK_ID_DEPARTAMENTO = D.ID_DEPARTAMENTO
        ORDER BY T.NOME_TECNICO
    `;
    connection.query(query, (err, results) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(results);
    });
});

// Criar técnico
app.post('/api/tecnicos', (req, res) => {
    const { nome, funcao, departamento } = req.body;
    
    if (!nome || !funcao || !departamento) {
        return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
    }

    const query = 'INSERT INTO tb_TECNICO (NOME_TECNICO, FUNCAO_TECNICO, FK_ID_DEPARTAMENTO) VALUES (?, ?, ?)';
    
    connection.query(query, [nome, funcao, departamento], (err, result) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ 
            message: 'Técnico cadastrado com sucesso!',
            id: result.insertId 
        });
    });
});

// Atualizar técnico
app.put('/api/tecnicos/:id', (req, res) => {
    const { id } = req.params;
    const { nome, funcao, departamento } = req.body;

    const query = 'UPDATE tb_TECNICO SET NOME_TECNICO = ?, FUNCAO_TECNICO = ?, FK_ID_DEPARTAMENTO = ? WHERE ID_TECNICO = ?';
    
    connection.query(query, [nome, funcao, departamento, id], (err, result) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Técnico não encontrado' });
        }
        res.json({ message: 'Técnico atualizado com sucesso!' });
    });
});

// Deletar técnico
app.delete('/api/tecnicos/:id', (req, res) => {
    const { id } = req.params;

    const query = 'DELETE FROM tb_TECNICO WHERE ID_TECNICO = ?';
    
    connection.query(query, [id], (err, result) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Técnico não encontrado' });
        }
        res.json({ message: 'Técnico removido com sucesso!' });
    });
});

// ============================================
// ROTAS DE DEPARTAMENTOS (CRUD Completo)
// ============================================

// Listar departamentos
app.get('/api/departamentos', (req, res) => {
    const query = 'SELECT ID_DEPARTAMENTO AS id, NOME_DEPARTAMENTO AS nome FROM tb_DEPARTAMENTO ORDER BY NOME_DEPARTAMENTO';
    connection.query(query, (err, results) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(results);
    });
});

// Criar departamento
app.post('/api/departamentos', (req, res) => {
    const { nome } = req.body;
    
    if (!nome) {
        return res.status(400).json({ error: 'Nome do departamento é obrigatório' });
    }

    const query = 'INSERT INTO tb_DEPARTAMENTO (NOME_DEPARTAMENTO, FK_ID_CHAMADO) VALUES (?, 0)';
    
    connection.query(query, [nome], (err, result) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ 
            message: 'Departamento cadastrado com sucesso!',
            id: result.insertId 
        });
    });
});

// Atualizar departamento
app.put('/api/departamentos/:id', (req, res) => {
    const { id } = req.params;
    const { nome } = req.body;

    const query = 'UPDATE tb_DEPARTAMENTO SET NOME_DEPARTAMENTO = ? WHERE ID_DEPARTAMENTO = ?';
    
    connection.query(query, [nome, id], (err, result) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Departamento não encontrado' });
        }
        res.json({ message: 'Departamento atualizado com sucesso!' });
    });
});

// Deletar departamento
app.delete('/api/departamentos/:id', (req, res) => {
    const { id } = req.params;

    const query = 'DELETE FROM tb_DEPARTAMENTO WHERE ID_DEPARTAMENTO = ?';
    
    connection.query(query, [id], (err, result) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Departamento não encontrado' });
        }
        res.json({ message: 'Departamento removido com sucesso!' });
    });
});

// ============================================
// ROTAS DE EQUIPAMENTOS (CRUD Completo)
// ============================================

// Listar equipamentos
app.get('/api/equipamentos', (req, res) => {
    const query = 'SELECT ID_EQUIPAMENTO AS id, NOME_EQUIPAMENTO AS nome FROM tb_EQUIPAMENTO ORDER BY NOME_EQUIPAMENTO';
    connection.query(query, (err, results) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(results);
    });
});

// Criar equipamento
app.post('/api/equipamentos', (req, res) => {
    const { nome } = req.body;
    
    if (!nome) {
        return res.status(400).json({ error: 'Nome do equipamento é obrigatório' });
    }

    const query = 'INSERT INTO tb_EQUIPAMENTO (NOME_EQUIPAMENTO, FK_ID_CHAMADO) VALUES (?, 0)';
    
    connection.query(query, [nome], (err, result) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ 
            message: 'Equipamento cadastrado com sucesso!',
            id: result.insertId 
        });
    });
});

// Atualizar equipamento
app.put('/api/equipamentos/:id', (req, res) => {
    const { id } = req.params;
    const { nome } = req.body;

    const query = 'UPDATE tb_EQUIPAMENTO SET NOME_EQUIPAMENTO = ? WHERE ID_EQUIPAMENTO = ?';
    
    connection.query(query, [nome, id], (err, result) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Equipamento não encontrado' });
        }
        res.json({ message: 'Equipamento atualizado com sucesso!' });
    });
});

// Deletar equipamento
app.delete('/api/equipamentos/:id', (req, res) => {
    const { id } = req.params;

    const query = 'DELETE FROM tb_EQUIPAMENTO WHERE ID_EQUIPAMENTO = ?';
    
    connection.query(query, [id], (err, result) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Equipamento não encontrado' });
        }
        res.json({ message: 'Equipamento removido com sucesso!' });
    });
});

// ============================================
// ESTATÍSTICAS
// ============================================
app.get('/api/estatisticas', (req, res) => {
    const query = `
        SELECT 
            STATUS_CHAMADO AS status,
            COUNT(*) AS quantidade
        FROM tb_CHAMADO
        GROUP BY STATUS_CHAMADO
    `;
    connection.query(query, (err, results) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(results);
    });
});

app.listen(port, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${port}`);
});