# Fila Bar — pedidos sem fila (MVP)

Uma app **Next.js** (tudo num projeto): cliente regista o telefone (qualquer país), recebe link do menu (WhatsApp em produção), faz pedido com código curto, e o bar/cozinha atualiza o estado — **“pronto”** envia mensagem ao cliente.

## Requisitos

- Node.js 20+
- PostgreSQL (local ou [Neon](https://neon.tech), [Supabase](https://supabase.com), etc.)

### Erro Prisma P1012 (“`url` is no longer supported”)

Isso acontece se correres **`npx prisma`** **antes** de `npm install` — o `npx` pode instalar **Prisma 7**, que muda o formato do projeto.

**Solução:** na pasta do projeto corre primeiro `npm install` e depois usa **`npm run db:generate`** (ou `npx prisma` só **depois** de existir `node_modules`). Este repo fica em **Prisma 6** (compatível com o `schema.prisma` atual).

## Configuração

1. Copia o ficheiro de ambiente:

   ```bash
   copy .env.example .env
   ```

2. Edita `.env` e define:
   - `DATABASE_URL` — base PostgreSQL
   - `STAFF_PASSWORD` — palavra-passe do painel bar/cozinha
   - `STAFF_JWT_SECRET` — segredo longo (mín. 16 caracteres) para assinar a sessão

3. Instala dependências e gera o cliente Prisma:

   ```bash
   npm install
   npx prisma generate
   npx prisma db push
   npm run db:seed
   ```

4. Arranca em desenvolvimento:

   ```bash
   npm run dev
   ```

5. Abre [http://localhost:3000](http://localhost:3000) — o local de demonstração usa o slug **`demo`**.

## Fluxo

| Página | Descrição |
|--------|-----------|
| `/` | Cliente escolhe país + número (normalização internacional **E.164**) |
| `/menu?token=…` | Menu e carrinho (token de sessão 24h) |
| `/staff` | Lista de pedidos (requer **login staff** — ver `.env`) |
| `/staff/login` | Entrada com palavra-passe (`STAFF_PASSWORD`) |
| `/staff/menu` | **Editar menu** (categorias, itens, preços, fotos, disponível) — local `demo` |

## Telefone em vários países

- Guardamos sempre **`phoneE164`** (ex.: `+447911123456`, `+12025550123`).
- O utilizador pode escrever número nacional; o país escolhido no dropdown é usado como referência (`libphonenumber-js`).
- Podes expandir a lista em `lib/countries.ts`.

## WhatsApp

- Em desenvolvimento, as mensagens são **só log na consola** (ver `lib/whatsapp.ts`).
- Para produção, integra **Twilio**, **360dialog** ou **Meta Cloud API** nesse ficheiro.
- Opcional: `WHATSAPP_FORCE_SEND=1` para testar o caminho de envio (quando implementado).

## Painel de menu (staff)

Depois de login em `/staff`, abre **Editar menu** ou vai a **`/staff/menu`**.

- Cria/edita/apaga **categorias** e **itens**.
- Preço em euros (ex.: `2,50`); na base guarda-se em **cêntimos**.
- **URL da foto**: HTTPS (ex.: Unsplash) ou ficheiro em `public/` como `/menu/foto.jpg`.
- **Carregar imagem**: em `/staff/menu`, usa **Carregar imagem** — o ficheiro fica em `public/menu/` (máx. 5 MB, JPG/PNG/WebP/GIF). A base guarda o caminho, ex.: `/menu/uuid.jpg`.
- O menu público (`/menu?token=…`) usa os mesmos dados — **sem redeploy**.

(MVP: o local é o slug **`demo`**.)

### Vercel Blob (produção)

Se definires **`BLOB_READ_WRITE_TOKEN`** no ambiente (Vercel Dashboard → **Storage** → **Blob** → criar store e ligar ao projeto, ou `vercel env pull`), os uploads passam a ir para a **cloud** e a API devolve uma URL `https://….public.blob.vercel-storage.com/...` — **persistente** nos deploys.

- **Sem** esse token: continua a gravar em `public/menu/` (ideal para **`npm run dev`** no PC).
- O pacote **`@vercel/blob`** já está nas dependências; em produção na Vercel o token costuma ser injectado automaticamente quando o Blob está ligado ao projeto (podes ainda copiar o token para `.env` local para testes).

### Produção sem Blob

Em **serverless** sem armazenamento de objetos, o disco é **efémero** — não contes com `public/menu/` após cada deploy.

## Menu com fotos

Cada item (`MenuItem`) tem um campo opcional **`imageUrl`**:

- **URL HTTPS** (ex.: imagens no [Unsplash](https://unsplash.com)) — domínios permitidos em `next.config.ts` (`images.remotePatterns`).
- **Ficheiro local**: coloca imagens em `public/menu/nome.jpg` e usa **`/menu/nome.jpg`** como URL.

Depois de alterar o schema, corre `npx prisma db push` e `npm run db:seed` para atualizar dados de exemplo.

## Próximos passos sugeridos

- Vários utilizadores staff / roles (bar vs cozinha).
- Webhook WhatsApp para respostas automáticas.
- Pagamentos (MB Way / Stripe).
- Painel admin para editar menu.

## Licença

Uso interno / projeto próprio — ajusta como precisares.

