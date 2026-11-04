# SIAG – Sistema Integrado de Aferição de Gás · versão 1.4.1

Data da versão: 04/11/2026
Endereço publicado: https://rairieltomaz.github.io/SIAG/

## Conteúdo do pacote

| Pasta / arquivo | Para que serve |
|---|---|
| `index.html` (raiz) | O aplicativo completo (um arquivo só). Abre em qualquer navegador. |
| `manifest.json`, `sw.js`, `icon-*.png` (raiz) | Permitem instalar no celular ("Adicionar à tela inicial") e usar sem internet. |
| `usuarios.json` (raiz) | **Lista central de usuários e senhas** (senhas guardadas só como hash PBKDF2 com sal). É gravada pelo próprio app (Ajustes, perfil Administrador). Não edite à mão nem apague. |
| `ajustes.json` (raiz) | **Ajustes de cálculo centrais** (tolerância, PCS, limites DESSEM, Ton/Toff, modelo da usina). Gravado pelo app (Ajustes › Publicar). Não edite à mão nem apague. |
| `codigo-fonte/SIAG-app.dc.html` | Fonte do app (telas + lógica). É dele que o `index.html` é gerado. |
| `codigo-fonte/runtime.js` | Motor que desenha as telas no navegador. |
| `codigo-fonte/build.py` | Script que gera a pasta `codigo-fonte/siag/` a partir da fonte. |
| `codigo-fonte/cea-logo.png` | Logo usada no app. |

## Como publicar / atualizar

1. Gere o app: dentro de `codigo-fonte/`, rode `python3 build.py` (requer Python 3). Ele grava a pasta `codigo-fonte/siag/`.
2. Copie `index.html`, `sw.js`, `manifest.json` e os ícones dessa pasta para a raiz do repositório e publique. **Não substitua nem apague o `usuarios.json` nem o `ajustes.json` da raiz** – eles guardam os usuários, as senhas e os ajustes atuais.
3. Antes de publicar uma versão nova, puxe as alterações do GitHub (`git pull`): cada troca de senha ou de ajuste feita no app vira um commit no repositório.
4. Os celulares baixam a versão nova ao abrir o app com internet.

## Ajustes de cálculo centralizados (desde a 1.4)

- Os valores de Ajustes ficam no arquivo `ajustes.json` do repositório. Todos os aparelhos usam **os valores publicados**, baixados junto com a lista de usuários (ao abrir o app, ao voltar para ele e antes de cada login); sem internet, usam os últimos baixados.
- Quem pode alterar: **Administrador** e **Regulação**, num aparelho com o token do GitHub configurado (card "Publicação no GitHub", no topo de Ajustes).
- Ao editar um campo, a alteração fica como **rascunho** (campo em laranja, com o valor publicado ao lado). Os cálculos continuam com o valor publicado até tocar em **Publicar para todos os aparelhos**. **Descartar** volta aos valores publicados.
- A publicação grava só os campos alterados por cima da versão mais nova do arquivo, então duas pessoas mexendo em campos diferentes não desfazem a alteração uma da outra.
- Valores inválidos (texto, zero/negativo, PCS fora de 6.000–12.000, tolerância acima de 50%) não são publicados.
- Migração: se um aparelho tinha ajustes próprios da versão anterior, diferentes dos centrais, eles aparecem para o Administrador/Regulação como rascunho ("Este aparelho tinha ajustes próprios…") para publicar ou descartar. Nos aparelhos de operação esses valores antigos são ignorados.

## Usuários e senhas centralizados (desde a 1.3)

- A lista de usuários fica no arquivo `usuarios.json` do repositório `rairieltomaz/SIAG`. Todo aparelho baixa essa lista ao abrir o app, ao voltar para o app e antes de cada login; sem internet, usa a última lista baixada.
- No primeiro acesso de um aparelho é preciso internet para baixar a lista.
- Só o **Administrador** cadastra, remove e troca senhas (Ajustes › Usuários). Cada alteração é publicada na hora no GitHub e passa a valer em todos os aparelhos. Quem estiver conectado com um usuário cuja senha mudou é desconectado e precisa entrar com a senha nova.
- Para publicar, o aparelho do administrador precisa de um **token do GitHub** (configurado uma vez):
  1. Abra https://github.com/settings/personal-access-tokens/new (logado como rairieltomaz).
  2. Nome: `SIAG`. Validade: a que preferir (ex.: 1 ano; ao vencer, gere outro e cole de novo).
  3. *Repository access* › *Only select repositories* › `SIAG`. **Não deixe no padrão "Public repositories"**: esse token só lê e o app recusa.
  4. *Permissions* › *Repository permissions* › *Contents*: **Read and write**.
  5. *Generate token*, copie o código (`github_pat_…`) e cole no SIAG no campo **Token do GitHub** (card "Publicação no GitHub" em Ajustes, ou na tela de criação de senha) › **Salvar token**. O app confere se o token consegue gravar antes de salvar (sem alterar nada no repositório).
  6. Se o token vencer ou perder a permissão, a publicação falha, o app remove o token do aparelho e mostra o campo de novo. Para trocar a qualquer momento: **Trocar token** (tela de senha) ou **Remover** (Ajustes).
  O token fica guardado só nesse aparelho. Se o celular for perdido, apague o token no GitHub (Settings › Developer settings › Fine-grained tokens).
