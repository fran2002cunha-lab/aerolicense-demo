# AeroLicense — Plataforma Digital de Gestão Documental para Aviação

Plataforma que usa **blockchain Ethereum** para garantir a autenticidade e imutabilidade de documentos de profissionais de aviação (pilotos, cabin crew, técnicos).

**Stack:** Python · JavaScript · Solidity · FastAPI · React · Web3.py · Ethereum

---

## Estrutura do Projeto

```
aerolicense-demo/
├── smart_contract/
│   └── AeroLicenseRegistry.sol   # Contrato Solidity — registo na blockchain
├── backend/
│   ├── main.py                   # API REST (FastAPI + Web3.py)
│   └── blockchain.py             # Utilitários e demonstração de hashing
└── frontend/
    └── src/components/
        ├── DocumentCard.jsx      # Componente React — cartão de documento
        └── UploadDocument.jsx    # Componente React — upload e registo
```

---

## Pré-requisitos

- Python 3.9+
- Node.js 18+
- npm ou yarn

Verifica as versões instaladas:
```bash
python3 --version
node --version
npm --version
```

---

## 1. Demonstração Rápida (sem servidor)

A forma mais rápida de ver o projeto em ação — **mostra como o hash SHA-256 deteta falsificações de documentos**:

```bash
python3 backend/blockchain.py
```

Resultado esperado:
```
DEMONSTRAÇÃO: Por que blockchain protege documentos
============================================================
Documento ORIGINAL:
  ATPL License - Miguel Ferreira - Valid until 2026-03-15
Hash SHA-256:
  f5fa1228922f7b4e3e13181d7054cf56785891b7025e0361906b8964ec62eb73

Documento FALSIFICADO (só 1 ano a mais):
  ATPL License - Miguel Ferreira - Valid until 2028-03-15
Hash SHA-256:
  ca26ae93ee7df6764af6689223428eeb13101bf5a4b8b7cc4ab945460b235f99

Hashes são iguais? False
→ A falsificação é detetada imediatamente na verificação.
```

---

## 2. Correr o Backend (API Python)

### Instalar dependências

```bash
cd backend
pip3 install fastapi web3 uvicorn python-multipart pydantic
```

### Configurar variáveis de ambiente

Cria um ficheiro `.env` dentro de `backend/`:
```
BLOCKCHAIN_URL=http://127.0.0.1:8545
CONTRACT_ADDRESS=0xYourContractAddressHere
PRIVATE_KEY=0xYourPrivateKeyHere
```

> Para testes locais sem blockchain real, os valores acima ficam assim mesmo —
> os endpoints de demonstração funcionam sem ligação ativa à rede.

### Iniciar o servidor

```bash
uvicorn main:app --reload
```

A API fica disponível em: **http://localhost:8000**

Documentação automática (Swagger): **http://localhost:8000/docs**

### Endpoints principais

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/` | Estado da API e ligação à blockchain |
| POST | `/documents/upload` | Upload de documento + registo na blockchain |
| GET | `/documents/verify/{hash}` | Verificar autenticidade de um documento |
| GET | `/documents/pilot/{address}` | Listar documentos de um piloto |
| GET | `/documents/expiring?days=30` | Documentos a expirar em N dias |

---

## 3. Correr o Frontend (React)

### Instalar dependências

```bash
cd frontend
npm install react react-dom react-scripts
```

### Configurar a URL da API

Cria um ficheiro `.env` dentro de `frontend/`:
```
REACT_APP_API_URL=http://localhost:8000
```

### Iniciar a app

```bash
npm start
```

A app abre automaticamente em: **http://localhost:3000**

---

## 4. Deploy do Smart Contract (Ethereum)

### Opção A — Rede local (para desenvolvimento)

Instala o Hardhat (ferramenta de desenvolvimento Ethereum):

```bash
npm install --global hardhat
npx hardhat init
```

Copia o contrato para a pasta `contracts/` do Hardhat e corre:

```bash
npx hardhat compile
npx hardhat node                          # inicia blockchain local na porta 8545
npx hardhat run scripts/deploy.js --network localhost
```

O endereço do contrato aparece no terminal — copia para o `.env` do backend.

### Opção B — Testnet Sepolia (ambiente de teste público)

1. Cria uma conta em [Infura](https://infura.io) ou [Alchemy](https://alchemy.com)
2. Obtém ETH de teste em [sepoliafaucet.com](https://sepoliafaucet.com)
3. Deploy:
```bash
npx hardhat run scripts/deploy.js --network sepolia
```

---

## 5. Testar a API manualmente

Com o backend a correr em `localhost:8000`, abre **http://localhost:8000/docs** no browser — tens uma interface interativa para testar todos os endpoints sem escrever código.

Ou via linha de comandos:

```bash
# Verificar estado da API
curl http://localhost:8000/

# Fazer upload de um documento
curl -X POST "http://localhost:8000/documents/upload" \
  -F "file=@/caminho/para/documento.pdf" \
  -F "pilot_address=0xEnderecoDoP iloto" \
  -F "doc_type=ATPL" \
  -F "description=ATPL TAP Air Portugal" \
  -F "expires_at=2026-12-31T00:00:00"

# Verificar autenticidade de um documento pelo hash
curl http://localhost:8000/documents/verify/0xabcdef1234...
```

---

## Como Funciona — Resumo Técnico

```
Piloto faz upload do ficheiro (PDF/JPG)
         ↓
Backend Python calcula SHA-256 do ficheiro
         ↓
Hash enviado para o Smart Contract via Web3.py
         ↓
Hash gravado na blockchain Ethereum (imutável)
         ↓
Metadata guardada em PostgreSQL (título, datas, tipo)
         ↓
Qualquer entidade (ANAC, companhia aérea) pode verificar
o hash diretamente na blockchain — sem aceder ao ficheiro
```

**Por que blockchain?**
- O hash gravado não pode ser alterado por ninguém
- Verificação pública sem revelar o conteúdo do documento
- Auditoria transparente de todas as operações
- Sem ponto central de falha

---

## Desenvolvido por

Frederico Murta — ISEC Lisboa · 2025/2026 
Francisco Cunha
Joao Leao
Manuel Dourado
