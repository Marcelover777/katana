---
project: forecast-os
created: 2026-07-01
status: em-andamento
---

# ROADMAP — forecast-os

## O produto em 1 linha

Prevê o preço semanal de boi gordo e milho a 7/30 dias a partir de cotações históricas + clima, e entrega num painel local e numa API pública.

## 01 — Scaffold + painel [x]
Objetivo observável: `uvicorn forecast_os.app:app` sobe; http://localhost:8000 mostra o painel com estado vazio ("nenhuma série carregada") e `/health` responde ok.
Gate: Nenhum.
Depende de: Nenhum.
Tasks:
- [x] Scaffold uv + src layout (`src/forecast_os/`), pytest configurado
- [x] FastAPI com `/health` e `/` servindo o painel (HTML estático: tabela de séries + gráfico vazio)
- [x] Teste de fumaça: TestClient em `/health` e `/`
Aceite:
- [x] `uv run pytest -q` verde
- [x] `curl -s http://localhost:8000/health` retorna `{"status":"ok"}`
- [x] `curl -s http://localhost:8000/ | grep -qi "forecast-os"`
Demo (60s): sobe o app, abre localhost:8000, mostra o painel vazio com boi_gordo e milho listados como "sem dados".

## 02 — Ingestão CSV [x]
Objetivo observável: `python -m forecast_os.ingest <csv>` carrega cotações no DuckDB e o gráfico do painel passa a mostrar a série histórica.
Gate: Nenhum.
Depende de: 01.
Tasks:
- [x] Parser de CSV de cotações (data, serie, preco) tolerante a pt-BR (vírgula decimal, dd/mm/aaaa)
- [x] Escrita idempotente em `data/forecast.duckdb` (re-importar o mesmo arquivo não duplica)
- [x] Endpoint `/api/series/{serie}` + gráfico do painel lendo dele
- [x] CSV de exemplo com 261 semanas em `data/exemplo/cotacoes.csv`
Aceite:
- [x] `uv run python -m forecast_os.ingest data/exemplo/cotacoes.csv` exit 0 e imprime `importadas: 261`
- [x] `uv run pytest tests/test_ingest.py -q` verde (inclui regressão de vírgula decimal)
- [x] `curl -s http://localhost:8000/api/series/boi_gordo | grep -q '"points"'`
Demo (60s): importa o CSV de exemplo, recarrega o painel, o gráfico do boi gordo aparece com 5 anos de história.

## 03 — Conector de clima (API externa) [ ]
Objetivo observável: chuva e temperatura diárias das praças entram no DuckDB via OpenWeatherMap e viram camada opcional no gráfico do painel.
Gate: WEATHER_API_KEY.
Depende de: 02.
Tasks:
- [ ] Cliente OpenWeatherMap com retry/backoff e erro claro em 401/429 (sem engolir exceção)
- [ ] Backfill `python -m forecast_os.weather --backfill 90` (90 dias, praças do config)
- [ ] Tabela `weather_daily` com data do evento + data de coleta
- [ ] Camada de clima no painel (toggle sobre o gráfico de preço)
Aceite:
- [ ] `uv run python -m forecast_os.weather --backfill 90` exit 0 e imprime `dias gravados:`
- [ ] `uv run pytest tests/test_weather.py -q` verde (cliente mockado — a suite não bate na API real)
- [ ] `uv run python -m forecast_os.weather --check` imprime cobertura ≥ 85 dias
Demo (60s): roda o backfill, liga a camada de clima no painel, mostra a chuva acumulada sobre a curva de preço.

## 04 — Modelo baseline + backtest [ ]
Objetivo observável: `python -m forecast_os.backtest` imprime o MAE do baseline (sazonal ingênuo, 52 semanas) por série × horizonte, em walk-forward sem vazamento.
Gate: Nenhum.
Depende de: 02.
Tasks:
- [ ] Baseline: último valor + ajuste sazonal de 52 semanas, horizontes 7 e 30 dias
- [ ] Backtest walk-forward: origem desliza semana a semana, features só com dados ≤ data de origem
- [ ] Teste anti-vazamento: a previsão na origem T não muda quando se apagam dados > T
- [ ] Relatório em `reports/backtest-<data>.md` (MAE por série × horizonte)
Aceite:
- [ ] `uv run python -m forecast_os.backtest --series boi_gordo,milho --horizons 7,30` exit 0 e imprime `MAE`
- [ ] `uv run pytest tests/test_backtest.py -q` verde (inclui o teste anti-vazamento)
Demo (60s): roda o backtest, abre o relatório, aponta o MAE de 7 dias do boi gordo.

## 05 — API de previsão [ ]
Objetivo observável: `GET /api/forecast/{serie}?h=7` responde p50 + banda, gerado pelo baseline do passo 04; o painel ganha o card "próximos 7/30 dias".
Gate: Nenhum.
Depende de: 04.
Tasks:
- [ ] Endpoint `/api/forecast/{serie}` (p50, p10, p90, data de origem, modelo usado)
- [ ] Card de previsão no painel com a banda p10–p90
- [ ] 422 para série desconhecida ou horizonte fora de {7,30}
Aceite:
- [ ] `curl -s "http://localhost:8000/api/forecast/boi_gordo?h=7" | grep -q '"p50"'`
- [ ] `curl -s -o /dev/null -w "%{http_code}" "http://localhost:8000/api/forecast/nao_existe?h=7"` imprime `422`
- [ ] `uv run pytest -q` verde (suite inteira)
Demo (60s): abre o painel, mostra o card de previsão com banda para boi e milho.

## 06 — Deploy [ ]
Objetivo observável: painel e API respondem numa URL pública (Fly.io), com o DuckDB em volume persistente.
Gate: FLY_API_TOKEN.
Depende de: 05.
Deploy pago — exige confirmação humana: o /go para aqui por definição e te entrega o comando (`fly deploy --remote-only`); você roda, e o `/go resume` valida o smoke.
Tasks:
- [ ] Dockerfile (imagem slim, `uv sync --frozen`) + fly.toml com volume para `data/`
- [ ] Health check do Fly apontando para `/health`
- [ ] Smoke pós-deploy documentado no README
Aceite:
- [ ] `fly config validate` exit 0 (fly.toml válido — a fatia mecanizável)
- [ ] `curl -s https://forecast-os.fly.dev/health | grep -q '"ok"'` (smoke — roda no `/go resume`, depois do deploy humano)
Demo (60s): abre a URL pública no celular, painel carrega com as séries e o card de previsão.
