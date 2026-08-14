# Dashboard Black 2025 - Handoff do projeto

Este README e a nota principal para qualquer novo chat/agente continuar o trabalho sem perder o fio da meada.

Ultima atualizacao operacional: `2026-08-14`.

## Objetivo

Construir um dashboard local para estudar o comportamento de vendas da Black de novembro/2025 e orientar o time de compras no forecast.

O dashboard precisa responder, de forma objetiva e visual, estes 5 pontos principais e as extensoes executivas adicionadas no projeto:

1. Ranking de linhas mais vendidas, com foco em linhas como `RS6`, `RS7`, `RS Knit`, `911`, etc.
2. Faixa de valor em reais que mais vendeu, incluindo top 1 produto de cada faixa.
3. Representatividade e volume de acessorios, com `Mochilas` em destaque e ranking proprio.
4. Percentual de vendas por valor de produto.
5. Brindes que mais sairam, com volume, percentual e valor de tabela.

Extensoes executivas atuais:

- Comportamento de compra: pedidos com 2+ itens e clientes que compraram mais de uma vez na Black.
- Recorrencia expandida: comparacao agregada de 3 meses antes, Black e 3 meses depois.
- Heat map de vendas por semana, dia e horario.

## Estado atual

O projeto esta publicado em GitHub e Vercel, mantendo validacao local por localhost.

- GitHub: `https://github.com/PauloCastroDomingues/Analises_Sazonais`
- Vercel producao: `https://analises-sazonais.vercel.app`

Tela atual:

- Tema escuro inspirado no print de referencia do usuario.
- Acento principal laranja.
- Primeira tela com 6 cards alinhados em grade `3 x 2`.
- Cada card da analise principal tem a mesma estrutura e 6 linhas uteis para evitar espacos vazios.
- Abas de detalhamento continuam abaixo da analise principal.
- Cache busting atual em `index.html`: `assets/styles.css?v=20260814-coorte-prepos-v1` e `assets/app.js?v=20260814-coorte-prepos-v1`.
- Abaixo dos 6 cards principais existe uma secao executiva de `Comportamento de compra`.
- Abaixo de `Comportamento de compra` existe uma secao executiva de `Heat map por semana, dia e horario`.

## Atualizacao de 2026-08-14 - Recorrencia expandida e media geral de carrinho

Motivo da revisao: o usuario trouxe duas planilhas extras, uma com 3 meses antes da Black e outra com 3 meses depois, e pediu para separar a leitura de compra repetida dentro da Black da recorrencia historica.

O que foi ajustado:

- Onde a analise fala de novembro, `recompra` passou a ser descrita como `clientes que compraram mais de uma vez na Black`.
- `data/black_nov_2025_dashboard.json` ganhou `avgProductsPerPaidOrder`: `1,56` item por pedido pago na Black toda.
- O card de `Media geral de carrinho` foi adicionado ao bloco de comportamento de compra.
- O dashboard ganhou `Recorrencia expandida`, comparando:
  - 3 meses antes: `997` de `10.404` clientes com 2+ pedidos, taxa `9,6%`.
  - Black 2025: `743` de `10.383` clientes com 2+ pedidos, taxa `7,2%`.
  - 3 meses depois: `801` de `8.911` clientes com 2+ pedidos, taxa `9,0%`.
