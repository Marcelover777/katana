# LOG — forecast-os (append-only; 1 bloco por etapa mergeada)

## 2026-07-01 09:26 — etapa 01: Scaffold + painel (PR #1)

- O que mudou: scaffold uv + FastAPI; `/health`; painel estático em `/` com estado vazio ("nenhuma série carregada").
- Arquivos: pyproject.toml, src/forecast_os/app.py, src/forecast_os/painel/index.html, tests/test_app.py
- Verificação: `uv run pytest -q` → 3 passed; `curl -s localhost:8000/health` → `{"status":"ok"}`; `curl -s localhost:8000/ | grep -qi "forecast-os"` ✅ (1 tentativa)
- Decisões: painel = HTML estático servido pelo FastAPI, zero build front (registrada no PR #1). Self-review achou 1 CRÍTICO: o rodapé de debug do painel ecoava VALORES de env vars no HTML → removido na mesma branch, push, Aceite re-rodado verde (1 ciclo); achado registrado como comentário no PR #1.
- Próximo: /go 2 — Ingestão CSV

## 2026-07-01 09:50 — etapa 02: Ingestão CSV (PR #2)

- O que mudou: ingestão CSV → DuckDB idempotente; endpoint `/api/series/{serie}`; gráfico do painel ligado ao endpoint; CSV de exemplo com 261 semanas.
- Arquivos: src/forecast_os/ingest.py, src/forecast_os/db.py, src/forecast_os/app.py, src/forecast_os/painel/index.html, tests/test_ingest.py, data/exemplo/cotacoes.csv
- Verificação: `uv run python -m forecast_os.ingest data/exemplo/cotacoes.csv` → `importadas: 261`; `uv run pytest tests/test_ingest.py -q` → 6 passed; `/api/series/boi_gordo` com `"points"` ✅ (2 tentativas — ver decisão)
- Decisões: CSV real usa vírgula decimal e dd/mm/aaaa → parser normaliza pt-BR; teste de regressão `test_decimal_virgula` escrito antes do fix (protocolo /fix inline, verde na 2ª tentativa). Self-review comentou no PR #2 (advisory): ingest não loga linhas descartadas.
- Próximo: /go 3 — Conector de clima (gate: WEATHER_API_KEY)
