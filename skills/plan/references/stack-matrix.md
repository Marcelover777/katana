# Matriz de stack — arquétipo → default

Consultada pelo /plan na fundação greenfield (§4). O formato da recomendação é fixo: **default + porquê em 1 linha + 1 alternativa + gotchas**. A decisão vai pro CLAUDE.md § Stack (escolha, porquê, alternativa descartada, link de pricing); as env vars de cada peça vão pro `.env.example` e pros gates do ROADMAP.

## Regras anti-envelhecimento (valem mais que a matriz)

1. **Nunca crave preço ou limite de free-tier.** Linke a página oficial de pricing e mande conferir lá. "500MB grátis" escrito aqui envelhece e vira mentira.
2. **Verifique o estado atual do serviço antes de recomendar.** Esta matriz é snapshot — free-tier muda, serviço morre, flag some. Se a decisão depende do estado atual, confira a doc/pricing na hora, não a memória.
3. **Só nomes de env var confirmados** — catálogo [env-vars.md](env-vars.md) ou doc oficial. Nunca invente.
4. **Não superdimensione.** Nada de Redis/fila/CDN num CRUD de fim de semana — recomende o mínimo que o projeto pede.
5. **Não empurre pago quando o free serve.** Só sobe pra pago quando o requisito força — e diga isso claramente antes de fechar.

## Matriz (defaults enviesados: menor fricção, free-tier real, menos ops, CLI-friendly)

| Arquétipo | Default | Por quê (1 linha) | Alternativa |
|-----------|---------|-------------------|-------------|
| **(a) Site estático / SPA** | **Cloudflare Pages** (ou Vercel se Next.js) | grátis de verdade, sem restrição comercial | Netlify |
| **(b) Web app full-stack c/ auth+DB** *(o caso comum)* | **Vercel + Supabase** | um backend cobre banco, login, storage e realtime no free; deploy zero-config | Vercel + Neon + Clerk (Neon não pausa o banco; Clerk = melhor UX de auth) |
| **(c) API / backend** | **Render** (web service + Postgres) | PaaS mais fácil com free-tier real + banco gerenciado | Railway (DX melhor, pago — confira) |
| **(d) Jobs / cron / workflows longos** | **Trigger.dev** | TS-native, runs longos sem timeout, ótimo com Claude Code | Inngest |
| **(e) App de IA (chat/RAG)** | **Vercel + Anthropic API + Supabase (pgvector)** | AI SDK + Claude; o vetor mora no mesmo Postgres free | Neon (pgvector) + OpenAI |
| **(f) App realtime (presença/colab)** | **Supabase Realtime** (+ Vercel) | canais/presence no banco que o projeto já usa | Cloudflare Workers + Durable Objects |

Na dúvida genuína entre arquétipos, o default é **(b)** — mas confirme na pergunta de fundação; assumir em silêncio é o anti-padrão nº 1.

## Gotchas de free-tier (a pegadinha existe; o número fica no link)

Avise que a pegadinha **existe** — o valor exato muda, então é sempre "confira na pricing":

- **Vercel Hobby** é não-comercial — vendeu algo, sobe de plano (confira os termos).
- **Supabase free** pausa o projeto depois de dias sem atividade — acorda no dashboard (confira o prazo).
- **Render free** dorme quando ocioso (primeira request lenta) e o Postgres free expira depois de um tempo (confira).
- **PlanetScale** e **Fly.io** não têm free tier — confira o preço antes de escolher.
- **n8n cloud** é só trial; o self-host é grátis.
- **Turso** cobra por linhas lidas — modelo de preço diferente, confira como conta.
- **Neon free** não pausa o banco — é o caminho pra fugir do gotcha da Supabase; confira o limite dele também.

## Env vars por peça

Vivem no catálogo canônico: [env-vars.md](env-vars.md). O gate de cada passo usa esses nomes; o `.env.example` anota cada um (o que é, onde pegar, obrigatória/opcional, placeholder falso).