- Coorte pos-Black calculada na aba `coorte_pos_black_calc`: `731` de `10.383` clientes de novembro voltaram entre dez/2025 e fev/2026, taxa `7,0%`.
- Esses clientes fizeram `862` pedidos, compraram `1.801` unidades e geraram `R$ 691.580` no pos-Black.
- Coorte pre-Black calculada na aba `coorte_pre_black_calc`: `927` de `10.383` clientes de novembro ja tinham compra paga entre ago/2025 e out/2025, taxa `8,9%`.
- Esses clientes fizeram `1.162` pedidos, compraram `2.175` unidades e geraram `R$ 983.908` nos 3 meses anteriores.
- Ultima compra antes da Black: Ago/25 `225` clientes, Set/25 `202` clientes e Out/25 `500` clientes.
- Clientes que fizeram `2+` pedidos na Black retornaram `14,3%` (`106/743`), contra `6,5%` (`625/9.640`) entre clientes de 1 pedido.
- Clientes que fizeram `2+` pedidos na Black tinham compra previa recente em `17,0%` dos casos (`126/743`), contra `8,3%` (`801/9.640`) entre clientes de 1 pedido.
- Primeiro retorno: Dez/25 `392` clientes, Jan/26 `204` clientes e Fev/26 `135` clientes.
- Conferencia sem discrepancia nos pontos criticos: `clientes_black` = `10.383`, `clientes_black_2mais_pedidos` = `743`, coorte pre = `927` e coorte pos = `731`, todos batendo entre abas auxiliares e JSON.
- Observacao metodologica: as coortes pre e pos-Black medem janelas de 3 meses em torno de novembro. Para isolar cliente novo historico completo, precisa de uma base de primeira compra historica, nao apenas ago-out/2025.
- Cache dos assets atualizado para `20260814-coorte-prepos-v1`.

## Atualizacao de 2026-08-14 - Tooltips, faixas em reais e dropdown de cores

Motivo da revisao: o usuario pediu renomear o bloco de cesta/recompra, deixar claro que faixa de valor e em reais, incluir top 1 produto de cada faixa e abrir as cores/produtos dentro de cada linha vendida.

O que foi ajustado:

- `Cesta 2+ e recompra` passou a ser apresentado como `Comportamento de compra`.
- Faixas de valor passaram a aparecer como faixas em `R$`.
- `data/black_nov_2025_dashboard.json` ganhou `priceBandTopProducts` com o top 1 produto de cada faixa.
- `data/black_nov_2025_dashboard.json` ganhou `lineColorBreakdown` com produto, cor, unidades e receita por linha.
- Ranking de linhas no detalhamento virou dropdown por linha, mostrando produtos e cores.
- Tooltips adicionados aos principais cabecalhos e cards de analise.
- Cards de `Produtos em pedidos 2+ itens`, `Linhas em pedidos 2+ itens` e `Produtos de clientes que compraram mais de uma vez na Black` foram alinhados e ganharam tooltips explicativos.
- Cache dos assets atualizado para `20260814-cards-tooltips-v2`.

## Atualizacao de 2026-08-13 - Publicacao GitHub e Vercel

Motivo da revisao: o usuario pediu para subir o projeto no GitHub e configurar/publicar no Vercel.

O que foi ajustado:

- Repositorio local inicializado a partir do `origin/main` existente.
- Dashboard publicado no GitHub em `PauloCastroDomingues/Analises_Sazonais`.
- Projeto Vercel criado como `analises-sazonais` no scope `reise-team`.
- GitHub conectado ao projeto Vercel para proximos deploys automaticos.
- Deploy de producao validado em `https://analises-sazonais.vercel.app`.
- `reise-ssot-bq`, screenshots locais e arquivos `.env*` ficam ignorados e fora do deploy.
- Ajuste mobile no resumo executivo e nos contêineres principais para evitar overflow horizontal no deploy publico, incluindo scrollbar headless.
- Cache dos assets atualizado para `20260813-vercel-mobile-v3`.

## Atualizacao de 2026-08-13 - Apresentacao visual v2

Motivo da revisao: o usuario pediu para refazer a maneira como o dashboard estava sendo apresentado, sem mexer nos dados, nos graficos e nas cores primarias.

O que foi ajustado:

- Nova camada visual `presentation-v2`, mais limpa e sobria que a versao `commercial-v1`.
- Dados, JSON, calculos e logica do heat map nao foram alterados.
- Cores primarias mantidas: fundo escuro, texto claro e acento laranja.
- Fundo visual simplificado para reduzir ruido.
- Resumo executivo ficou mais compacto e menos chamativo.
- KPIs e cards principais ficaram mais contidos, com bordas e sombras mais leves.
- Acentos secundarios fortes foram reduzidos; a hierarquia passa a depender principalmente do laranja primario.
- Cache dos assets atualizado para `20260813-presentation-v2`.

