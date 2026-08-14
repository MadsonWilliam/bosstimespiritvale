# Nojos Boss Time Spirit Vale

Rastreador comunitário de world boss para **SpiritVale**. Projeto de fã, sem
vínculo com a Baikun Interactive.

O jogo não tem API pública, então tudo aqui vem da comunidade: alguém reporta a
morte de um boss, o site calcula a janela de respawn e sugere uma rota de farm.

---

## O problema que ele resolve

- Boss nasce **60 min garantidos + até 30 min aleatórios** depois da última morte.
- Nasce nos **channels 1, 2 e 3**, cada um com timer independente.
- Cada mapa tem uma **lápide** no ponto de spawn: lápide na tela = ainda não
  nasceu; lápide sumiu = nasceu.
- **26 dos 46 mapas** têm boss.
- **5 servidores** (SA, NA, EU, SEA, OCE) com contagens totalmente separadas.

---

## Seções

| # | Seção | O que faz |
|---|-------|-----------|
| 01 | **Mapas** | Catálogo dos 26 mapas com boss, nível, elemento, drops e o estado dos 3 channels. Busca por mapa, boss, drop ou região. |
| 02 | **Timers** | Quadro ao vivo ordenado por relevância: vivo → na janela → vencido → aguardando. |
| 03 | **Rota** | Sequência de mapas com maior chance de achar boss vivo, **avaliada no horário previsto de chegada**, não agora. |
| 04 | **Ranking** | Cargos imperiais decorativos por contribuição. |

### Estados de um channel

| Estado | Significado |
|--------|-------------|
| `VIVO` | Alguém confirmou que a lápide sumiu. |
| `NA JANELA` | Dentro dos 30 min aleatórios — pode nascer a qualquer momento. |
| `AGUARDANDO` | Ainda dentro dos 60 min garantidos. |
| `VENCIDO` | Passou dos 90 min sem notícia. Provavelmente morreu e ninguém reportou. |
| `SEM INFO` / `SEM DADOS` | Velho demais, ou ninguém reportou. |

### Os três números (e por que não são a mesma coisa)

Misturar isso é o que deixa um quadro de boss confuso, então `src/lib/timers.ts`
mantém os três separados:

| Número | O que é | Onde aparece |
|---|---|---|
| `progress` | Cronômetro puro: 0 na morte, 100% quando a janela fecha. Só sobe. | **Seção 02 — Timers** |
| `spawnChance` | Chance de **já ter nascido**: 0 antes da janela, 100% depois que ela fecha. | interno |
| `chance` | Chance de estar **vivo agora** — já nasceu menos os que já morreram. | **Seção 03 — Rota** |

Um boss com a janela vencida marca `progress` 100% (o relógio acabou) mas
`chance` baixa (provavelmente alguém já matou). São perguntas diferentes.

O `chance` sai da densidade uniforme de spawn integrada contra sobrevivência
exponencial (meia-vida em `SURVIVAL_TAU_MS`, hoje 20 min). Como é uma função de
um instante qualquer, a rota consegue avaliar cada parada **no horário previsto
de chegada** em vez de agora.

---

## Como reportar

Entrada de horário aceita, tudo resolvido no fuso escolhido no header:

```
2100     -> 21:00
21:00    -> 21:00
21h30    -> 21:30
930      ->  9:30
9pm      -> 21:00
7 45 am  ->  7:45
-15      -> 15 minutos atrás
(vazio)  -> agora
```

`Enter` envia. Há também o botão **Morreu agora** e os dois botões de lápide
(*está lá* / *sumiu*), que refinam a janela sem precisar saber a hora da morte.

---

## Identidade e privacidade

Não existe login. A pessoa escolhe um **nick do jogo + PIN de 4 dígitos**
(guardado com `scrypt` + salt). O PIN existe só para ninguém gastar a reputação
alheia — não é senha de conta e não recupera nada.

Nenhum dado pessoal é coletado. Preferências (fuso, formato de hora, idioma,
servidor) ficam só no `localStorage`. Detalhes em `/privacidade`.

---

## Stack

- **Next.js 15** (App Router, `output: standalone`) + React 19 + TypeScript
- **Tailwind CSS v4**
- **SQLite** via `better-sqlite3`, em volume persistente
- Container único — sem serviço externo, sem Redis, sem banco gerenciado

