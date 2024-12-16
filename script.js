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
    }

    async adicionar(dados) {
        const novoRegistro = {
            id: Date.now(),
            ...dados,
            dataCadastro: new Date().toISOString()
        };

        this.registros.push(novoRegistro);
        this.salvarNoLocalStorage();
        return novoRegistro;
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
        const reader = new FileReader();
        reader.onload = (e) => {
            const fotoId = Date.now();
            fotos.push({
                id: fotoId,
                data: e.target.result
            });

            const previewDiv = document.createElement('div');
            previewDiv.className = 'foto-preview';
            previewDiv.innerHTML = `
                <img src="${e.target.result}" alt="Foto">
                <button class="remover-foto" data-id="${fotoId}">
                    <i class="fas fa-times"></i>
                </button>
            `;

            fotosGrid.appendChild(previewDiv);

            // Evento para remover foto
            previewDiv.querySelector('.remover-foto').addEventListener('click', () => {
                fotos = fotos.filter(f => f.id !== fotoId);
                previewDiv.remove();
            });
        };
        reader.readAsDataURL(file);
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

        const dados = {
            nome: document.getElementById('nome').value,
            mae: document.getElementById('mae').value,
            pai: document.getElementById('pai').value,
            nascimento: document.getElementById('nascimento').value,
            rg: document.getElementById('rg').value,
            cpf: document.getElementById('cpf').value,
            apelido: document.getElementById('apelido').value,
            fotos: fotos,
            localizacao: localizacaoAtual
        };

        try {
            if (gerenciador.modoEdicao) {
                gerenciador.editar(gerenciador.registroEditandoId, dados);
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
            mostrarMensagem('Erro ao salvar o registro!', 'erro');
            console.error(erro);
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

    // Inicialização
    inicializarMapa();
    atualizarLocalizacao();
    renderizarRegistros();
}); 