## Atualizacao de 2026-08-13 - Acabamento comercial para apresentacao

Motivo da revisao: o usuario pediu para deixar o dashboard com visual mais comercial e melhor para apresentacao.

O que foi ajustado:

- Nova faixa `Resumo executivo` acima dos KPIs, com quatro sinais de leitura rapida: `Semana critica`, `Dia da Black`, `Linha lider` e `Faixa de preco`.
- A faixa executiva e alimentada pelos dados reais do dashboard, sem numeros manuais.
- KPIs ganharam linhas de acento por tema, acabamento mais premium e maior hierarquia visual.
- Cards de ranking ganharam topo colorido, sombra mais leve, acabamento consistente e destaque visual do primeiro item.
- Cesta/recompra recebeu acentos por cor para diferenciar os quatro indicadores principais.
- Heat map recebeu fundo e borda mais comerciais, mantendo a marcacao da Semana 4 e do dia `28/11/2025`.
- Cache dos assets atualizado para `20260813-commercial-v1`.

## Atualizacao de 2026-08-13 - Marcacao da Black no calendario

Motivo da revisao: o usuario pediu uma marcacao minimalista da semana da Black e do dia da Black dentro do calendario/heat map.

O que foi ajustado:

- O seletor passou a exibir `Semana 4 - Black`.
- O cabecalho do heat map mostra um selo `Semana da Black` quando a Semana 4 esta selecionada.
- O dia `28/11/2025` fica marcado com chip `Black` na linha do calendario.
- As celulas e o total diario de `28/11/2025` ganharam uma borda laranja discreta para orientar a leitura sem poluir o grafico.
- A Black Friday de novembro/2025 foi tratada como `2025-11-28`.
- Cache dos assets atualizado para `20260813-black-calendar-v1`.

## Atualizacao de 2026-08-12 - Escopo principal Tenis + Mochilas + Brindes

Motivo da revisao: o usuario definiu que acessorios, para esta analise, significam somente `Mochilas`. Com excecao de `Tenis`, `Mochilas` e `Brindes oficiais`, todo o restante deixa de fazer parte da analise principal.

Regra atual:

- Entram na analise principal paga: linhas de tenis classificadas e `Mochilas`.
- Entram em bloco separado: brindes oficiais validados.
- Saem da analise principal: `Vestuario`, `Acessorios` pagos, `Oculos`, `Chinelo e Sandalias` e `Outros`.
- As faixas de valor e percentuais agora usam denominador `Tenis + Mochilas`, nao mais todos os itens pagos.
- `Mochilas` e o unico acessorio exibido/analisado.

Numeros do escopo principal:

- Unidades analisadas: `14.025`.
- Receita analisada: `R$ 5.109.471,27`.
- Tenis: `11.338` unidades.
- Mochilas: `2.687` unidades.
- Fora da analise principal: `3.475` unidades pagas.
- Aba auxiliar usada para recalculo: `scope_calc`.

## Atualizacao de 2026-08-12

Motivo da revisao: o usuario identificou discrepancias entre cards e falta de clareza sobre `Recompra` e `Cesta 2+`.

O que foi ajustado:

- A tela passou a separar explicitamente `pedido total da base` de `pedido com item pago`.
- O card de unidades pagas agora informa `11.267 pedidos totais na base`.
- A secao executiva foi renomeada para `Cesta 2+ e recompra`.
- Antes dos cards de cesta/recompra, o dashboard mostra uma faixa de definicoes com:
  - `Cesta 2+`: mesmo pedido com 2 ou mais itens pagos.
  - `Recompra`: mesmo cliente com 2 ou mais pedidos pagos em novembro.
  - `Base`: `11.249 pedidos pagos` e `10.383 clientes pagos`, excluindo brindes e itens zerados.
- A auditoria ganhou o card `Base de cesta/recompra` para evitar comparacao incorreta entre denominadores.
- O cache dos assets foi atualizado para `20260812-bases-v1` naquele ajuste; a versao atual do cache esta em `20260812-scope-tenis-mochilas-v1`.

Regra de leitura para diretoria:

