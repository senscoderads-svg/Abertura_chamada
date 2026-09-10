// ========================================
// CONFIGURAÇÃO
// ========================================
const API_URL = 'http://localhost:3000/api';
let currentTab = 'dashboard';
let editId = null;
let editType = null;

// ========================================
// TOAST NOTIFICATION
// ========================================
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const icon = type === 'success' ? '✅' : '❌';
    toast.innerHTML = `<i>${icon}</i> ${message}`;
    toast.className = `toast ${type}`;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ========================================
// NAVEGAÇÃO POR TABS
// ========================================
document.querySelectorAll('.sidebar-nav ul li').forEach(item => {
    item.addEventListener('click', function() {
        document.querySelectorAll('.sidebar-nav ul li').forEach(li => li.classList.remove('active'));
        this.classList.add('active');
        
        const tab = this.dataset.tab;
        currentTab = tab;
        carregarTab(tab);
    });
});

function carregarTab(tab) {
    const container = document.getElementById('contentContainer');
    const title = document.getElementById('pageTitle');
    const breadcrumb = document.getElementById('breadcrumb');
    
    switch(tab) {
        case 'dashboard':
            title.textContent = 'Dashboard de Chamados';
            breadcrumb.textContent = 'Home / Chamados';
            container.innerHTML = carregarDashboard();
            carregarChamados();
            carregarEstatisticas();
            break;
        case 'novo-chamado':
            title.textContent = 'Abrir Novo Chamado';
            breadcrumb.textContent = 'Home / Novo Chamado';
            container.innerHTML = carregarFormChamado();
            carregarSelects();
            document.getElementById('formChamado').addEventListener('submit', criarChamado);
            break;
        case 'usuarios':
            title.textContent = 'Gerenciar Usuários';
            breadcrumb.textContent = 'Home / Usuários';
            container.innerHTML = carregarGestao('usuarios');
            carregarUsuarios();
            break;
        case 'tecnicos':
            title.textContent = 'Gerenciar Técnicos';
            breadcrumb.textContent = 'Home / Técnicos';
            container.innerHTML = carregarGestao('tecnicos');
            carregarTecnicos();
            break;
        case 'departamentos':
            title.textContent = 'Gerenciar Departamentos';
            breadcrumb.textContent = 'Home / Departamentos';
            container.innerHTML = carregarGestao('departamentos');
            carregarDepartamentos();
            break;
        case 'equipamentos':
            title.textContent = 'Gerenciar Equipamentos';
            breadcrumb.textContent = 'Home / Equipamentos';
            container.innerHTML = carregarGestao('equipamentos');
            carregarEquipamentos();
            break;
    }
}

// ========================================
// FUNÇÕES DE RENDERIZAÇÃO
// ========================================

