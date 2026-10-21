# SIAG – Sistema Integrado de Aferição de Gás · versão 1.2.1

Data da versão: 21/10/2026
Endereço publicado: https://rairieltomaz.github.io/SIAG/

## Conteúdo do pacote

| Pasta / arquivo | Para que serve |
|---|---|
| `app/index.html` | O aplicativo completo (um arquivo só). Abre em qualquer navegador. |
| `app/manifest.json`, `app/sw.js`, `app/icon-*.png` | Permitem instalar no celular ("Adicionar à tela inicial") e usar sem internet. |
| `codigo-fonte/SIAG-app.dc.html` | Fonte do app (telas + lógica). É dele que o `index.html` é gerado. |
| `codigo-fonte/runtime.js` | Motor que desenha as telas no navegador. |
| `codigo-fonte/build.py` | Script que gera a pasta `app/` a partir da fonte. |
| `codigo-fonte/cea-logo.png` | Logo usada no app. |

## Como publicar / atualizar

1. Copie **todo o conteúdo da pasta `app/`** para o servidor (GitHub Pages, intranet da TI ou outro).
2. Para atualizar uma versão, substitua os arquivos no mesmo endereço. Os celulares baixam a versão nova ao abrir o app com internet.
3. Para testar no computador sem servidor, basta abrir `app/index.html` no Chrome (a instalação como app só funciona quando publicado em https).

Para gerar de novo a pasta `app/` a partir da fonte (requer Python 3): dentro de `codigo-fonte/`, rode `python3 build.py`. Ele lê `SIAG-app.dc.html`, `runtime.js`, `cea-logo.png` e os ícones, e grava a pasta `siag/`.

## Histórico

- **1.2.1 (21/10/2026)** – Comprovante sem assinaturas e com a programação de geração simulada.
- **1.2 (21/10/2026)** – Comprovante de leitura (imprimir / salvar PDF) na aba Verificar.
- **1.1 (21/10/2026)** – Inclui as correções da 1.0.1 (login tolerante a espaços e traços, atualização sem cache). Verificar: horário em Manaus com conversão automática para Brasília; totalizador digitado sem conversão e convertido para PCS 9.400, com os dois valores na tela; removido o modo "Contrato" que travava o PCS em 9.400 e gerava desvio falso.
- **1.0.1** – Login tolerante a espaços e traços; atualização sem cache.
- **1.0 (18/10/2026)** – Versão inicial.

## Acessos

| Login | Perfil | O que acessa |
|---|---|---|
| CEA-ADM | Administrador principal | Tudo, inclusive Ajustes, cadastro de usuários e redefinição de senhas |
| CEA-REG | Regulação | Tudo, inclusive Ajustes; sem gestão de usuários |
| CEA-OPE | Operação | Programa, Ton/Toff, Verificar e Resumo (sem Ajustes) |

- Senha padrão de primeiro acesso: **Siag@2026**. No primeiro acesso o app obriga a criar uma senha pessoal.
- Senhas, usuários cadastrados, programação e leituras ficam gravados **no próprio aparelho** (não há servidor central).
- O login separa perfis, mas não é proteção contra quem tem conhecimento técnico.

## Telas

1. **Programa** – data do PDP, PCS medido (opcional), lançamento por faixa (De/Até/MW/GTs) ou colagem dos 48 valores do PDPW. Tabela de 30 min com volume acumulado no PCS medido e na base do contrato (9.400 kcal/m³). Intertravamento: só libera a verificação com os 48 intervalos completos (MW e GTs) e sem erros.
2. **Ton/Toff** – calculadora por GT (ligada/desligada desde) e conferência das partidas/paradas da programação. Inclui a nota operacional DESSEM / CER-D nº 464/22.
3. **Verificar** – operador, horário da leitura **em Manaus** (o app converte sozinho para Brasília, +1 h, e mostra o horário convertido), PCS médio medido, totalizador GRMS **digitado como lido, sem conversão** (até 6 dígitos). O app converte o totalizador para o PCS 9.400 e mostra os dois valores (lido e convertido), o previsto nas duas bases e o desvio. Para salvar exige operador, totalizador e PCS; bloqueia leituras que diminuem com o tempo. O botão **"Salvar e gerar comprovante"** e o ícone de documento em cada leitura salva abrem o **comprovante da leitura** (A4, pronto para imprimir ou salvar em PDF), com código da leitura, horários de Manaus e Brasília, operador, usuário, potência e GTs do PDP, totalizador lido e convertido para 9.400, previsto, desvio e resultado. A 2ª página traz a **programação de geração simulada** do dia (48 intervalos: horário Brasília/Manaus, MW, GTs, gás a cada 30 min e acumulado nas bases PCS medido e 9.400), com o intervalo da leitura destacado. A programação fica registrada no momento em que a leitura é gravada.
4. **Resumo** – gás previsto no dia, energia, consumo específico, partidas, avisos, gráfico de 30 min e leituras registradas.
5. **Ajustes** (ADM e REG) – tolerância, PCS de referência, limites DESSEM, Ton/Toff, modelo da usina e usuários.

A programação (PDP) usa horários de **Brasília (UTC−3)**, independentemente do fuso do celular. Na aba Verificar o operador escolhe o horário de **Manaus (UTC−4)** e o app converte.

## Regras de cálculo

- Potência bruta = MW do ONS × 1,0177849601 (relação bruta/líquida do teste de 96 h).
- Vazão (m³/h) = k × (nº de GTs × a + b × potência bruta), com a = 3.903,118 m³/h, b = 194,980 m³/MWh, k = 1,1171 (reta de Willans calibrada no teste de 96 h).
- Volume em 30 min = vazão × 0,5; acumulado desde 00:00.
- Volume na base do contrato = volume do modelo × 8.501 ÷ 9.400 (8.501 kcal/m³ = PCS do gás do teste; editável em Ajustes).
- Previsto em gás real = volume do modelo × 8.501 ÷ PCS medido. Medido na base do contrato = totalizador lido × PCS medido ÷ 9.400.
- O desvio % é o mesmo nas duas bases (a conversão é aplicada igualmente ao previsto e ao medido).
- Desvio = (medido − previsto) ÷ previsto; dentro da tolerância se |desvio| ≤ 3% (editável).
- Limites DESSEM (líquido): máx. 57,393 MW por GT (com 2 GTs aceita até 115 MW); bloqueia potência acima disso e potência sem GT.
- Ton = 12 h (mínimo ligado); Toff = 4 h (mínimo desligado antes de nova partida).

## Limitações conhecidas

- Dados não são compartilhados entre celulares (cada aparelho tem sua própria programação e registro).
- O consumo previsto é extrapolado da reta do teste de 96 h fora do ponto de 114 MW.
