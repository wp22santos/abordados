# Sistema de Registro de Abordagem Policial

Sistema web para registro de abordagens policiais com suporte a fotos, geolocalização e sincronização com Google Sheets.

## Funcionalidades

- Registro de dados pessoais (nome, filiação, documentos, etc.)
- Captura de fotos com compressão automática
- Geolocalização precisa com GPS
- Armazenamento offline com localStorage
- Sincronização com Google Sheets
- Interface adaptada para uso móvel
- Busca por nome, RG ou CPF
- Exportação de dados em JSON

## Instalação

1. Clone o repositório:
```bash
git clone [URL_DO_SEU_REPOSITORIO]
```

2. Abra o arquivo `index.html` em um servidor web local.
   - Você pode usar o Python: `python -m http.server 8000`
   - Ou o Live Server do VS Code

3. Configure o Google Sheets:
   - Acesse https://script.google.com
   - Crie um novo projeto
   - Cole o código do arquivo `google-apps-script.txt`
   - Publique como aplicativo web
   - Copie o ID do script e atualize em `googleSheets.js`

## Uso

1. Abra o sistema no navegador
2. Configure a integração com Google Sheets no ícone de engrenagem
3. Preencha os dados do abordado
4. Tire fotos usando o botão da câmera
5. Atualize a localização se necessário
6. Clique em "Registrar Abordagem"

Os dados serão salvos localmente e sincronizados com o Google Sheets quando houver conexão.

## Tecnologias

- HTML5
- CSS3
- JavaScript (ES6+)
- Leaflet.js para mapas
- Google Sheets API
- LocalStorage para dados offline

## Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes. 