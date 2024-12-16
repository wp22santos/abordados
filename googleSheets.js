// Script do Google Apps
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzs5wc4_ztTypVBWUPm66N0vOAPpruAnTPATa8XRMYDZwFsFNrHBaG9NBl2rdixnyoKdw/exec';

class GoogleSheetsSync {
    constructor() {
        this.spreadsheetId = localStorage.getItem('spreadsheetId');
        this.pendingSync = [];
    }

    // Configurar planilha
    async setupSpreadsheet() {
        try {
            const response = await fetch(GOOGLE_SCRIPT_URL, {
                method: 'GET',
                mode: 'cors'
            });

            if (!response.ok) throw new Error('Erro na resposta do servidor');

            const data = await response.json();
            if (!data.success) throw new Error(data.error || 'Erro desconhecido');

            // Salvar ID da planilha
            this.spreadsheetId = data.spreadsheetId;
            localStorage.setItem('spreadsheetId', data.spreadsheetId);
            
            // Abrir planilha no navegador
            window.open(`https://docs.google.com/spreadsheets/d/${data.spreadsheetId}/edit`, '_blank');
            
            return true;
        } catch (error) {
            console.error('Erro ao criar planilha:', error);
            return false;
        }
    }

    // Sincronizar registro
    async syncRegistro(registro) {
        if (!this.spreadsheetId) {
            this.pendingSync.push(registro);
            return false;
        }

        try {
            const data = {
                action: 'addRow',
                spreadsheetId: this.spreadsheetId,
                registro: {
                    id: registro.id,
                    dataHora: registro.dataHora,
                    nome: registro.nome || '',
                    apelido: registro.apelido || '',
                    mae: registro.mae || '',
                    pai: registro.pai || '',
                    nascimento: registro.nascimento || '',
                    rg: registro.rg || '',
                    cpf: registro.cpf || '',
                    latitude: registro.localizacao?.latitude || '',
                    longitude: registro.localizacao?.longitude || '',
                    fotos: registro.fotos ? registro.fotos.length : 0
                }
            };

            const response = await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                mode: 'cors',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) throw new Error('Erro na resposta do servidor');
            
            const result = await response.json();
            if (!result.success) throw new Error(result.error || 'Erro ao sincronizar');
            
            return true;
        } catch (error) {
            console.error('Erro ao sincronizar registro:', error);
            this.pendingSync.push(registro);
            return false;
        }
    }

    // Sincronizar registros pendentes
    async syncPending() {
        if (!navigator.onLine || !this.spreadsheetId || this.pendingSync.length === 0) {
            return;
        }

        const registrosPendentes = [...this.pendingSync];
        this.pendingSync = [];

        for (const registro of registrosPendentes) {
            if (!await this.syncRegistro(registro)) {
                break;
            }
        }
    }
}

// Exportar instância única
const googleSheets = new GoogleSheetsSync();
export default googleSheets; 