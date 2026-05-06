# AeroLicense — Documento de Apresentação

**Projeto académico · ISEC Lisboa**
**Duração da apresentação: 10 minutos**

---

## 1. O Problema

A aviação é uma das indústrias mais regulamentadas do mundo. Pilotos, tripulação de cabine e técnicos de manutenção precisam de manter um conjunto de documentos obrigatórios válidos para poder exercer funções:

- Licença ATPL (Airline Transport Pilot Licence)
- Certificado Médico Classe 1
- Proficiência Linguística ICAO
- Type Rating (habilitação para um avião específico, ex: A320, Boeing 737)
- CRM Training (Crew Resource Management)

**O problema atual tem três dimensões:**

1. **Falsificação** — documentos em papel ou PDF são fáceis de alterar. Uma companhia aérea que contrata um piloto não tem forma simples de verificar se a licença é autêntica sem contactar a autoridade emissora (ANAC, CAA, EASA).

2. **Gestão manual** — os profissionais gerem as datas de validade manualmente, com risco de esquecimento. Um piloto que voa com certificado médico expirado está em incumprimento legal.

3. **Fragmentação** — cada país tem a sua autoridade (ANAC em Portugal, CAA no Reino Unido, EASA na UE) com sistemas diferentes e sem interoperabilidade.

---

## 2. A Solução — AeroLicense

AeroLicense é uma plataforma de gestão documental para profissionais de aviação que usa a **blockchain Ethereum** como sistema de verificação de autenticidade imutável.

**Proposta de valor em uma frase:**  
> Qualquer entidade — companhia aérea, aeroporto, autoridade reguladora — pode verificar a autenticidade de um documento de aviação em segundos, sem contactar quem o emitiu, sem aceder a bases de dados privadas.

---

## 3. Modelo de Negócio

O AeroLicense não é uma ferramenta para o piloto individual — é uma plataforma B2B e B2G:

| Utilizador | Como usa | Valor |
|---|---|---|
| **Autoridades emissoras** (ANAC, CAA, EASA) | Registam documentos na blockchain ao emiti-los | Eliminam fraude na fonte |
| **Companhias aéreas** (TAP, Ryanair, easyJet) | Verificam documentos antes de contratar ou antes de cada voo | Conformidade legal automática |
| **Profissionais de aviação** | Gerem o seu perfil e recebem alertas de validade | Nunca voam com documentos expirados |
| **Aeroportos / Handling** | Leem QR code da licença do piloto no portão | Verificação instantânea no terreno |

**Modelo de receita (hipotético para produção):**
- SaaS por seat para companhias aéreas
- Licença anual para autoridades emissoras
- API pay-per-call para integrações de terceiros

---

## 4. Como a App Funciona — Fluxo Principal

### Registo de um documento

```
Autoridade emissora
        │
        ▼
  Faz upload do PDF da licença para AeroLicense
        │
        ▼
  Backend calcula SHA-256 do ficheiro
  (huella digital única de 64 caracteres)
        │
        ▼
  Hash é gravado no smart contract Ethereum
  (imutável, público, com timestamp)
        │
        ▼
  Metadata guardada em PostgreSQL
  (nome, tipo, datas, emissor)
        │
        ▼
  QR code gerado com URL de verificação
```

### Verificação de um documento

```
Inspetor / Companhia aérea
        │
        ▼
  Lê QR code da licença física
  — ou —
  Acede ao dashboard e insere o hash
        │
        ▼
  Backend consulta smart contract Ethereum:
  "Este hash existe? É válido? Expirou?"
        │
        ▼
  Resposta instantânea:
  ✅ Válido  /  ⚠️ Expirado  /  ❌ Não encontrado
```

**Porquê SHA-256?**  
Se alguém editar o PDF (mudar uma data, um nome, qualquer coisa), o hash resultante é completamente diferente. O hash registado na blockchain já não coincide — a fraude é detetada automaticamente, sem intervenção humana.

---

## 5. Arquitetura Técnica

### Stack completo

```
┌─────────────────────────────────────────────────────┐
│                    FRONTEND                         │
│              React (Vercel CDN)                     │
│         aerolicense.vercel.app                      │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP REST (JSON)
┌──────────────────────▼──────────────────────────────┐
│                    BACKEND                          │
│            Python + FastAPI (Railway)               │
│              api.aerolicense.railway.app             │
│                                                     │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────┐  │
│  │  Web3.py    │  │  SQLAlchemy  │  │  scikit   │  │
│  │ (blockchain)│  │  (PostgreSQL)│  │  -learn   │  │
│  └──────┬──────┘  └──────┬───────┘  └─────┬─────┘  │
└─────────┼────────────────┼────────────────┼─────────┘
          │                │                │
          ▼                ▼                ▼
   Ethereum Node     PostgreSQL        ML Engine
   (Hardhat/local    (Railway)         (anomaly
    ou mainnet)                        detection)
```

### Componentes principais