function carregarDashboard() {
    return `
        <!-- Stats Cards -->
        <section class="stats-grid">
            <div class="stat-card stat-total">
                <div class="stat-icon"><i class="fas fa-tasks"></i></div>
                <div class="stat-info">
                    <h3 id="stat-total">0</h3>
                    <p>Total de Chamados</p>
                </div>
            </div>
            <div class="stat-card stat-aberto">
                <div class="stat-icon"><i class="fas fa-circle" style="color: #ffd93d;"></i></div>
                <div class="stat-info">
                    <h3 id="stat-aberto">0</h3>
                    <p>Em Aberto</p>
                </div>
            </div>
            <div class="stat-card stat-atendimento">
                <div class="stat-icon"><i class="fas fa-circle" style="color: #6bcbff;"></i></div>
                <div class="stat-info">
                    <h3 id="stat-atendimento">0</h3>
                    <p>Em Atendimento</p>
                </div>
            </div>
            <div class="stat-card stat-fechado">
                <div class="stat-icon"><i class="fas fa-circle" style="color: #6fcf97;"></i></div>
                <div class="stat-info">
                    <h3 id="stat-fechado">0</h3>
                    <p>Finalizados</p>
                </div>
            </div>
        </section>

        <!-- Tabela de Chamados -->
        <section class="table-section">
            <div class="table-header">
                <h2><i class="fas fa-list-ul"></i> Chamados Recentes</h2>
                <div class="table-actions">
                    <div class="filters">
                        <select id="filterStatus">
                            <option value="todos">📋 Todos</option>
                            <option value="Aberto">🟡 Aberto</option>
                            <option value="Em Atendimento">🔵 Em Atendimento</option>
                            <option value="Fechado">🟢 Fechado</option>
                        </select>
                        <div class="search-box">
                            <i class="fas fa-search"></i>
                            <input type="text" id="searchInput" placeholder="Buscar chamados...">
                        </div>
                    </div>
                    <button onclick="carregarChamados()" class="btn-table-refresh">
                        <i class="fas fa-sync-alt"></i> Atualizar
                    </button>
                </div>
            </div>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Data</th>
                            <th>Solicitante</th>
                            <th>Descrição</th>
                            <th>Técnico</th>
                            <th>Departamento</th>
                            <th>Prioridade</th>
                            <th>Status</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody id="tbodyChamados">
                        <tr><td colspan="9" class="loading"><div class="loader"></div>Carregando...</td></tr>
                    </tbody>
                </table>
            </div>
        </section>
    `;
}

function carregarFormChamado() {
    return `
        <section class="form-section">
            <div class="form-header">
                <h2><i class="fas fa-plus-circle"></i> Abrir Novo Chamado</h2>
            </div>
            <div class="form-body">
                <form id="formChamado">
                    <div class="form-row">
                        <div class="form-group">
                            <label><i class="fas fa-map-marker-alt"></i> Local</label>
                            <input type="text" id="local" placeholder="Digite o local" required>
                        </div>
                        <div class="form-group">
                            <label><i class="fas fa-align-left"></i> Descrição</label>
                            <input type="text" id="descricao" placeholder="Descreva o problema" required>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label><i class="fas fa-flag"></i> Prioridade</label>
                            <select id="prioridade" required>
                                <option value="">Selecione a prioridade</option>
                                <option value="Baixa">🟢 Baixa</option>
                                <option value="Média">🟡 Média</option>
                                <option value="Alta">🟠 Alta</option>
                                <option value="Urgente">🔴 Urgente</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label><i class="fas fa-user"></i> Usuário</label>
                            <select id="usuario" required>
                                <option value="">Selecione o usuário</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label><i class="fas fa-user-cog"></i> Técnico</label>
                            <select id="tecnico" required>
                                <option value="">Selecione o técnico</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label><i class="fas fa-building"></i> Departamento</label>
                            <select id="departamento" required>
                                <option value="">Selecione o departamento</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label><i class="fas fa-desktop"></i> Equipamento</label>
                            <select id="equipamento">
                                <option value="">Selecione o equipamento (opcional)</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <button type="submit" class="btn-primary">
                                <i class="fas fa-paper-plane"></i> Abrir Chamado
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </section>
    `;
}

function carregarGestao(tipo) {
    const nomes = {
        usuarios: 'Usuários',
        tecnicos: 'Técnicos',
        departamentos: 'Departamentos',
        equipamentos: 'Equipamentos'
    };
    
    const icones = {
        usuarios: 'fa-users',
        tecnicos: 'fa-user-cog',
        departamentos: 'fa-building',
        equipamentos: 'fa-desktop'
    };
    
    const colunas = {
        usuarios: ['ID', 'Nome', 'Email', 'Cargo', 'Departamento', 'Ações'],
        tecnicos: ['ID', 'Nome', 'Função', 'Departamento', 'Ações'],
        departamentos: ['ID', 'Nome', 'Ações'],
        equipamentos: ['ID', 'Nome', 'Ações']
    };
    
    let thead = `<tr>`;
    colunas[tipo].forEach(col => thead += `<th>${col}</th>`);
    thead += `</tr>`;
    
    return `
        <section class="table-section">
            <div class="management-header">
                <h2><i class="fas ${icones[tipo]}"></i> Gerenciar ${nomes[tipo]}</h2>
                <button class="btn-add" onclick="abrirModal('${tipo}')">
                    <i class="fas fa-plus"></i> Novo ${nomes[tipo].slice(0, -1)}
                </button>
            </div>
            <div class="table-container">
                <table>
                    <thead>${thead}</thead>
                    <tbody id="tbodyGestao">
                        <tr><td colspan="10" class="loading"><div class="loader"></div>Carregando...</td></tr>
                    </tbody>
                </table>
            </div>
        </section>
    `;
}