- Usar `11.267` quando o assunto for pedido total encontrado na base do mes.
- Usar `11.249` quando o assunto for cesta, recompra ou comportamento de compra paga.
- Nunca comparar percentual de cesta/recompra contra `11.267`, porque essa analise exclui pedidos sem item pago valido.

## Atualizacao de 2026-08-12 - Heat map semana x dia x hora

Motivo da revisao: o usuario pediu que o heat map seguisse o exemplo visual, com semana, dia e hora: cada semana abre uma matriz propria, dias nas linhas e 00h-23h nas colunas.

O que foi adicionado:

- Secao executiva `Heat map por semana, dia e horario` abaixo de `Cesta 2+ e recompra`.
- Nova aba `7. Heat map` com a tabela completa de `720` linhas: 30 dias x 24 horas.
- Card de auditoria `Base do heat map`, para deixar claro que a base e a mesma de comportamento pago: `11.249 pedidos pagos`.
- CSV local de apoio `data/heatmap_day_hour_values.csv`, exportado da aba `heatmap_day_hour_values`.
- Script reprodutivel `scripts/build_heatmap_day_hour.js` para regenerar `salesHeatmap` no JSON.
- Heat map executivo mostra apenas uma semana por vez, controlada pelo seletor `Semana`; nao empilhar as 4 semanas na tela principal.
- Coluna `Total` adicionada no canto direito do grafico para fechar o volume de pedidos de cada dia.
- Cache dos assets atualizado para `20260812-heatmap-total-v1`.

Regra do heat map:

- Semana 1: `2025-11-01` a `2025-11-07`.
- Semana 2: `2025-11-08` a `2025-11-14`.
- Semana 3: `2025-11-15` a `2025-11-21`.
- Semana 4: `2025-11-22` a `2025-11-30`.
- Hora local: America/Sao_Paulo, calculada a partir de `paid_at`; se ausente, usa `created_at`.
- Intensidade visual: volume de pedidos pagos por dia/hora.
- Receita do heat map foi reconciliada proporcionalmente para bater com a receita paga oficial do snapshot: `R$ 5.551.173,67`.

Leitura executiva do heat map:

- Base: `11.249` pedidos pagos e `17.500` unidades pagas.
- Semana mais forte: `Semana 4`, com `5.849` pedidos pagos, `52,0%` do volume pago.
- Horario lider agregado no mes: `20h`, com `1.013` pedidos pagos.
- Pico dia/hora do mes: `20/11 | 20h`, com `184` pedidos e `277` unidades.
- Semana 4 segue sendo a maior concentracao semanal, mas o maior bloco isolado de dia/hora acontece na semana 3.
- Na tela principal, apenas a semana selecionada aparece como grafico; o seletor permite alternar entre Semana 1, 2, 3 e 4.
- Cada linha/dia termina com a coluna `Total`, somando os pedidos das 24 horas exibidas.

## Fonte de dados

Fonte usada nesta versao: planilha `BASE_BLACK_2025` enviada pelo usuario.

- Planilha original: `https://docs.google.com/spreadsheets/d/15REk8KShg2Q_BatDzvdD0RpkisR3UvSc_QVC3NnJwTs/edit?gid=946053942#gid=946053942`
- Copia de calculo/auditoria: `https://docs.google.com/spreadsheets/d/1X8V3tef_gkU3GSquaYY2kGPn-jhIjLqRuiZ6GLLMNJI/edit?usp=drivesdk`
- Planilha de valores exportados do heat map: `https://docs.google.com/spreadsheets/d/1LgeuVZlnN1yDg7MNW6kMF1wmyFLXHDvABF35Ffij-Hc/edit?usp=drivesdk`
- Aba original: `bq-results-20260808-155535-1786204572978`
- Aba auxiliar: `dash_calc`
- Aba auxiliar do escopo principal: `scope_calc`
- Aba auxiliar de recompra/cesta: `recompra_calc`
- Aba auxiliar de heat map: `heatmap_calc`
- Aba auxiliar de coorte pre-Black: `coorte_pre_black_calc`
- Aba de valores exportados para o heat map: `heatmap_day_hour_values`
- Snapshot local usado pelo dashboard: `data/black_nov_2025_dashboard.json`
- CSV local de apoio do heat map: `data/heatmap_day_hour_values.csv`