- O arquivo `usuarios.json` é público (o site está no GitHub Pages). Ele não contém as senhas, só hashes com sal, mas senhas curtas ou óbvias podem ser descobertas por quem tiver conhecimento técnico: use senhas com pelo menos 8 caracteres misturando letras, números e símbolos.

## Histórico

- **1.4.1 (04/11/2026)** – Correção do acesso à senha: o app só aceita token que consegue gravar no repositório (antes aceitava token só de leitura, e a criação da senha do administrador falhava sem saída). Botão "Trocar token" na tela de senha; token recusado pelo GitHub é removido e o campo volta a aparecer. Instruções do token com link direto e o passo "Only select repositories › SIAG" destacado.
- **1.4 (03/11/2026)** – Ajustes de cálculo centralizados no `ajustes.json` do GitHub: os cálculos de todos os aparelhos usam os valores publicados. Edição vira rascunho até publicar; ajustes antigos do aparelho viram rascunho para conferência. Token do GitHub passa para o card "Publicação no GitHub" (Administrador e Regulação).
- **1.3 (03/11/2026)** – Usuários e senhas centralizados no `usuarios.json` do GitHub: uma senha criada ou trocada vale em todos os aparelhos. Administrador publica as alterações com token do GitHub; troca de senha desconecta as sessões antigas; operação e regulação não trocam a própria senha (pedem ao administrador).
- **1.2.1 (21/10/2026)** – Comprovante sem assinaturas e com a programação de geração simulada.
- **1.2 (21/10/2026)** – Comprovante de leitura (imprimir / salvar PDF) na aba Verificar.
- **1.1 (21/10/2026)** – Inclui as correções da 1.0.1 (login tolerante a espaços e traços, atualização sem cache). Verificar: horário em Manaus com conversão automática para Brasília; totalizador digitado sem conversão e convertido para PCS 9.400, com os dois valores na tela; removido o modo "Contrato" que travava o PCS em 9.400 e gerava desvio falso.
- **1.0.1** – Login tolerante a espaços e traços; atualização sem cache.
- **1.0 (18/10/2026)** – Versão inicial.

## Acessos

| Login | Perfil | O que acessa |
|---|---|---|
| CEA-ADM | Administrador principal | Tudo, inclusive Ajustes, cadastro de usuários e troca de senhas (publicadas para todos os aparelhos) |
| CEA-REG | Regulação | Tudo, inclusive publicar Ajustes de cálculo (com token); sem gestão de usuários |
| CEA-OPE | Operação | Programa, Ton/Toff, Verificar e Resumo (sem Ajustes) |

- Senha padrão inicial das três contas: **Siag@2026**. No primeiro acesso do CEA-ADM o app obriga a criar a senha do administrador (e pede o token do GitHub). Em seguida, defina em Ajustes as senhas do CEA-REG e do CEA-OPE – enquanto isso não for feito, elas continuam com a senha padrão e o app mostra o aviso "AINDA COM SENHA PADRÃO".
- Usuários, senhas e Ajustes de cálculo valem em todos os aparelhos (centrais no GitHub). Programação e leituras continuam gravadas **no próprio aparelho**.
- O login separa perfis, mas não é proteção contra quem tem conhecimento técnico.

## Telas

1. **Programa** – data do PDP, PCS medido (opcional), lançamento por faixa (De/Até/MW/GTs) ou colagem dos 48 valores do PDPW. Tabela de 30 min com volume acumulado no PCS medido e na base do contrato (9.400 kcal/m³). Intertravamento: só libera a verificação com os 48 intervalos completos (MW e GTs) e sem erros.
2. **Ton/Toff** – calculadora por GT (ligada/desligada desde) e conferência das partidas/paradas da programação. Inclui a nota operacional DESSEM / CER-D nº 464/22.
3. **Verificar** – operador, horário da leitura **em Manaus** (o app converte sozinho para Brasília, +1 h, e mostra o horário convertido), PCS médio medido, totalizador GRMS **digitado como lido, sem conversão** (até 6 dígitos). O app converte o totalizador para o PCS 9.400 e mostra os dois valores (lido e convertido), o previsto nas duas bases e o desvio. Para salvar exige operador, totalizador e PCS; bloqueia leituras que diminuem com o tempo. O botão **"Salvar e gerar comprovante"** e o ícone de documento em cada leitura salva abrem o **comprovante da leitura** (A4, pronto para imprimir ou salvar em PDF), com código da leitura, horários de Manaus e Brasília, operador, usuário, potência e GTs do PDP, totalizador lido e convertido para 9.400, previsto, desvio e resultado. A 2ª página traz a **programação de geração simulada** do dia (48 intervalos: horário Brasília/Manaus, MW, GTs, gás a cada 30 min e acumulado nas bases PCS medido e 9.400), com o intervalo da leitura destacado. A programação fica registrada no momento em que a leitura é gravada.
4. **Resumo** – gás previsto no dia, energia, consumo específico, partidas, avisos, gráfico de 30 min e leituras registradas.
5. **Ajustes** (ADM e REG) – tolerância, PCS de referência, limites DESSEM, Ton/Toff e modelo da usina (centrais: publicados para todos os aparelhos) e usuários (só ADM).

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

- Programação e leituras não são compartilhadas entre celulares (cada aparelho tem seu próprio registro). Usuários, senhas (1.3) e Ajustes de cálculo (1.4), sim.
- O consumo previsto é extrapolado da reta do teste de 96 h fora do ponto de 114 MW.