// ========================================
// CARREGAR CHAMADOS
// ========================================
async function carregarChamados() {
    try {
        const response = await fetch(`${API_URL}/chamados`);
        const chamados = await response.json();
        exibirChamados(chamados);
        
        // Event listeners de filtro
        const filterStatus = document.getElementById('filterStatus');
        const searchInput = document.getElementById('searchInput');
        if (filterStatus) filterStatus.addEventListener('change', () => filtrarChamados());
        if (searchInput) searchInput.addEventListener('input', () => filtrarChamados());
    } catch (error) {
        console.error('Erro:', error);
    }
}

function exibirChamados(chamados) {
    const tbody = document.getElementById('tbodyChamados');
    if (!tbody) return;
    
    if (!chamados || chamados.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:40px;">Nenhum chamado encontrado</td></tr>`;
        return;
    }
    
    tbody.innerHTML = chamados.map(c => `
        <tr>
            <td><strong>#${c.id}</strong></td>
            <td>${formatarData(c.data_abertura)}</td>
            <td>${c.solicitante}</td>
            <td>${c.descricao}</td>
            <td>${c.tecnico}</td>
            <td>${c.departamento}</td>
            <td><span class="prioridade-badge prioridade-${c.prioridade}">${c.prioridade}</span></td>
            <td><span class="status-badge status-${c.status.replace(/\s/g, '')}">${c.status}</span></td>
            <td>
                <button class="btn-action btn-status" onclick="alterarStatus(${c.id})" title="Alterar Status"><i class="fas fa-edit"></i></button>
                <button class="btn-action btn-delete" onclick="deletarChamado(${c.id})" title="Excluir"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

function filtrarChamados() {
    const status = document.getElementById('filterStatus')?.value || 'todos';
    const search = document.getElementById('searchInput')?.value.toLowerCase() || '';
    
    fetch(`${API_URL}/chamados`)
        .then(res => res.json())
        .then(chamados => {
            let filtrados = chamados;
            if (status !== 'todos') filtrados = filtrados.filter(c => c.status === status);
            if (search) filtrados = filtrados.filter(c => 
                c.descricao.toLowerCase().includes(search) || 
                c.solicitante.toLowerCase().includes(search)
            );
            exibirChamados(filtrados);
        })
        .catch(err => console.error(err));
}

// ========================================
// FUNÇÕES DE CRUD - USUÁRIOS
// ========================================
async function carregarUsuarios() {
    try {
        const response = await fetch(`${API_URL}/usuarios`);
        const usuarios = await response.json();
        const tbody = document.getElementById('tbodyGestao');
        if (!tbody) return;
        
        if (!usuarios || usuarios.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:40px;">Nenhum usuário cadastrado</td></tr>`;
            return;
        }
        
        tbody.innerHTML = usuarios.map(u => `
            <tr>
                <td>#${u.id}</td>
                <td>${u.nome}</td>
                <td>${u.email}</td>
                <td>${u.cargo}</td>
                <td>${u.departamento}</td>
                <td>
                    <button class="btn-edit" onclick="abrirModal('usuarios', ${u.id})"><i class="fas fa-edit"></i></button>
                    <button class="btn-delete" onclick="deletarUsuario(${u.id})"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Erro:', error);
    }
}

async function criarUsuario(data) {
    try {
        const response = await fetch(`${API_URL}/usuarios`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            showToast('Usuário cadastrado com sucesso!');
            fecharModal();
            carregarUsuarios();
        } else {
            const error = await response.json();
            showToast('Erro: ' + error.error, 'error');
        }
    } catch (error) {
        showToast('Erro ao cadastrar usuário', 'error');
    }
}

async function atualizarUsuario(id, data) {
    try {
        const response = await fetch(`${API_URL}/usuarios/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            showToast('Usuário atualizado com sucesso!');
            fecharModal();
            carregarUsuarios();
        } else {
            const error = await response.json();
            showToast('Erro: ' + error.error, 'error');
        }
    } catch (error) {
        showToast('Erro ao atualizar usuário', 'error');
    }
}

