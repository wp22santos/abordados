// Máscaras para CPF e RG
function mascararCPF(cpf) {
    return cpf
        .replace(/\D/g, '')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})/, '$1-$2')
        .replace(/(-\d{2})\d+?$/, '$1');
}

function mascararRG(rg) {
    return rg
        .replace(/\D/g, '')
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})/, '$1-$2')
        .replace(/(-\d{1})\d+?$/, '$1');
}

// Gerenciamento de dados
class GerenciadorDados {
    constructor() {
        this.registros = JSON.parse(localStorage.getItem('registros')) || [];
        this.modoEdicao = false;
        this.registroEditandoId = null;
        this.pendingSync = JSON.parse(localStorage.getItem('pendingSync')) || [];
        
        // Inicializar Google Sheets
        this.initGoogleSheets();
    }

    async initGoogleSheets() {
        try {
            const isAuthenticated = await googleSheets.initialize();
            if (isAuthenticated) {
                this.syncPendingRegistros();
            }
        } catch (error) {
            console.error('Erro ao inicializar Google Sheets:', error);
        }
    }

    async adicionar(dados) {
        const novoRegistro = {
            id: Date.now(),
            ...dados,
            dataCadastro: new Date().toISOString()
        };

        this.registros.push(novoRegistro);
        this.salvarNoLocalStorage();

        // Tentar sincronizar com Google Sheets
        try {
            if (navigator.onLine) {
                await googleSheets.syncRegistro(novoRegistro);
            } else {
                this.pendingSync.push(novoRegistro);
                localStorage.setItem('pendingSync', JSON.stringify(this.pendingSync));
            }
        } catch (error) {
            console.error('Erro ao sincronizar:', error);
            this.pendingSync.push(novoRegistro);
            localStorage.setItem('pendingSync', JSON.stringify(this.pendingSync));
        }

        return novoRegistro;
    }

    async syncPendingRegistros() {
        if (this.pendingSync.length > 0) {
            const registrosPendentes = [...this.pendingSync];
            this.pendingSync = [];
            localStorage.setItem('pendingSync', JSON.stringify(this.pendingSync));

            for (const registro of registrosPendentes) {
                try {
                    await googleSheets.syncRegistro(registro);
                } catch (error) {
                    console.error('Erro ao sincronizar registro pendente:', error);
                    this.pendingSync.push(registro);
                    localStorage.setItem('pendingSync', JSON.stringify(this.pendingSync));
                    break;
                }
            }
        }
    }

    editar(id, dados) {
        const index = this.registros.findIndex(r => r.id === id);
        if (index !== -1) {
            this.registros[index] = { ...this.registros[index], ...dados };
            this.salvarNoLocalStorage();
            return true;
        }
        return false;
    }

    excluir(id) {
        this.registros = this.registros.filter(r => r.id !== id);
        this.salvarNoLocalStorage();
    }

    buscar(termo) {
        termo = termo.toLowerCase();
        return this.registros.filter(registro => 
            registro.nome?.toLowerCase().includes(termo) ||
            registro.mae?.toLowerCase().includes(termo) ||
            registro.pai?.toLowerCase().includes(termo) ||
            registro.apelido?.toLowerCase().includes(termo) ||
            registro.cpf?.includes(termo) ||
            registro.rg?.includes(termo)
        );
    }