Importante:

- `data/black_nov_2025_rows.csv` e legado do scaffold inicial e nao e a fonte atual do dashboard.
- Nao inventar numeros. Se precisar atualizar dados, voltar na planilha ou no BigQuery/AppScript e regenerar o JSON.
- O periodo do estudo e fechado: `2025-11-01` a `2025-11-30`.

## Numeros principais do snapshot atual

- Linhas de item: `18.413`
- Pedidos unicos: `11.267`
- Unidades pagas totais na base: `17.500`
- Unidades analisadas no escopo principal: `14.025`
- Receita analisada no escopo principal: `R$ 5.109.471,27`
- Unidades pagas fora da analise principal: `3.475`
- Brindes oficiais: `1.480`
- Itens descontados fora da lista oficial: `606`
- Unidades totais: `19.586`
- Receita paga total na base: `R$ 5.551.173,67`
- Valor de tabela dos brindes oficiais: `R$ 556.797,00`
- Linhas classificadas como `Outros`: `1.018`
- Linhas sem SKU: `5`
- Pedidos pagos usados na analise de cesta: `11.249`
- Media geral de carrinho na Black: `1,56` item pago por pedido pago.
- Pedidos pagos com cesta 2+: `3.583`, `31,9%`
- Receita em pedidos pagos com cesta 2+: `R$ 2.827.893,32`, `50,9%`
- Clientes pagos no periodo: `10.383`
- Clientes que compraram mais de uma vez na Black: `743`, `7,2%`
- Pedidos desses clientes: `1.610`, `14,3%`
- Receita desses clientes: `R$ 747.124,93`, `13,5%`
- Heat map: `720` celulas, sendo `30` dias x `24` horas, separadas visualmente por semana.
- Semana mais forte no heat map: `Semana 4`, `5.849` pedidos pagos, `52,0%`.
- Horario lider agregado no heat map: `20h`, `1.013` pedidos pagos no mes.
- Pico do heat map por dia/hora: `20/11 | 20h`, `184` pedidos e `277` unidades.

## Bases e discrepâncias aparentes

Ponto crítico para próximos chats: não misturar os denominadores.

- `11.267` = pedidos totais da base em novembro de 2025.
- `11.249` = pedidos com pelo menos 1 item pago. Esta é a base usada em `Comportamento de compra`.
- Diferença: `18` pedidos aparecem na base total, mas não entram na cesta paga porque não têm item pago válido para essa análise.
- `Cesta 2+` = mesmo pedido com 2 ou mais itens/produtos pagos.
- `Recompra` = mesmo `customer_sk` com 2 ou mais pedidos pagos dentro de `2025-11-01` a `2025-11-30`.
- Brindes oficiais, itens zerados e itens com desconto integral fora da lista de brindes não entram no cálculo de cesta paga nem de recompra.
- Se os cards parecerem divergentes, primeiro validar se o card usa base total, unidade paga, brinde oficial ou pedido pago.

## Regras de calculo

- Itens pagos excluem brindes.
- Brinde oficial usa apenas a lista validada pelo usuario: `Relógio`, `Sneaker Bag`, `Case de notebook`, `Óculos Suzuka`, `Necessaire` e `Deskpad`.
- Itens com desconto integral fora dessa lista ficam registrados como itens descontados fora da lista, mas nao entram no ranking nem no percentual de brindes.
- Analise de faixa de valor usa apenas o escopo principal pago: `Tenis + Mochilas`.
- Ranking de linhas da tela principal mostra linhas de tenis, excluindo `Mochilas`, `Acessorios`, `Vestuario`, `Oculos`, `Chinelo e Sandalias` e `Outros`.
- Acessorios, nesta analise, significam somente `Mochilas`.
- `Mochilas` ficam em bloco proprio para nao misturar com ranking de linhas como `RS6` e `RS7`.
- Recompra usa `customer_sk` e considera cliente com mais de 1 pedido pago dentro de `2025-11-01` a `2025-11-30`.
- Cesta 2+ usa pedido com mais de 1 item/produto pago; brindes e itens zerados/descontados nao entram nessa cesta paga.
- Heat map usa pedidos pagos, exclui brindes oficiais e itens integralmente descontados fora da lista oficial.
- Heat map agrupa por semana fixa do mes, dia do mes e hora local Sao Paulo; nao usa semana calendario ISO.