**`backend/main.py`** — API FastAPI com todos os endpoints:
- `POST /documents/upload` — hash + registo blockchain
- `GET /documents/verify/{hash}` — verificação
- `GET /demo/pilotos` — dados demo dos 3 pilotos
- `GET /analytics/*` — métricas e machine learning
- `POST /chat` — chatbot NLP

**`backend/database.py`** — modelos SQLAlchemy:
- Tabela `pilots` — perfil do profissional
- Tabela `documents` — metadata de cada documento + hash blockchain

**`smart_contract/AeroLicenseRegistry.sol`** — contrato Solidity na Ethereum:
- `registerDocument` — grava hash + metadata on-chain
- `verifyDocument` — consulta pública (sem custo)
- `renewDocument` — atualiza documento, liga ao anterior
- `revokeDocument` — invalida documento
- `issueLicense` — emite NFT ERC-721 para cada licença
- `registerDID / resolveDID` — identidade descentralizada por carteira Ethereum

**`backend/risk.py`** — motor de risco com Machine Learning (scikit-learn):
- Calcula score de risco para cada piloto (0-100)
- Fatores: documentos expirados, proximidade de expiração, historial

**`frontend/src/`** — interface React:
- Dashboard com lista de pilotos e documentos
- Alertas visuais de validade
- Analytics e gráficos
- Chatbot integrado

### Modo demo vs. produção

O backend tem dois modos de funcionamento:

| | Modo Demo | Modo Produção |
|---|---|---|
| Blockchain | Simulada (SHA-256 determinístico) | Ethereum real (Hardhat local ou mainnet) |
| Base de dados | SQLite (local) | PostgreSQL (Railway) |
| Dados | 3 pilotos hardcoded | Dados reais |
| CONTRACT_ADDRESS | Ausente ou placeholder | Endereço válido 0x... (42 chars) |

Em modo demo, **toda a API funciona normalmente** — os hashes são gerados e verificados, os alertas disparam, o ML corre — apenas a escrita real na blockchain é simulada.

---

## 6. Decisões de Arquitetura Relevantes

### "O ficheiro nunca fica na blockchain"

Gravar ficheiros na Ethereum seria proibitivamente caro (cada byte custa gas). A decisão de arquitetura foi guardar apenas o **hash SHA-256** (32 bytes), que é suficiente para provar autenticidade. O ficheiro original fica com o emissor; qualquer terceiro pode verificar apresentando o ficheiro — o hash tem de coincidir.

### Modo demo gracioso (graceful degradation)

O sistema foi desenhado para correr sem dependências externas:
- Sem nó Ethereum → simula blockchain
- Sem pytesseract → retorna OCR fictício
- Sem OpenAI key → chatbot responde com respostas fixas
- SQLite em desenvolvimento, PostgreSQL em produção

### Separação frontend / backend

O frontend React corre na CDN da Vercel (estático, ultra-rápido). O backend Python corre no Railway (sempre ligado, com PostgreSQL). A comunicação é via REST API com CORS aberto. Isto permite escalar cada lado independentemente.

### Smart contract como camada de confiança

O contrato Ethereum é **imutável e público** — ninguém, nem os criadores do AeroLicense, pode alterar ou apagar um registo. Isso é a propriedade central que o diferencia de uma base de dados centralizada: a confiança não depende de nenhuma empresa ou instituição específica.

---

## 7. Infraestrutura Atual (Deployed)

| Componente | Plataforma | URL |
|---|---|---|
| Frontend React | Vercel | https://aerolicense.vercel.app |
| Backend FastAPI | Railway | (URL privada — configurada via variável de ambiente Vercel) |
| Base de dados | Railway PostgreSQL | (interno) |
| Blockchain | Modo demo | (simulado) |

**Endpoints públicos para demonstração:**
- `GET /` — estado da API
- `GET /demo/pilotos` — lista dos 3 pilotos demo
- `GET /demo/pilotos/P001` — detalhe do Miguel Ferreira (ATPL expirado)
- `GET /demo/alertas` — documentos a expirar nos próximos 30 dias
- `GET /documents/verify/{hash}` — verificar autenticidade de um hash

---

## 8. Guião para a Apresentação de 10 Minutos

| Tempo | O que mostrar |
|---|---|
| 0:00 – 1:30 | O problema: falsificação e gestão manual de documentos de aviação |
| 1:30 – 3:00 | A solução: blockchain como camada de confiança imutável |
| 3:00 – 5:00 | Demo ao vivo: abrir aerolicense.vercel.app, mostrar pilotos, documentos expirados, alertas |
| 5:00 – 6:30 | Clicar "Verificar Blockchain" — explicar o que acontece por baixo |
| 6:30 – 7:30 | Mostrar QR code — cenário do inspetor no aeroporto |
| 7:30 – 8:30 | Arquitetura: diagrama rápido (React → FastAPI → Ethereum) |
| 8:30 – 9:30 | Decisões técnicas chave: hash vs. ficheiro, modo demo, smart contract imutável |
| 9:30 – 10:00 | Modelo de negócio e próximos passos |

---

*Documento gerado em 2026-05-06 para apresentação académica ISEC Lisboa.*