async function deletarUsuario(id) {
    if (!confirm(`Tem certeza que deseja excluir o usuário #${id}?`)) return;
    
    try {
        const response = await fetch(`${API_URL}/usuarios/${id}`, { method: 'DELETE' });
        if (response.ok) {
            showToast('Usuário removido com sucesso!');
            carregarUsuarios();
        } else {
            showToast('Erro ao remover usuário', 'error');
        }
    } catch (error) {
        showToast('Erro ao remover usuário', 'error');
    }
}

// ========================================
// FUNÇÕES DE CRUD - TÉCNICOS
// ========================================
async function carregarTecnicos() {
    try {
        const response = await fetch(`${API_URL}/tecnicos`);
        const tecnicos = await response.json();
        const tbody = document.getElementById('tbodyGestao');
        if (!tbody) return;
        
        if (!tecnicos || tecnicos.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:40px;">Nenhum técnico cadastrado</td></tr>`;
            return;
        }
        
        tbody.innerHTML = tecnicos.map(t => `
            <tr>
                <td>#${t.id}</td>
                <td>${t.nome}</td>
                <td>${t.funcao}</td>
                <td>${t.departamento}</td>
                <td>
                    <button class="btn-edit" onclick="abrirModal('tecnicos', ${t.id})"><i class="fas fa-edit"></i></button>
                    <button class="btn-delete" onclick="deletarTecnico(${t.id})"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Erro:', error);
    }
}

async function criarTecnico(data) {
    try {
        const response = await fetch(`${API_URL}/tecnicos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            showToast('Técnico cadastrado com sucesso!');
            fecharModal();
            carregarTecnicos();
        } else {
            const error = await response.json();
            showToast('Erro: ' + error.error, 'error');
        }
    } catch (error) {
        showToast('Erro ao cadastrar técnico', 'error');
    }
}