## Leituras atuais que aparecem no dashboard

### 1. Ranking de linhas

Top linhas de tenis, excluindo mochilas e demais linhas fora do escopo:

- `RS7`: `2.590` unidades, `22,8%` do volume de tenis.
- `RS6`: `2.485` unidades, `21,9%`.
- `RS Knit`: `1.174` unidades, `10,4%`.
- `911 Carrera`: `605` unidades, `5,3%`.
- `RS6 GT`: `599` unidades, `5,3%`.
- `911 GT`: `516` unidades, `4,6%`.

### 2. Faixas de valor

- `Abaixo de 400`: `8.769` unidades, `62,5%` do volume analisado.
- `400 a 500`: `2.510` unidades, `17,9%`.
- `500 a 600`: `1.242` unidades, `8,9%`.
- `600 a 700`: `925` unidades, `6,6%`.
- `Acima de 700`: `579` unidades, `4,1%`.

### 3. Mochilas como acessorio

- `Mochilas`: `2.687` unidades, `19,2%` do volume analisado.
- Receita de mochilas: `R$ 967.312,42`, `18,9%` da receita analisada.
- `Acessorios` pagos, `Oculos`, `Vestuario`, `Chinelo e Sandalias` e `Outros` ficam fora da analise principal.

### 3.1 Mochilas

Top mochilas:

- `Mochila Slim Couro Preta I NYC - Preta`: `863` unidades, `32,1%` das mochilas.
- `Mochila Couro Manhattan Preto - Preto`: `721` unidades, `26,8%`.
- `Mochila Slim Couro Marrom I NYC - Marrom`: `388` unidades, `14,4%`.
- `Mochila Couro Manhattan Marrom - Marrom`: `282` unidades, `10,5%`.
- `Mochila de Couro Preta Munich - Preta`: `228` unidades, `8,5%`.

### 4. Percentual por valor de produto

Mesmas faixas de valor, mas priorizando leitura de participacao por unidades e receita. A faixa `Abaixo de 400` concentra o maior volume e tambem a maior parcela de receita entre as faixas.

### 5. Brindes

Top brindes oficiais:

- `Óculos Suzuka`: `324` unidades, `21,9%` dos brindes oficiais.
- `Deskpad`: `315` unidades, `21,3%`.
- `Relógio`: `299` unidades, `20,2%`.
- `Case de notebook`: `261` unidades, `17,6%`.
- `Necessaire`: `215` unidades, `14,5%`.
- `Sneaker Bag`: `66` unidades, `4,5%`.

### 6. Comportamento de compra

Leitura executiva:

- `3.583` pedidos pagos tiveram cesta 2+, `31,9%` dos pedidos pagos.
- Esses pedidos concentraram `R$ 2.827.893,32`, `50,9%` da receita paga.
- A Black toda teve media geral de `1,56` item pago por pedido pago.
- A cesta 2+ teve media de `2,7` itens pagos apenas dentro dos pedidos com 2+ itens.
- `743` clientes compraram mais de uma vez na Black, `7,2%` dos clientes pagos.
- Esses clientes fizeram `1.610` pedidos, `14,3%` dos pedidos pagos.
- Esses clientes geraram `R$ 747.124,93`, `13,5%` da receita paga.

Produtos que mais aparecem em pedidos com 2+ itens:

- As listas exibidas no dashboard foram filtradas para nao mostrar produtos fora do escopo principal.
- Exibir apenas linhas/produtos de `Tenis` e `Mochilas`.
- Nao exibir camisetas, vestuario, acessorios pagos, oculos, chinelos/sandalias ou outros.

Produtos mais comprados por recompradores:

- As listas exibidas no dashboard tambem seguem o filtro `Tenis + Mochilas`.
- Os totais executivos de cesta/recompra ainda preservam a base de comportamento pago ja validada; recalcular esses totais por escopo e uma etapa separada se o usuario pedir.

### 7. Heat map semana x dia x horario

Leitura executiva:

- A leitura usa `11.249` pedidos pagos, mesma base de comportamento pago.
- `Semana 4` concentra `5.849` pedidos pagos, `52,0%` do volume do heat map.
- O horario lider agregado e `20h`, com `1.013` pedidos pagos no mes.
- O pico dia/hora do mes acontece em `20/11`, as `20h`, com `184` pedidos e `277` unidades.
- A malha tem `720` celulas: 30 dias cruzados com 24 horas, separados em semanas 1, 2, 3 e 4.
- A visualizacao principal mostra uma unica malha por vez; a semana exibida e definida pelo seletor `Semana`.
- A tabela detalhada esta na aba `7. Heat map` do dashboard.

## Arquivos principais

- `index.html`: estrutura do dashboard e cache busting dos assets.
- `assets/app.js`: carrega `data/black_nov_2025_dashboard.json`, calcula percentuais e renderiza os cards/tabelas.
- `assets/styles.css`: tema escuro, grid alinhado, cards, tabelas e responsividade.
- `data/black_nov_2025_dashboard.json`: snapshot agregado que alimenta o dashboard atual, incluindo `repurchaseAnalysis` e `salesHeatmap`.
- `data/heatmap_day_hour_values.csv`: export local da aba `heatmap_day_hour_values`, usado para o heat map por dia/hora.
- `scripts/build_heatmap_day_hour.js`: regenera o bloco `salesHeatmap` do JSON a partir do CSV local.
- `scripts/apply_scope_tenis_mochilas.js`: aplica o escopo principal `Tenis + Mochilas` no snapshot local.
- `sql/black_nov_2025_study.sql`: apoio para reproduzir a logica no BigQuery.
- `sql/black_nov_2025_export_for_localhost.sql`: export granular legado/apoio.
- `apps_script/BlackNov2025Export.gs`: helper opcional para exportar via Apps Script.

## Como rodar localmente

Na pasta do projeto:

```powershell
python -m http.server 8000
```

Abrir:

```text
http://127.0.0.1:8000/index.html
```

Para regenerar somente o heat map depois de atualizar o CSV local:

```powershell
node scripts\build_heatmap_day_hour.js
```

Para reaplicar o escopo principal `Tenis + Mochilas` depois de mexer no JSON:

```powershell
node scripts\apply_scope_tenis_mochilas.js
```

Se aparecer versao antiga ou tela branca:

1. Usar `Ctrl + F5` no navegador.
2. Conferir se `index.html` esta apontando para os assets com a versao mais recente.
3. Rodar `node --check assets/app.js`.
4. Conferir se `data/black_nov_2025_dashboard.json` responde no localhost.

## Validacao recomendada

```powershell
node --check assets\app.js
node --check scripts\build_heatmap_day_hour.js
node --check scripts\apply_scope_tenis_mochilas.js
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8000/index.html | Select-Object StatusCode
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8000/data/black_nov_2025_dashboard.json | Select-Object StatusCode
rg --pcre2 "\x{00C3}|\x{FFFD}" index.html assets\app.js assets\styles.css data\black_nov_2025_dashboard.json README.md
```

Validacoes visuais mais recentes:

- `layout-check-black-scope-tenis-mochilas-desktop.png`
- `layout-check-black-scope-tenis-mochilas-mobile.png`

Validacoes visuais anteriores, mantidas apenas como historico:

- `layout-check-black-heatmap-total-desktop.png`
- `layout-check-black-heatmap-total-mobile.png`
- `layout-check-black-heatmap-select-desktop.png`
- `layout-check-black-heatmap-select-mobile.png`
- `layout-check-black-heatmap-day-tall.png`
- `layout-check-black-heatmap-day-mobile-table.png`
- `layout-check-black-heatmap-desktop.png`
- `layout-check-black-heatmap-mobile-full.png`
- `layout-check-black-heatmap-mobile-heatmap.png`
- `layout-check-black-bases-desktop.png`
- `layout-check-black-bases-mobile.png`
- `layout-check-black-bases-mobile-full.png`
- `layout-check-black-aligned-desktop.png`
- `layout-check-black-aligned-mobile.png`
- `layout-check-black-recompra-desktop.png`
- `layout-check-black-recompra-mobile-full.png`

