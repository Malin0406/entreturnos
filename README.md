# EntreTurnos — Organizador Inteligente de Rotina

> **Sua rotina organizada. Seu tempo melhor aproveitado.**

O EntreTurnos é um sistema web para estudantes universitários, estagiários e profissionais que precisam conciliar faculdade, estágio, trabalho, estudos, deslocamentos e compromissos pessoais. Ele centraliza a rotina em um só lugar, identifica os **horários realmente livres** (descontando deslocamentos e pausas) e **sugere quando realizar cada tarefa**, sempre com a aprovação do usuário.

---

## Sumário

1. [Funcionalidades](#funcionalidades)
2. [Tecnologias](#tecnologias)
3. [Arquitetura](#arquitetura)
4. [Estrutura de pastas](#estrutura-de-pastas)
5. [Como executar no Windows (passo a passo)](#como-executar-no-windows-passo-a-passo)
6. [Conta de demonstração](#conta-de-demonstração)
7. [Testes](#testes)
8. [API REST](#api-rest)
9. [Planejamento inteligente: regras do algoritmo](#planejamento-inteligente-regras-do-algoritmo)
10. [Modelo de dados](#modelo-de-dados)
11. [Solução de problemas](#solução-de-problemas)

---

## Funcionalidades

| Módulo | O que faz |
| --- | --- |
| **Autenticação** | Cadastro (nome, e-mail, senha e confirmação), login com JWT, recuperação de acesso por token de redefinição, logout e rotas privadas protegidas. Senhas com hash **bcrypt**. Cada usuário acessa apenas os próprios dados. |
| **Visão geral (dashboard)** | Saudação personalizada, tarefas pendentes/concluídas, próximos compromissos, horas de estudo planejadas, horários livres do dia, progresso semanal, resumo do dia, tarefas prioritárias, calendário compacto, gráfico de produtividade semanal e atalhos para criar tarefa e compromisso. **Todos os números vêm do banco.** |
| **Minha agenda** | FullCalendar com visões **diária, semanal e mensal**; criar compromissos clicando no horário vazio; editar e excluir; arrastar ou redimensionar compromissos únicos para remarcar; cores por categoria; deslocamentos hachurados. |
| **Compromissos** | Compromissos **fixos/recorrentes** (dias da semana, horários, data de início e término opcional), compromissos únicos e **deslocamentos**. As ocorrências recorrentes são calculadas em memória, **sem duplicar registros** no banco. |
| **Controle de deslocamentos** | Origem, destino, duração, tipo de transporte e vínculo com um compromisso (antes ou depois de cada ocorrência) ou horário avulso. O deslocamento **ocupa a agenda** e nunca recebe sugestões. |
| **Detecção de conflitos** | Ao salvar compromissos, fixos ou deslocamentos, a API verifica sobreposições (inclusive com ocorrências recorrentes e deslocamentos) e devolve a lista de conflitos. O usuário pode ajustar o horário ou salvar mesmo assim. |
| **Minhas tarefas** | Título, descrição, categoria, data de criação, prazo, tempo estimado, prioridade (baixa/média/alta) e status (pendente/em andamento/concluída). Filtros por prioridade, categoria e status; busca; ordenação por prazo, prioridade ou criação; **alertas visuais** para tarefas atrasadas e que vencem em até 48h. |
| **Planejamento inteligente** | Algoritmo baseado em regras (sem IA externa) que encontra intervalos livres e encaixa as tarefas pendentes por prioridade e prazo. O usuário **aceita** (vira bloco na agenda) ou **recusa** cada sugestão. |
| **Pomodoro** | 25/5/15 min por padrão (configurável), pausa longa a cada N ciclos, iniciar, pausar, retomar, reiniciar, alternar entre foco e pausa, progresso visual, associação a uma tarefa e registro das sessões concluídas. **Continua contando ao trocar de página e até ao recarregar o navegador.** |
| **Relatórios** | Tarefas concluídas por semana, pendentes, tempo de estudos, tempo de trabalho, sessões Pomodoro, distribuição por categoria e evolução da produtividade (Recharts). |
| **Notificações** | Central com prazos próximos, tarefas atrasadas, compromissos em breve e novas sugestões de horário; marcar como lida (individual ou todas) e excluir. |
| **Perfil e configurações** | Editar nome e e-mail, alterar senha, excluir conta, disponibilidade habitual (horários e dias), preferências de planejamento (pausas, menor intervalo útil, bloco máximo, horizonte), duração do Pomodoro e preferências de notificação. |

Todo o sistema usa o fuso **America/Sao_Paulo** e exibe datas no **padrão brasileiro**.

---

## Tecnologias

**Frontend:** React 18, TypeScript, Vite, Tailwind CSS, React Router DOM, Lucide React, FullCalendar (com plugin Luxon para o fuso de São Paulo), Recharts, React Hook Form e Zod.

**Backend:** Node.js, TypeScript, Express, Prisma ORM, JWT (jsonwebtoken), bcrypt, Zod e Helmet.

**Banco de dados:** PostgreSQL 16, via Docker Compose.

**Testes:** Vitest e Supertest (unitários e de integração).

**Ferramentas:** Git, Visual Studio Code, Docker Compose e Postman (coleção em `docs/`).

Nenhum serviço pago ou API externa é necessário.

---

## Arquitetura

```
┌──────────────────────────┐   HTTP/JSON (JWT)  ┌─────────────────────────────────────┐
│  Frontend (React + Vite) │ ─────────────────▶ │  API REST (Express + TypeScript)    │
│  localhost:5173          │   proxy /api       │  localhost:3333/api                 │
│  pages / components      │                    │  routes → validators (Zod)          │
│  contexts (Auth, Pomodoro│                    │        → controllers                │
│  Toast) / services       │                    │        → services (regras)          │
└──────────────────────────┘                    │        → domain/scheduling (puro)   │
                                                │        → Prisma ORM                 │
                                                └──────────────────┬──────────────────┘
                                                                   │
                                                        ┌──────────▼──────────┐
                                                        │ PostgreSQL (Docker) │
                                                        └─────────────────────┘
```

- **Controllers** apenas recebem a requisição e devolvem a resposta. A lógica fica nos **services**.
- **`src/domain/scheduling.ts`** concentra as regras do planejamento (intervalos livres, recorrência, deslocamentos, conflitos e sugestões) como **funções puras**, cobertas por testes unitários.
- **Middlewares:** autenticação JWT, validação com Zod e tratamento centralizado de erros (400/401/404/409/422/500).
- Todas as consultas filtram por `userId`, garantindo o **isolamento dos dados** de cada usuário.
- O frontend usa o proxy do Vite (`/api` → `http://localhost:3333`), então não há configuração de CORS em desenvolvimento.

---

## Estrutura de pastas

```
entreturnos/
├── docker-compose.yml            # PostgreSQL 16
├── README.md
├── .gitignore
├── docs/
│   └── EntreTurnos.postman_collection.json
├── backend/
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.json / tsconfig.build.json
│   ├── vitest.config.ts / vitest.unit.config.ts
│   ├── prisma/
│   │   ├── schema.prisma         # modelo de dados
│   │   ├── migrations/           # migration inicial
│   │   └── seed.ts               # dados de demonstração
│   ├── src/
│   │   ├── server.ts / app.ts
│   │   ├── config/               # env, prisma, constantes
│   │   ├── domain/scheduling.ts  # regras do planejamento (funções puras)
│   │   ├── routes/               # rotas Express
│   │   ├── controllers/
│   │   ├── services/             # auth, tarefas, agenda, planejamento, relatórios…
│   │   ├── middlewares/          # auth, validate, errorHandler
│   │   ├── validators/           # schemas Zod
│   │   ├── utils/                # fuso horário, erros, asyncHandler
│   │   └── types/
│   └── tests/
│       ├── unit/                 # algoritmo de planejamento e conflitos
│       └── integration/          # API completa com banco real
└── frontend/
    ├── .env.example
    ├── package.json
    ├── vite.config.ts / tailwind.config.js / postcss.config.js
    ├── index.html
    ├── public/favicon.svg
    └── src/
        ├── main.tsx / App.tsx
        ├── components/           # ui/, layout/, forms/, dashboard/
        ├── pages/                # dashboard, agenda, tarefas, planejamento…
        ├── layouts/              # AppLayout (privado) e AuthLayout (público)
        ├── contexts/             # Auth, Pomodoro (global), Toast
        ├── hooks/                # useApi, useCategories
        ├── services/             # cliente HTTP e endpoints
        ├── types/
        ├── utils/                # datas (fuso SP), rótulos, helpers
        └── styles/index.css
```

---

## Como executar no Windows (passo a passo)

### 1. Instale as ferramentas

| Ferramenta | Versão | Download |
| --- | --- | --- |
| **Node.js** | 20 LTS ou superior (testado com 24) | https://nodejs.org |
| **Docker Desktop** | atual | https://www.docker.com/products/docker-desktop |
| **Git** | atual | https://git-scm.com |
| **Visual Studio Code** | atual | https://code.visualstudio.com |

Depois de instalar o Docker Desktop, **abra-o e aguarde** até aparecer "Engine running". Na primeira vez ele pode pedir para habilitar o WSL 2 e reiniciar o computador.

Confira as instalações em um terminal:

```bash
node -v
```

```bash
docker --version
```

### 2. Baixe o projeto e abra no VS Code

Em um terminal, na pasta onde deseja salvar o projeto, clone o repositório:

```bash
git clone https://github.com/Malin0406/entreturnos.git
```

> Sem Git? Na página do repositório, clique em **Code > Download ZIP** e extraia o arquivo.

1. Abra o VS Code → **File > Open Folder…** → selecione a pasta `entreturnos`.
2. Abra o terminal integrado: **Terminal > New Terminal** (atalho `` Ctrl+` ``).

Os comandos abaixo funcionam no PowerShell (padrão do VS Code no Windows) e no Git Bash.

### 3. Inicie o PostgreSQL com Docker

Na pasta raiz `entreturnos`:

```bash
docker compose up -d
```

Isso cria o banco `entreturnos` (usuário `entreturnos`, senha `entreturnos`) na porta **5432**. Para conferir se está rodando:

```bash
docker compose ps
```

### 4. Configure e inicie o backend

```bash
cd backend
```

Crie o arquivo `.env` a partir do modelo. Os valores padrão já funcionam com o Docker Compose:

```bash
copy .env.example .env
```

> No Git Bash, use `cp .env.example .env`.

Instale as dependências:

```bash
npm install
```

Gere o cliente do Prisma:

```bash
npx prisma generate
```

Execute as migrations (cria as tabelas):

```bash
npx prisma migrate deploy
```

Insira os dados de demonstração:

```bash
npm run seed
```

Inicie a API:

```bash
npm run dev
```

A API fica disponível em **http://localhost:3333/api**. Para testar, abra `http://localhost:3333/api/health` no navegador. Deixe este terminal aberto.

### 5. Configure e inicie o frontend

Abra um **segundo terminal** (clique no **+** do painel de terminal) e, a partir da pasta `entreturnos`:

```bash
cd frontend
```

```bash
copy .env.example .env
```

> Esse passo é opcional: sem o `.env`, o frontend já usa `/api` por padrão.

```bash
npm install
```

```bash
npm run dev
```

### 6. Acesse no navegador

Abra **http://localhost:5173**.

Na tela de login, clique em **"Preencher automaticamente"** (ou digite as credenciais abaixo) e depois em **Entrar**.

### Configuração do `.env` do backend

| Variável | Descrição | Valor padrão |
| --- | --- | --- |
| `PORT` | Porta da API | `3333` |
| `DATABASE_URL` | Conexão com o PostgreSQL | `postgresql://entreturnos:entreturnos@localhost:5432/entreturnos?schema=public` |
| `DATABASE_URL_TEST` | Banco dos testes de integração (schema separado `test`, recriado a cada execução) | `...?schema=test` |
| `JWT_SECRET` | Segredo para assinar os tokens. **Troque por um valor longo e aleatório.** | — |
| `JWT_EXPIRES_IN` | Validade do token | `7d` |
| `CORS_ORIGIN` | Origem permitida do frontend | `http://localhost:5173` |
| `NODE_ENV` | `development` exibe o token de redefinição de senha na tela (não há envio de e-mail nesta versão) | `development` |

### Comandos úteis

| Onde | Comando | O que faz |
| --- | --- | --- |
| backend | `npm run dev` | API com recarregamento automático |
| backend | `npm run seed` | Recria o usuário de demonstração (pode rodar várias vezes) |
| backend | `npm run db:reset` | Apaga o banco, reaplica as migrations e roda o seed |
| backend | `npm run prisma:studio` | Abre o Prisma Studio para visualizar os dados |
| backend | `npm test` | Testes unitários e de integração |
| backend | `npm run build` / `npm start` | Build e execução de produção |
| frontend | `npm run dev` | Frontend em http://localhost:5173 |
| frontend | `npm run build` | Verifica os tipos e gera o build de produção em `dist/` |
| raiz | `docker compose down` | Para o PostgreSQL (os dados são mantidos no volume) |

---

## Conta de demonstração

| E-mail | Senha |
| --- | --- |
| `demo@entreturnos.com` | `Demo@1234` |

O seed cria a rotina fictícia de **Maria Oliveira**, estagiária e universitária. **As datas são relativas ao dia em que o seed roda**, então o dashboard sempre tem dados atuais:

- **Compromissos fixos:** Estágio (seg–sex, 08h–17h), Aulas de Engenharia de Software (seg–qui, 19h–22h) e Academia (ter e qui, 06h–07h).
- **Deslocamentos:** Casa → Estágio (45 min antes), Estágio → Faculdade (60 min depois) e Faculdade → Casa (40 min depois).
- **Compromissos únicos:** consulta no dentista, reunião do grupo de TCC e grupo de estudos.
- **16 tarefas** (acadêmicas, do estágio e pessoais) com prazos variados, incluindo atrasadas, que vencem em breve e concluídas nas últimas semanas.
- **Sessões Pomodoro** distribuídas nas últimas semanas, **notificações** de exemplo e **sugestões** já geradas.

Assim, numa segunda-feira, o sistema identifica o intervalo entre o deslocamento (17h–18h) e a faculdade (19h), já descontando as pausas de descanso, e sugere uma tarefa curta nesse horário, exatamente o cenário do enunciado.

> Nenhum dado pessoal real é usado. Nomes, e-mails e empresas são fictícios.

---

## Testes

```bash
cd backend
```

Apenas os testes unitários (não precisam de banco):

```bash
npm run test:unit
```

Todos os testes, unitários e de integração (precisam do PostgreSQL rodando; usam o schema `test`, sem afetar seus dados):

```bash
npm test
```

**O que é coberto (33 testes):**

- **Unitários (22):** sobreposição e união de intervalos, cálculo de horários livres, respeito a deslocamentos e pausas, janela de disponibilidade e dias permitidos, expansão de recorrência sem duplicar, deslocamentos antes/depois, pontuação por prioridade e prazo, geração de sugestões (sem sobrepor, divisão de tarefas longas em blocos, consumo das vagas de disponibilidade, respeito ao prazo, intervalos recusados) e o cenário Estágio → Deslocamento → Faculdade.
- **Integração (11):** cadastro com senha criptografada, e-mail duplicado e senhas diferentes, login e senha incorreta, proteção de rotas, redefinição de senha, criação, atualização e conclusão de tarefas com isolamento entre usuários, validação de dados obrigatórios, cadastro de compromissos com **detecção de conflito (409)**, recorrência + deslocamento gerando o intervalo livre esperado, geração/aceite/recusa de sugestões e registro de sessões Pomodoro refletido nos relatórios.

---

## API REST

Base: `http://localhost:3333/api`. Todas as rotas, exceto `/health` e `/auth/*` (com exceção de `/auth/me`), exigem o cabeçalho `Authorization: Bearer <token>`.

Para testar no Postman, importe **`docs/EntreTurnos.postman_collection.json`** e execute **"Login (demo)"**: o token é salvo automaticamente.

| Recurso | Endpoints |
| --- | --- |
| Saúde | `GET /health` |
| Autenticação | `POST /auth/register` · `POST /auth/login` · `GET /auth/me` · `POST /auth/forgot-password` · `POST /auth/reset-password` |
| Usuário | `PUT /users/me` · `PUT /users/me/password` · `DELETE /users/me` |
| Preferências | `GET /preferences` · `PUT /preferences` |
| Categorias | `GET /categories` |
| Tarefas | `GET /tasks?status&priority&categoryId&search&sort&order` · `POST /tasks` · `GET /tasks/:id` · `PUT /tasks/:id` · `PATCH /tasks/:id/status` · `DELETE /tasks/:id` |
| Agenda | `GET /calendar/events?start&end` (compromissos, ocorrências recorrentes e deslocamentos) |
| Compromissos | `GET/POST /appointments` · `GET/PUT/DELETE /appointments/:id` |
| Compromissos fixos | `GET/POST /recurring-appointments` · `GET/PUT/DELETE /recurring-appointments/:id` |
| Deslocamentos | `GET/POST /commutes` · `GET/PUT/DELETE /commutes/:id` |
| Planejamento | `GET /planning/free-slots?days` · `GET /planning/suggestions` · `POST /planning/suggestions/generate` · `POST /planning/suggestions/:id/accept` · `POST /planning/suggestions/:id/reject` |
| Pomodoro | `GET /pomodoro-sessions?limit` · `GET /pomodoro-sessions/today` · `POST /pomodoro-sessions` |
| Notificações | `GET /notifications` · `PATCH /notifications/:id/read` · `PATCH /notifications/read-all` · `DELETE /notifications/:id` |
| Relatórios | `GET /reports/summary?weeks` |
| Dashboard | `GET /dashboard` |

**Respostas de erro:** `400` (requisição inválida), `401` (não autenticado), `404` (não encontrado ou de outro usuário), `409` (conflito de horário, com `details.conflicts`, ou e-mail duplicado) e `422` (validação, com `errors[]` por campo).

Para salvar um compromisso mesmo com conflito, envie `"force": true`.

---

## Planejamento inteligente: regras do algoritmo

Implementado em `backend/src/domain/scheduling.ts`, sem nenhuma IA externa:

1. **Coleta da agenda:** compromissos únicos, ocorrências dos compromissos fixos (calculadas para o período) e deslocamentos vinculados ou avulsos.
2. **Pausas de descanso:** cada bloco ocupado é ampliado pela pausa configurada (padrão de 10 min), antes e depois.
3. **Janela de disponibilidade:** só considera os dias e horários habituais definidos pelo usuário, e nunca o passado.
4. **Horários livres:** subtrai os blocos ocupados da janela e descarta intervalos menores que o "menor intervalo útil" (padrão de 20 min).
5. **Ordenação das tarefas:** pontuação = prioridade (alta 30, média 20, baixa 10) + urgência do prazo (atrasada +30, até 24h +20, até 72h +12, até 7 dias +5). Empates são decididos pelo prazo mais próximo e depois pela menor duração.
6. **Encaixe:** algoritmo guloso que coloca cada tarefa no primeiro intervalo que a comporta antes do prazo. Tarefas longas são divididas em blocos de até o "bloco máximo" (padrão de 90 min). Cada bloco usado consome a vaga e reserva a pausa seguinte, então **nada se sobrepõe**.
7. **Respeito às escolhas:** horários já recusados para uma tarefa não são sugeridos de novo, e o tempo já reservado (sugestões aceitas) é descontado.
8. **Aprovação do usuário:** nada é agendado automaticamente. Ao aceitar, a API **revalida o conflito** (a agenda pode ter mudado) e cria o bloco na agenda vinculado à tarefa.

---

## Modelo de dados

Entidades (Prisma, `backend/prisma/schema.prisma`), todas com identificador UUID e datas de criação e atualização:

| Entidade | Descrição | Relacionamentos |
| --- | --- | --- |
| `User` | Usuário (senha com hash bcrypt, token de redefinição com hash SHA-256) | 1:1 `UserPreference`; 1:N com todas as demais |
| `UserPreference` | Disponibilidade, planejamento, Pomodoro e notificações | N:1 `User` |
| `Category` | Faculdade, Estágio, Trabalho, Estudos, Pessoal e Outros (com cor) | 1:N `Task`, `Appointment`, `RecurringAppointment` |
| `Task` | Tarefa com prazo, estimativa, prioridade e status | N:1 `User`, `Category`; 1:N `PomodoroSession`, `ScheduleSuggestion`, `Appointment` |
| `Appointment` | Compromisso único (pode ser um bloco de tarefa aceito) | N:1 `User`, `Category`, `Task?`; 1:N `Commute`; 1:1 `ScheduleSuggestion?` |
| `RecurringAppointment` | Regra semanal (dias, horários, vigência) | N:1 `User`, `Category`; 1:N `Commute` |
| `Commute` | Deslocamento vinculado a um compromisso, a um fixo ou avulso | N:1 `User`, `Appointment?`, `RecurringAppointment?` |
| `PomodoroSession` | Sessão de foco ou pausa registrada | N:1 `User`, `Task?` |
| `Notification` | Notificação interna (com chave de deduplicação) | N:1 `User` |
| `ScheduleSuggestion` | Sugestão de horário (pendente, aceita ou recusada) | N:1 `User`, `Task`; 1:1 `Appointment?` |

A exclusão de um usuário remove todos os seus dados (`onDelete: Cascade`).

---

## Solução de problemas

| Problema | Solução |
| --- | --- |
| `docker` não é reconhecido | Instale o Docker Desktop, abra-o e espere "Engine running". Feche e reabra o VS Code. |
| `Can't reach database server at localhost:5432` | O PostgreSQL não está rodando. Execute `docker compose up -d` na pasta raiz e confira com `docker compose ps`. |
| Porta 5432 já em uso | Outro PostgreSQL está instalado. Pare-o ou mude a porta no `docker-compose.yml` (ex.: `'5433:5432'`) e no `DATABASE_URL`. |
| `Variáveis de ambiente inválidas` ao iniciar a API | O arquivo `backend/.env` não existe ou está incompleto. Rode `copy .env.example .env` na pasta `backend`. |
| Erro ao instalar `bcrypt` | Use o Node.js LTS (20, 22 ou 24): o pacote tem binários prontos para essas versões. Apague `node_modules` e rode `npm install` de novo. |
| Tela de login mostra "Não foi possível conectar ao servidor" | O backend não está rodando. Inicie com `npm run dev` na pasta `backend`. |
| O dashboard aparece vazio | Rode `npm run seed` no backend para recriar os dados de demonstração. |
| Scripts bloqueados no PowerShell (`execução de scripts foi desabilitada`) | Rode uma vez: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` e confirme. |