async function atualizarTecnico(id, data) {
    try {
        const response = await fetch(`${API_URL}/tecnicos/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            showToast('Técnico atualizado com sucesso!');
            fecharModal();
            carregarTecnicos();
        } else {
            const error = await response.json();
            showToast('Erro: ' + error.error, 'error');
        }
    } catch (error) {
        showToast('Erro ao atualizar técnico', 'error');
    }
}

async function deletarTecnico(id) {
    if (!confirm(`Tem certeza que deseja excluir o técnico #${id}?`)) return;
    
    try {
        const response = await fetch(`${API_URL}/tecnicos/${id}`, { method: 'DELETE' });
        if (response.ok) {
            showToast('Técnico removido com sucesso!');
            carregarTecnicos();
        } else {
            showToast('Erro ao remover técnico', 'error');
        }
    } catch (error) {
        showToast('Erro ao remover técnico', 'error');
    }
}

// ========================================
// FUNÇÕES DE CRUD - DEPARTAMENTOS
// ========================================
async function carregarDepartamentos() {
    try {
        const response = await fetch(`${API_URL}/departamentos`);
        const departamentos = await response.json();
        const tbody = document.getElementById('tbodyGestao');
        if (!tbody) return;
        
        if (!departamentos || departamentos.length === 0) {
            tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; padding:40px;">Nenhum departamento cadastrado</td></tr>`;
            return;
        }
        
        tbody.innerHTML = departamentos.map(d => `
            <tr>
                <td>#${d.id}</td>
                <td>${d.nome}</td>
                <td>
                    <button class="btn-edit" onclick="abrirModal('departamentos', ${d.id})"><i class="fas fa-edit"></i></button>
                    <button class="btn-delete" onclick="deletarDepartamento(${d.id})"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Erro:', error);
    }
}

async function criarDepartamento(data) {
    try {
        const response = await fetch(`${API_URL}/departamentos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            showToast('Departamento cadastrado com sucesso!');
            fecharModal();
            carregarDepartamentos();
            carregarSelects();
        } else {
            const error = await response.json();
            showToast('Erro: ' + error.error, 'error');
        }
    } catch (error) {
        showToast('Erro ao cadastrar departamento', 'error');
    }
}

async function atualizarDepartamento(id, data) {
    try {
        const response = await fetch(`${API_URL}/departamentos/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            showToast('Departamento atualizado com sucesso!');
            fecharModal();
            carregarDepartamentos();
            carregarSelects();
        } else {
            const error = await response.json();
            showToast('Erro: ' + error.error, 'error');
        }
    } catch (error) {
        showToast('Erro ao atualizar departamento', 'error');
    }
}

async function deletarDepartamento(id) {
    if (!confirm(`Tem certeza que deseja excluir o departamento #${id}?`)) return;
    
    try {
        const response = await fetch(`${API_URL}/departamentos/${id}`, { method: 'DELETE' });
        if (response.ok) {
            showToast('Departamento removido com sucesso!');
            carregarDepartamentos();
            carregarSelects();
        } else {
            showToast('Erro ao remover departamento', 'error');
        }
    } catch (error) {
        showToast('Erro ao remover departamento', 'error');
    }
}

// ========================================
// FUNÇÕES DE CRUD - EQUIPAMENTOS
// ========================================
async function carregarEquipamentos() {
    try {
        const response = await fetch(`${API_URL}/equipamentos`);
        const equipamentos = await response.json();
        const tbody = document.getElementById('tbodyGestao');
        if (!tbody) return;
        
        if (!equipamentos || equipamentos.length === 0) {
            tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; padding:40px;">Nenhum equipamento cadastrado</td></tr>`;
            return;
        }
        
        tbody.innerHTML = equipamentos.map(e => `
            <tr>
                <td>#${e.id}</td>
                <td>${e.nome}</td>
                <td>
                    <button class="btn-edit" onclick="abrirModal('equipamentos', ${e.id})"><i class="fas fa-edit"></i></button>
                    <button class="btn-delete" onclick="deletarEquipamento(${e.id})"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Erro:', error);
    }
}

async function criarEquipamento(data) {
    try {
        const response = await fetch(`${API_URL}/equipamentos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            showToast('Equipamento cadastrado com sucesso!');
            fecharModal();
            carregarEquipamentos();
            carregarSelects();
        } else {
            const error = await response.json();
            showToast('Erro: ' + error.error, 'error');
        }
    } catch (error) {
        showToast('Erro ao cadastrar equipamento', 'error');
    }
}

async function atualizarEquipamento(id, data) {
    try {
        const response = await fetch(`${API_URL}/equipamentos/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            showToast('Equipamento atualizado com sucesso!');
            fecharModal();
            carregarEquipamentos();
            carregarSelects();
        } else {
            const error = await response.json();
            showToast('Erro: ' + error.error, 'error');
        }
    } catch (error) {
        showToast('Erro ao atualizar equipamento', 'error');
    }
}

async function deletarEquipamento(id) {
    if (!confirm(`Tem certeza que deseja excluir o equipamento #${id}?`)) return;
    
    try {
        const response = await fetch(`${API_URL}/equipamentos/${id}`, { method: 'DELETE' });
        if (response.ok) {
            showToast('Equipamento removido com sucesso!');
            carregarEquipamentos();
            carregarSelects();
        } else {
            showToast('Erro ao remover equipamento', 'error');
        }
    } catch (error) {
        showToast('Erro ao remover equipamento', 'error');
    }
}

// ========================================
// MODAL PARA CRUD
// ========================================
async function abrirModal(tipo, id = null) {
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    
    const nomes = {
        usuarios: 'Usuário',
        tecnicos: 'Técnico',
        departamentos: 'Departamento',
        equipamentos: 'Equipamento'
    };
    
    editType = tipo;
    editId = id;
    
    const titulo = id ? `Editar ${nomes[tipo]}` : `Novo ${nomes[tipo]}`;
    modalTitle.textContent = titulo;
    
    let html = '';
    
    if (tipo === 'usuarios') {
        // Carregar departamentos para o select
        const deptRes = await fetch(`${API_URL}/departamentos`);
        const depts = await deptRes.json();
        
        let dados = {};
        if (id) {
            const res = await fetch(`${API_URL}/usuarios`);
            const usuarios = await res.json();
            dados = usuarios.find(u => u.id === id);
        }
        
        html = `
            <div class="form-group">
                <label>Nome</label>
                <input type="text" id="campoNome" value="${dados?.nome || ''}" placeholder="Nome completo">
            </div>
            <div class="form-group">
                <label>Email</label>
                <input type="email" id="campoEmail" value="${dados?.email || ''}" placeholder="email@exemplo.com">
            </div>
            <div class="form-group">
                <label>Cargo</label>
                <input type="text" id="campoCargo" value="${dados?.cargo || ''}" placeholder="Cargo do usuário">
            </div>
            <div class="form-group">
                <label>Departamento</label>
                <select id="campoDepartamento">
                    <option value="">Selecione</option>
                    ${depts.map(d => `<option value="${d.id}" ${dados?.departamento === d.nome ? 'selected' : ''}>${d.nome}</option>`).join('')}
                </select>
            </div>
        `;
    } else if (tipo === 'tecnicos') {
        const deptRes = await fetch(`${API_URL}/departamentos`);
        const depts = await deptRes.json();
        
        let dados = {};
        if (id) {
            const res = await fetch(`${API_URL}/tecnicos`);
            const tecnicos = await res.json();
            dados = tecnicos.find(t => t.id === id);
        }
        
        html = `
            <div class="form-group">
                <label>Nome</label>
                <input type="text" id="campoNome" value="${dados?.nome || ''}" placeholder="Nome do técnico">
            </div>
            <div class="form-group">
                <label>Função</label>
                <input type="text" id="campoFuncao" value="${dados?.funcao || ''}" placeholder="Ex: Suporte N2">
            </div>
            <div class="form-group">
                <label>Departamento</label>
                <select id="campoDepartamento">
                    <option value="">Selecione</option>
                    ${depts.map(d => `<option value="${d.id}" ${dados?.departamento === d.nome ? 'selected' : ''}>${d.nome}</option>`).join('')}
                </select>
            </div>
        `;
    } else if (tipo === 'departamentos') {
        let dados = {};
        if (id) {
            const res = await fetch(`${API_URL}/departamentos`);
            const depts = await res.json();
            dados = depts.find(d => d.id === id);
        }
        
        html = `
            <div class="form-group">
                <label>Nome do Departamento</label>
                <input type="text" id="campoNome" value="${dados?.nome || ''}" placeholder="Ex: Recursos Humanos">
            </div>
        `;
    } else if (tipo === 'equipamentos') {
        let dados = {};
        if (id) {
            const res = await fetch(`${API_URL}/equipamentos`);
            const equip = await res.json();
            dados = equip.find(e => e.id === id);
        }
        
        html = `
            <div class="form-group">
                <label>Nome do Equipamento</label>
                <input type="text" id="campoNome" value="${dados?.nome || ''}" placeholder="Ex: Notebook Dell XPS">
            </div>
        `;
    }
    
    html += `
        <div class="modal-actions">
            <button class="btn-secondary" onclick="fecharModal()">Cancelar</button>
            <button class="btn-success" onclick="salvarModal()">${id ? 'Atualizar' : 'Cadastrar'}</button>
        </div>
    `;
    
    modalBody.innerHTML = html;
    modal.style.display = 'block';
}

function fecharModal() {
    document.getElementById('modal').style.display = 'none';
    editId = null;
    editType = null;
}

function salvarModal() {
    const tipo = editType;
    const id = editId;
    
    const getValor = (id) => document.getElementById(id)?.value || '';
    
    let data = {};
    
    if (tipo === 'usuarios') {
        data = {
            nome: getValor('campoNome'),
            email: getValor('campoEmail'),
            cargo: getValor('campoCargo'),
            departamento: getValor('campoDepartamento')
        };
        
        if (!data.nome || !data.email || !data.cargo || !data.departamento) {
            showToast('Preencha todos os campos!', 'error');
            return;
        }
        
        if (id) {
            atualizarUsuario(id, data);
        } else {
            criarUsuario(data);
        }
    } else if (tipo === 'tecnicos') {
        data = {
            nome: getValor('campoNome'),
            funcao: getValor('campoFuncao'),
            departamento: getValor('campoDepartamento')
        };
        
        if (!data.nome || !data.funcao || !data.departamento) {
            showToast('Preencha todos os campos!', 'error');
            return;
        }
        
        if (id) {
            atualizarTecnico(id, data);
        } else {
            criarTecnico(data);
        }
    } else if (tipo === 'departamentos') {
        data = { nome: getValor('campoNome') };
        
        if (!data.nome) {
            showToast('Preencha o nome do departamento!', 'error');
            return;
        }
        
        if (id) {
            atualizarDepartamento(id, data);
        } else {
            criarDepartamento(data);
        }
    } else if (tipo === 'equipamentos') {
        data = { nome: getValor('campoNome') };
        
        if (!data.nome) {
            showToast('Preencha o nome do equipamento!', 'error');
            return;
        }
        
        if (id) {
            atualizarEquipamento(id, data);
        } else {
            criarEquipamento(data);
        }
    }
}

// ========================================
// FUNÇÕES DE CHAMADOS
// ========================================
async function carregarSelects() {
    try {
        // Usuários
        const usersRes = await fetch(`${API_URL}/usuarios`);
        const users = await usersRes.json();
        const selectUsuario = document.getElementById('usuario');
        if (selectUsuario) {
            selectUsuario.innerHTML = `<option value="">Selecione o usuário</option>` + 
                users.map(u => `<option value="${u.id}">${u.nome}</option>`).join('');
        }
        
        // Técnicos
        const tecRes = await fetch(`${API_URL}/tecnicos`);
        const tecnicos = await tecRes.json();
        const selectTecnico = document.getElementById('tecnico');
        if (selectTecnico) {
            selectTecnico.innerHTML = `<option value="">Selecione o técnico</option>` + 
                tecnicos.map(t => `<option value="${t.id}">${t.nome}</option>`).join('');
        }
        
        // Departamentos
        const deptRes = await fetch(`${API_URL}/departamentos`);
        const deptos = await deptRes.json();
        const selectDepto = document.getElementById('departamento');
        if (selectDepto) {
            selectDepto.innerHTML = `<option value="">Selecione o departamento</option>` + 
                deptos.map(d => `<option value="${d.id}">${d.nome}</option>`).join('');
        }
        
        // Equipamentos
        const eqRes = await fetch(`${API_URL}/equipamentos`);
        const equipamentos = await eqRes.json();
        const selectEquip = document.getElementById('equipamento');
        if (selectEquip) {
            selectEquip.innerHTML = `<option value="">Selecione o equipamento (opcional)</option>` + 
                equipamentos.map(e => `<option value="${e.id}">${e.nome}</option>`).join('');
        }
    } catch (error) {
        console.error('Erro ao carregar selects:', error);
    }
}

async function criarChamado(e) {
    e.preventDefault();
    
    const formData = {
        local: document.getElementById('local').value,
        descricao: document.getElementById('descricao').value,
        prioridade: document.getElementById('prioridade').value,
        usuario: parseInt(document.getElementById('usuario').value),
        tecnico: parseInt(document.getElementById('tecnico').value),
        departamento: parseInt(document.getElementById('departamento').value),
        equipamento: document.getElementById('equipamento').value ? parseInt(document.getElementById('equipamento').value) : null
    };
    
    if (!formData.local || !formData.descricao || !formData.prioridade || 
        !formData.usuario || !formData.tecnico || !formData.departamento) {
        showToast('Preencha todos os campos obrigatórios!', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/chamados`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            showToast('Chamado criado com sucesso!');
            document.getElementById('formChamado').reset();
            carregarTab('dashboard');
            // Mudar para dashboard
            document.querySelectorAll('.sidebar-nav ul li').forEach(li => li.classList.remove('active'));
            document.querySelector('[data-tab="dashboard"]').classList.add('active');
        } else {
            const error = await response.json();
            showToast('Erro: ' + error.error, 'error');
        }
    } catch (error) {
        showToast('Erro ao criar chamado', 'error');
    }
}

async function alterarStatus(id) {
    const novoStatus = prompt('Digite o novo status:\n1 - Aberto\n2 - Em Atendimento\n3 - Fechado');
    if (!novoStatus) return;
    
    const statusMap = {
        '1': 'Aberto',
        '2': 'Em Atendimento',
        '3': 'Fechado'
    };
    
    const status = statusMap[novoStatus];
    if (!status) {
        showToast('Opção inválida! Use 1, 2 ou 3.', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/chamados/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        
        if (response.ok) {
            showToast('Status atualizado!');
            carregarChamados();
            carregarEstatisticas();
        } else {
            const error = await response.json();
            showToast('Erro: ' + error.error, 'error');
        }
    } catch (error) {
        showToast('Erro ao atualizar status', 'error');
    }
}

async function deletarChamado(id) {
    if (!confirm(`Tem certeza que deseja excluir o chamado #${id}?`)) return;
    
    try {
        const response = await fetch(`${API_URL}/chamados/${id}`, { method: 'DELETE' });
        if (response.ok) {
            showToast('Chamado removido!');
            carregarChamados();
            carregarEstatisticas();
        } else {
            showToast('Erro ao remover chamado', 'error');
        }
    } catch (error) {
        showToast('Erro ao remover chamado', 'error');
    }
}

// ========================================
// ESTATÍSTICAS
// ========================================
async function carregarEstatisticas() {
    try {
        const response = await fetch(`${API_URL}/estatisticas`);
        const stats = await response.json();
        
        const total = stats.reduce((acc, s) => acc + s.quantidade, 0);
        const statTotal = document.getElementById('stat-total');
        if (statTotal) statTotal.textContent = total;
        
        stats.forEach(stat => {
            const key = stat.status.toLowerCase().replace(/\s/g, '');
            const element = document.getElementById(`stat-${key}`);
            if (element) element.textContent = stat.quantidade;
        });
    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
    }
}

// ========================================
// CARREGAR DADOS GERAIS
// ========================================
function carregarDados() {
    if (currentTab === 'dashboard') {
        carregarChamados();
        carregarEstatisticas();
    } else if (currentTab === 'usuarios') {
        carregarUsuarios();
    } else if (currentTab === 'tecnicos') {
        carregarTecnicos();
    } else if (currentTab === 'departamentos') {
        carregarDepartamentos();
    } else if (currentTab === 'equipamentos') {
        carregarEquipamentos();
    }
}

// ========================================
// UTILITÁRIOS
// ========================================
function formatarData(data) {
    if (!data) return '-';
    const d = new Date(data);
    return d.toLocaleDateString('pt-BR');
}

// ========================================
// INICIALIZAÇÃO
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    carregarTab('dashboard');
});

// Fechar modal clicando fora
window.onclick = function(event) {
    const modal = document.getElementById('modal');
    if (event.target === modal) {
        fecharModal();
    }
}