## Preferencias do usuario neste projeto

- Quer uma leitura objetiva: quem bater o olho precisa entender todos os dados.
- Nao quer cards com espacos em branco desalinhados.
- Tudo precisa estar alinhado: cards, linhas, alturas e hierarquia visual.
- Quer os 5 temas pedidos juntos na primeira tela, nao escondidos apenas em abas.
- Quer validar via localhost quando o trabalho ainda estiver em construcao.
- Publicacao GitHub/Vercel autorizada e executada em `2026-08-13`.

## Cuidados para o proximo agente

- Comece lendo este README antes de mexer.
- Depois leia `index.html`, `assets/app.js`, `assets/styles.css` e `data/black_nov_2025_dashboard.json`.
- Nao recomece do zero: o projeto ja tem fonte, snapshot, layout e regras de classificacao.
- Nao trocar a fonte de dados sem avisar o usuario.
- Nao misturar brindes em analise de vendas pagas.
- Nao voltar a classificar todo item 100% descontado como brinde; usar a lista oficial do usuario.
- Nao colocar `Mochilas` como linha lider no bloco de linhas principais; mochilas ficam no bloco proprio.
- Se alterar CSS ou JS, atualizar a query string em `index.html` para evitar cache.
- Se alterar dados, atualizar tambem esta documentacao com novos totais e nova data de validacao.
- Se mexer no escopo principal, manter somente `Tenis + Mochilas + Brindes oficiais`; rodar `node scripts\apply_scope_tenis_mochilas.js`.
- Se mexer na analise de recompra, usar a aba `recompra_calc` da copia de trabalho e manter claro que a base e itens pagos, nao todos os itens.
- Se mexer no heat map, usar a aba `heatmap_calc`, exportar `heatmap_day_hour_values`, rodar `node scripts\build_heatmap_day_hour.js` e manter as 4 semanas fixas de novembro com dia + hora local Sao Paulo.
- Se usar BigQuery, confirmar schema real antes de substituir `Vendas_pedidos_Linha` ou qualquer mart documentado.

## Prompt rapido para novo chat

Se o usuario abrir um chat novo, pode colar:

```text
Estamos no projeto C:\Users\reise\OneDrive\Area de Trabalho\DADOS\Black -analise 2025-2026.
Leia o README.md primeiro. E um dashboard local da Black 2025 para forecast de compras, usando data/black_nov_2025_dashboard.json vindo da planilha BASE_BLACK_2025. Preserve os 5 blocos principais com escopo principal somente de Tenis + Mochilas + Brindes oficiais; acessorio nesta analise significa apenas Mochilas. Vestuario, Acessorios pagos, Oculos, Chinelo e Sandalias e Outros ficam fora da analise principal. Ha tambem secoes executivas de Comportamento de compra e de Heat map semana x dia x horario. Nao misture os denominadores: 11.267 e pedido total da base; 14.025 e unidade analisada no escopo principal; 11.249 e pedido com item pago usado nas extensoes de comportamento quando nao recalculadas. Brindes oficiais sao somente Relógio, Sneaker Bag, Case de notebook, Óculos Suzuka, Necessaire e Deskpad. O heat map usa semanas fixas de novembro: 1=01-07, 2=08-14, 3=15-21, 4=22-30, com dias nas linhas, 00h-23h nas colunas e coluna Total no canto direito em hora local Sao Paulo. Mostrar apenas um grafico por vez no heat map, controlado pelo seletor Semana. Se atualizar o CSV, rodar `node scripts\build_heatmap_day_hour.js`; se alterar escopo, rodar `node scripts\apply_scope_tenis_mochilas.js`. Rodar em http://127.0.0.1:8000/index.html e validar visualmente antes de responder.
```
