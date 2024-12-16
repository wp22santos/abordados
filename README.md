# Sistema de Cadastro de Abordados

Sistema web para cadastro de pessoas com suporte a fotos e localização GPS, funcionando offline.

## Funcionalidades

- Cadastro de pessoas com campos:
  - Nome
  - Nome da Mãe
  - Nome do Pai
  - Data de Nascimento
  - RG
  - CPF
  - Apelido
  - Múltiplas Fotos
  - Localização GPS

- Recursos:
  - Funciona 100% offline (PWA)
  - Captura de fotos pela câmera
  - GPS de alta precisão
  - Busca em todos os campos
  - Edição e exclusão de registros
  - Exportação de dados
  - Interface responsiva

## Instalação

1. Clone o repositório:
```bash
git clone https://github.com/wp22santos/abordados.git
```

2. Abra o arquivo `index.html` em um servidor web
   - Pode usar o Live Server do VS Code
   - Ou qualquer outro servidor HTTP

3. Para funcionar offline:
   - Acesse primeiro com internet para cachear os recursos
   - Depois pode usar normalmente sem internet

## Uso

1. **Fotos**:
   - Clique em "Adicionar Foto"
   - Use a câmera ou escolha da galeria
   - Pode adicionar várias fotos
   - Clique no X para remover

2. **Localização**:
   - Permita o acesso ao GPS quando solicitado
   - Clique em "Atualizar Localização" se necessário
   - Mostra precisão em metros

3. **Dados**:
   - Preencha os campos desejados (todos opcionais)
   - CPF e RG têm formatação automática
   - Clique em Cadastrar

4. **Registros**:
   - Use a busca para filtrar registros
   - Clique em Editar para modificar
   - Clique em Excluir para remover
   - Use Exportar para baixar os dados

## Tecnologias

- HTML5
- CSS3
- JavaScript (Vanilla)
- Service Worker para offline
- LocalStorage para dados
- Leaflet para mapas

## Licença

MIT 