### Estrutura

```
src/
  app/               rotas e API
    api/state        snapshot do servidor (reportes crus; o client calcula)
    api/report       morte + avistamento de lápide
    api/pins         marcação e confirmação de lápide
    api/identity     nick + PIN
    api/leaderboard  ranking
  components/        UI (client)
  data/game.ts       ⚠️ TODO o conteúdo do jogo mora aqui
  lib/
    timers.ts        janela de respawn e probabilidade
    route.ts         planejador de rota
    time-input.ts    parsing de horário e fuso
    ranks.ts         pontos, níveis e cargos
    db.ts            SQLite + migrations
public/minimaps/     26 webp, um por mapa com boss
```

### Editando conteúdo do jogo

Tudo — boss, nível, elemento, drops, região e vizinhança de mapas — está em
[`src/data/game.ts`](src/data/game.ts). Adicionar um boss é acrescentar um
objeto no array `BOSS_MAPS` e colocar `public/minimaps/<slug>-full.webp`.

> A pasta que o site realmente serve é **`public/minimaps/`**. A `minimaps/` na
> raiz é só o local de entrega das imagens e está no `.gitignore` — imagem nova
> precisa ser copiada para `public/minimaps/`. O formato **webp está correto**;
> os minimaps são quadrados (1280×1280) e os pins são gravados em coordenadas
> relativas (0–1), então qualquer resolução funciona.

### O campo `difficulty`

Não existe distância confiável entre mapas em SpiritVale — alguns têm warp,
outros não, e os tamanhos variam muito. Em vez de fingir que dá para medir, cada
mapa carrega um `difficulty` de **1 (fácil)** a **2 (difícil)**: quanto custa
chegar lá e achar o boss.

Ele faz duas coisas na rota: estima o tempo de deslocamento até a próxima parada
e penaliza mapas caros no desempate. **Não é exibido como número** para o
visitante — é peso de cálculo, não conteúdo.

---

## Rodando local

Requer **Node 20+** (testado no 24 LTS).

```bash
npm install
```

```bash
npm run dev
```

O banco é criado sozinho em `./data/bosstime.db`.

Outros comandos:

```bash
npm run build && npm start
```

```bash
npm run typecheck
```

---

## Deploy no EasyPanel

O `Dockerfile` já está pronto: multi-stage, usuário sem privilégio, healthcheck
em `/api/health`.

1. **App → Create → From GitHub**, apontando para este repositório.
2. **Build**: `Dockerfile` (raiz do repo).
3. **Volume**: monte um volume persistente em **`/data`**. Sem isso o banco some
   a cada deploy.
4. **Porta**: `3000`.
5. **Domínio**: habilite HTTPS/Let's Encrypt no domínio do app.
6. **Env** (todas opcionais):

| Variável | Para quê |
|----------|----------|
| `NEXT_PUBLIC_SITE_URL` | URL pública — usada em `robots.txt`, `sitemap.xml` e Open Graph. |
| `NEXT_PUBLIC_COFFEE_URL` | Link de "pague um café". Sem ela o rodapé mostra "(link em breve)" em vez de um botão morto. |
| `DATA_DIR` | Onde fica o SQLite. O Dockerfile já define `/data`. |

### Backup

O banco inteiro é um arquivo. Backup = copiar `/data/bosstime.db` (junto com
`-wal` e `-shm`, se existirem).

---

## Pendências conhecidas

- **Boss de The Echoing Spire** — não catalogado; o mapa aparece sem boss.
- **`public/banner.webp`** — se existir, vira o fundo do hero automaticamente.
  Enquanto não existir, o gradiente cobre.
- **`difficulty` de dois mapas** não veio da lista da comunidade e está chutado:
  `abyss-castle-library` (1.4, copiado do Crypt) e `the-echoing-spire` (1.5, sem
  boss, então não afeta nada hoje).
- **Rate limit em memória** — funciona para 1 container. Se um dia rodar com
  réplicas, precisa ir para o banco.

---

## Aviso

Projeto de fã, sem fins lucrativos. Não é afiliado, patrocinado nem endossado
pela **Baikun Interactive**. SpiritVale e todo o material do jogo pertencem aos
seus respectivos donos.
