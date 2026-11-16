# Calculadora de consumo de gás

Página estática (HTML + JS, sem dependências). Carregue o CSV do historiador e veja o consumo diário em m³.
Tudo roda no navegador; nenhum dado é enviado.

- `index.html` – interface
- `calc.js` – cálculo (mesma lógica da planilha: ajuste de fuso, diferença do contador, zeramento, hora a hora, PCI/PCS ponderados)
- Tags padrão: CF902 (Tramo A), CF904/CF903 (Tramo B), EN02 (PCI), EN01 (PCS); mudam na tela.