    exportarDados() {
        const dados = JSON.stringify(this.registros, null, 2);
        const blob = new Blob([dados], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `registros_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    salvarNoLocalStorage() {
        localStorage.setItem('registros', JSON.stringify(this.registros));
    }
}

// Inicialização e eventos
document.addEventListener('DOMContentLoaded', () => {
    const gerenciador = new GerenciadorDados();
    const form = document.getElementById('cadastroForm');
    const registrosList = document.getElementById('registrosList');
    const searchInput = document.getElementById('searchInput');
    const exportBtn = document.getElementById('exportBtn');
    const inputFoto = document.getElementById('foto');
    const fotosGrid = document.getElementById('fotosGrid');
    const btnFoto = document.getElementById('btnFoto');
    const btnLocalizacao = document.getElementById('btnLocalizacao');
    const coordenadasTexto = document.getElementById('coordenadasTexto');
    let mapa, marcador;
    let fotos = [];
    let localizacaoAtual = null;

    // Inicializar mapa
    function inicializarMapa() {
        mapa = L.map('mapa').setView([-15.7801, -47.9292], 13); // Coordenadas default: Brasília
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(mapa);
        marcador = L.marker([-15.7801, -47.9292]).addTo(mapa);
    }

    // Atualizar localização
    async function atualizarLocalizacao() {
        try {
            const options = {
                enableHighAccuracy: true, // Força o uso do GPS
                timeout: 10000,           // Tempo máximo de espera: 10 segundos
                maximumAge: 0             // Sempre pegar posição atual
            };

            const posicao = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, options);
            });

            const { latitude, longitude, accuracy } = posicao.coords;
            localizacaoAtual = { 
                latitude, 
                longitude,
                accuracy // Precisão em metros
            };
            
            mapa.setView([latitude, longitude], 16);
            marcador.setLatLng([latitude, longitude]);
            
            coordenadasTexto.textContent = `Latitude: ${latitude.toFixed(6)}, Longitude: ${longitude.toFixed(6)} (Precisão: ${accuracy.toFixed(0)}m)`;
        } catch (erro) {
            console.error('Erro ao obter localização:', erro);
            mostrarMensagem('Erro ao obter localização! Verifique se o GPS está ativado.', 'erro');
        }
    }

    // Manipulação de fotos
    function adicionarPreviewFoto(file) {
        return new Promise((resolve, reject) => {
            // Verifica o tamanho do arquivo (máximo 5MB)
            if (file.size > 5 * 1024 * 1024) {
                mostrarMensagem('Arquivo muito grande! Máximo 5MB', 'erro');
                reject(new Error('Arquivo muito grande'));
                return;
            }

            const reader = new FileReader();
            
            reader.onload = (e) => {
                // Comprimir a imagem antes de salvar
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    
                    // Redimensionar se a imagem for muito grande
                    const MAX_SIZE = 1024;
                    if (width > height && width > MAX_SIZE) {
                        height *= MAX_SIZE / width;
                        width = MAX_SIZE;
                    } else if (height > MAX_SIZE) {
                        width *= MAX_SIZE / height;
                        height = MAX_SIZE;
                    }

                    canvas.width = width;
                    canvas.height = height;
                    
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // Converter para JPEG com qualidade reduzida
                    const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
                    
                    const fotoId = Date.now();
                    fotos.push({
                        id: fotoId,
                        data: compressedDataUrl
                    });

                    const previewDiv = document.createElement('div');
                    previewDiv.className = 'foto-preview';
                    previewDiv.innerHTML = `
                        <img src="${compressedDataUrl}" alt="Foto">
                        <button class="remover-foto" data-id="${fotoId}">
                            <i class="fas fa-times"></i>
                        </button>
                    `;

                    fotosGrid.appendChild(previewDiv);

                    previewDiv.querySelector('.remover-foto').addEventListener('click', () => {
                        fotos = fotos.filter(f => f.id !== fotoId);
                        previewDiv.remove();
                    });

                    resolve();
                };
                
                img.src = e.target.result;
            };
            
            reader.onerror = () => {
                mostrarMensagem('Erro ao processar a foto!', 'erro');
                reject(new Error('Erro ao ler arquivo'));
            };
            
            reader.readAsDataURL(file);
        });
    }

    // Manipulação de foto
    btnFoto.addEventListener('click', () => {
        inputFoto.click();
    });

    inputFoto.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        files.forEach(adicionarPreviewFoto);
        inputFoto.value = ''; // Limpa o input para permitir selecionar a mesma foto novamente
    });

    // Atualizar localização
    btnLocalizacao.addEventListener('click', atualizarLocalizacao);

    // Aplicar máscaras
    document.getElementById('cpf').addEventListener('input', (e) => {
        e.target.value = mascararCPF(e.target.value);
    });

    document.getElementById('rg').addEventListener('input', (e) => {
        e.target.value = mascararRG(e.target.value);
    });

    // Mostrar mensagem
    function mostrarMensagem(texto, tipo) {
        const mensagem = document.getElementById('mensagem');
        mensagem.textContent = texto;
        mensagem.className = `mensagem ${tipo}`;
        mensagem.style.display = 'block';
        setTimeout(() => {
            mensagem.style.display = 'none';
        }, 3000);
    }

    // Renderizar registros
    function renderizarRegistros(registros = gerenciador.registros) {
        registrosList.innerHTML = registros.map(registro => `
            <div class="registro-item">
                <div class="registro-fotos">
                    ${registro.fotos ? registro.fotos.map(foto => `
                        <div class="registro-foto">
                            <img src="${foto.data}" alt="Foto">
                        </div>
                    `).join('') : ''}
                </div>
                <div class="registro-info">
                    <p><strong>Nome:</strong> ${registro.nome || '-'}</p>
                    <p><strong>Mãe:</strong> ${registro.mae || '-'}</p>
                    <p><strong>Pai:</strong> ${registro.pai || '-'}</p>
                    <p><strong>Data de Nascimento:</strong> ${registro.nascimento ? new Date(registro.nascimento).toLocaleDateString() : '-'}</p>
                    <p><strong>RG:</strong> ${registro.rg || '-'}</p>
                    <p><strong>CPF:</strong> ${registro.cpf || '-'}</p>
                    <p><strong>Apelido:</strong> ${registro.apelido || '-'}</p>
                    <p><strong>Data de Cadastro:</strong> ${new Date(registro.dataCadastro).toLocaleString()}</p>
                    ${registro.localizacao ? `
                        <p><strong>Localização:</strong> Lat: ${registro.localizacao.latitude.toFixed(6)}, Long: ${registro.localizacao.longitude.toFixed(6)}</p>
                        <div class="registro-mapa" id="mapa-${registro.id}"></div>
                    ` : ''}
                    <div class="acoes">
                        <button onclick="editarRegistro(${registro.id})" class="btn-editar">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button onclick="excluirRegistro(${registro.id})" class="btn-excluir">
                            <i class="fas fa-trash"></i> Excluir
                        </button>
                    </div>
                </div>
            </div>
        `).join('');

        // Inicializar mapas dos registros
        registros.forEach(registro => {
            if (registro.localizacao) {
                const mapaRegistro = L.map(`mapa-${registro.id}`).setView(
                    [registro.localizacao.latitude, registro.localizacao.longitude],
                    13
                );
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap contributors'
                }).addTo(mapaRegistro);
                L.marker([registro.localizacao.latitude, registro.localizacao.longitude]).addTo(mapaRegistro);
            }
        });
    }

    // Manipulação do formulário
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        try {
            // Verificar espaço disponível no localStorage
            const storageEstimate = await navigator.storage?.estimate?.() || { usage: 0, quota: 0 };
            const usedSpace = storageEstimate.usage || 0;
            const totalSpace = storageEstimate.quota || 0;
            const availableSpace = totalSpace - usedSpace;

            // Estimar tamanho dos dados (incluindo fotos)
            const dadosString = JSON.stringify(fotos);
            const dadosSize = new Blob([dadosString]).size;

            if (dadosSize > availableSpace) {
                mostrarMensagem('Sem espaço para salvar! Exporte e limpe alguns dados.', 'erro');
                return;
            }

            const dados = {
                nome: document.getElementById('nome').value,
                mae: document.getElementById('mae').value,
                pai: document.getElementById('pai').value,
                nascimento: document.getElementById('nascimento').value,
                rg: document.getElementById('rg').value,
                cpf: document.getElementById('cpf').value,
                apelido: document.getElementById('apelido').value,
                fotos: fotos,
                localizacao: localizacaoAtual,
                dataHora: new Date().toISOString()
            };

            if (gerenciador.modoEdicao) {
                await gerenciador.editar(gerenciador.registroEditandoId, dados);
                gerenciador.modoEdicao = false;
                gerenciador.registroEditandoId = null;
                document.getElementById('submitBtn').textContent = 'Cadastrar';
                mostrarMensagem('Registro atualizado com sucesso!', 'sucesso');
            } else {
                await gerenciador.adicionar(dados);
                mostrarMensagem('Registro adicionado com sucesso!', 'sucesso');
            }

            form.reset();
            fotos = [];
            fotosGrid.innerHTML = '';
            renderizarRegistros();
        } catch (erro) {
            console.error('Erro ao salvar:', erro);
            mostrarMensagem('Erro ao salvar! Verifique o tamanho das fotos.', 'erro');
        }
    });

    // Busca
    searchInput.addEventListener('input', (e) => {
        const resultados = gerenciador.buscar(e.target.value);
        renderizarRegistros(resultados);
    });

    // Exportação
    exportBtn.addEventListener('click', () => {
        gerenciador.exportarDados();
    });

    // Configurações do Modal
    const modal = document.getElementById('modalConfig');
    const btnConfig = document.getElementById('btnConfig');
    const btnFechar = document.querySelector('.btn-fechar');
    const btnCriarPlanilha = document.getElementById('btnCriarPlanilha');
    const btnLimparConfig = document.getElementById('btnLimparConfig');
    const statusGoogle = document.getElementById('statusGoogle');
    const planilhaId = document.getElementById('planilhaId');

    // Funções do Modal
    function abrirModal() {
        modal.style.display = 'block';
        atualizarStatusGoogle();
    }

    function fecharModal() {
        modal.style.display = 'none';
    }

    function atualizarStatusGoogle() {
        const id = localStorage.getItem('spreadsheetId');
        if (id) {
            statusGoogle.textContent = 'Conectado';
            statusGoogle.style.color = 'var(--success-color)';
            planilhaId.textContent = id;
        } else {
            statusGoogle.textContent = 'Não conectado';
            statusGoogle.style.color = 'var(--error-color)';
            planilhaId.textContent = 'Nenhuma';
        }
    }

    // Eventos do Modal
    btnConfig.addEventListener('click', abrirModal);
    btnFechar.addEventListener('click', fecharModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) fecharModal();
    });

    // Criar Planilha
    btnCriarPlanilha.addEventListener('click', async () => {
        btnCriarPlanilha.disabled = true;
        btnCriarPlanilha.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Criando...';
        
        try {
            const success = await googleSheets.setupSpreadsheet();
            if (success) {
                mostrarMensagem('Planilha criada com sucesso! Verifique seu navegador.', 'sucesso');
                atualizarStatusGoogle();
            } else {
                mostrarMensagem('Erro ao criar planilha. Tente novamente.', 'erro');
            }
        } catch (error) {
            console.error('Erro:', error);
            mostrarMensagem('Erro ao criar planilha. Tente novamente.', 'erro');
        } finally {
            btnCriarPlanilha.disabled = false;
            btnCriarPlanilha.innerHTML = '<i class="fas fa-plus"></i> Criar Nova Planilha';
        }
    });

    // Limpar Configuração
    btnLimparConfig.addEventListener('click', () => {
        if (confirm('Tem certeza que deseja remover a conexão com a planilha?')) {
            localStorage.removeItem('spreadsheetId');
            atualizarStatusGoogle();
            mostrarMensagem('Configuração removida com sucesso!', 'sucesso');
        }
    });

    // Remover botão antigo de criar planilha
    const btnAntigo = document.getElementById('criarPlanilhaBtn');
    if (btnAntigo) {
        btnAntigo.parentElement.removeChild(btnAntigo);
    }

    // Funções globais para edição e exclusão
    window.editarRegistro = (id) => {
        const registro = gerenciador.registros.find(r => r.id === id);
        if (registro) {
            document.getElementById('nome').value = registro.nome || '';
            document.getElementById('mae').value = registro.mae || '';
            document.getElementById('pai').value = registro.pai || '';
            document.getElementById('nascimento').value = registro.nascimento || '';
            document.getElementById('rg').value = registro.rg || '';
            document.getElementById('cpf').value = registro.cpf || '';
            document.getElementById('apelido').value = registro.apelido || '';
            
            // Carregar fotos
            fotos = registro.fotos || [];
            fotosGrid.innerHTML = '';
            fotos.forEach(foto => {
                const previewDiv = document.createElement('div');
                previewDiv.className = 'foto-preview';
                previewDiv.innerHTML = `
                    <img src="${foto.data}" alt="Foto">
                    <button class="remover-foto" data-id="${foto.id}">
                        <i class="fas fa-times"></i>
                    </button>
                `;
                fotosGrid.appendChild(previewDiv);

                previewDiv.querySelector('.remover-foto').addEventListener('click', () => {
                    fotos = fotos.filter(f => f.id !== foto.id);
                    previewDiv.remove();
                });
            });

            // Carregar localização
            if (registro.localizacao) {
                localizacaoAtual = registro.localizacao;
                mapa.setView([registro.localizacao.latitude, registro.localizacao.longitude], 16);
                marcador.setLatLng([registro.localizacao.latitude, registro.localizacao.longitude]);
                coordenadasTexto.textContent = `Latitude: ${registro.localizacao.latitude.toFixed(6)}, Longitude: ${registro.localizacao.longitude.toFixed(6)}`;
            }
            
            gerenciador.modoEdicao = true;
            gerenciador.registroEditandoId = id;
            document.getElementById('submitBtn').textContent = 'Atualizar';
        }
    };

    window.excluirRegistro = (id) => {
        if (confirm('Tem certeza que deseja excluir este registro?')) {
            gerenciador.excluir(id);
            renderizarRegistros();
            mostrarMensagem('Registro excluído com sucesso!', 'sucesso');
        }
    };

    // Função para limpar dados antigos se necessário
    async function limparDadosAntigos() {
        try {
            const registros = gerenciador.registros;
            if (registros.length > 100) { // Limite de 100 registros
                registros.sort((a, b) => new Date(b.dataCadastro) - new Date(a.dataCadastro));
                gerenciador.registros = registros.slice(0, 100);
                gerenciador.salvarNoLocalStorage();
                mostrarMensagem('Alguns registros antigos foram removidos para liberar espaço', 'erro');
            }
        } catch (erro) {
            console.error('Erro ao limpar dados:', erro);
        }
    }

    // Verificar espaço periodicamente
    setInterval(limparDadosAntigos, 60000); // Verificar a cada minuto

    // Inicialização
    inicializarMapa();
    atualizarLocalizacao();
    renderizarRegistros();
}); 

// Adicionar indicador de sincronização ao status
function atualizarStatusConexao() {
    const status = document.getElementById('statusConexao');
    if (navigator.onLine) {
        status.classList.remove('esta-offline');
        status.classList.add('esta-online');
        // Tentar sincronizar quando voltar online
        if (gerenciador) {
            gerenciador.syncPendingRegistros();
        }
    } else {
        status.classList.remove('esta-online');
        status.classList.add('esta-offline');
    }
}