# Instruções Técnicas para Implementação: Cobrança por Voz (Ecossistema Ergane)

Desenvolva a micro-funcionalidade de cobrança por voz para o ecossistema Ergane, voltado para microempreendedores.

---

## 1. Planejamento Arquitetural (Chain of Thought)

Antes de gerar qualquer código, a implementação deve seguir rigorosamente as diretrizes abaixo:

* **Arquitetura de Componentes e Separação de Responsabilidades:** A interface gráfica (UI) deve ser estritamente "burra" (apenas renderiza o estado recebido via props), enquanto toda a lógica de negócio, requisições de rede, manipulação de áudio e integração com o ecossistema nativo deve ficar isolada em Custom Hooks e serviços dedicados.
* **Gerenciamento de Estado:** O ciclo de vida da interação por voz transita entre os estados: `idle` (inativo), `recording` (gravando), `processing` (processando via LLM) e `success` ou `error`. O estado global da captura será gerido dentro do hook customizado e refletido de forma reativa na UI.
* **Fluxo de Dados:**
1. **Captura:** O usuário aciona o botão de voz, iniciando a escuta e conversão de áudio para texto via `@react-native-voice/voice`.
2. **Processamento:** O texto transcrito é enviado via `fetch` para a LLM, estruturado com um prompt estrito para formato JSON.
3. **Feedback/Resposta:** Se houver erro estrutural ou de negócio, o `expo-speech` sintetiza o áudio da mensagem em `pt-BR`. Se bem-sucedido, desmonta-se o botão de gravação e renderiza-se o card de confirmação.


* **Acessibilidade e Tratamento de Erros:** Todos os componentes interativos devem possuir tamanhos mínimos de toque de 44x44pt, alto contraste visual com NativeWind, rótulos de acessibilidade (`accessibilityLabel` e `accessibilityRole`) e blocos `try/catch` robustos para falhas de microfone, rede ou parsing de JSON.

---

## 2. Especificações Técnicas e Stack

* **Framework:** React Native com Expo.
* **Estilização:** NativeWind (Tailwind CSS para React Native).
* **Restrições:** **Proibido** o uso de tags HTML (`div`, `span`, `p`, etc.). Utilize estritamente componentes nativos do React Native (`View`, `Text`, `TouchableOpacity`, etc.).

---

## 3. Estrutura Mínima de Componentes e Hooks

* **`useVoiceBilling` (Custom Hook):** Abstrai a gravação de áudio, a chamada `fetch` para a LLM, o tratamento do JSON de resposta e a síntese de voz via `expo-speech`.
* **`VoiceRecordButton` (Componente):** Botão interativo com feedback visual dinâmico para os estados `idle`, `recording` e `processing`.
* **`SuccessCard` (Componente):** Card de confirmação exibindo Nome, Valor formatado (BRL), Método de pagamento e um placeholder estruturado para o QR Code.

---

## 4. O Fluxo da Funcionalidade

1. **Ouvir:** Utilizar `@react-native-voice/voice` para transformar a fala do microempreendedor em texto bruto.
2. **Processar:** Enviar o texto extraído para a API de LLM utilizando a seguinte estrutura de constantes:
```javascript
const API_KEY = "SUA_API_KEY_AQUI";

```


* Instruir a LLM a retornar **estritamente** um JSON válido sem marcações markdown adicionais:
* **Sucesso:** `{"nome": "Maria", "valor": 150.00, "metodo": "Pix"}`
* **Falha:** `{"erro": "Mensagem curta de erro"}`




3. **Falar (Erro):** Caso o JSON retorne a chave `erro`, acionar o `expo-speech` para reproduzir a mensagem falada em voz alta (`pt-BR`).
4. **Renderizar (Sucesso):** Caso os dados sejam extraídos corretamente, desmontar o fluxo de escuta e exibir o `SuccessCard` com as informações da transação.

---

## 5. Diretrizes de UX e Acessibilidade

* Garantir paletas de cores com **alto contraste** validadas para uso sob luz solar direta (comum na rotina de microempreendedores na rua).
* Assegurar áreas de toque mínimas de **44x44pt** em todos os elementos acionáveis.
* Implementar propriedades completas de acessibilidade (`accessibilityLabel`, `accessibilityHint` e `accessibilityRole="button"`) para assegurar total suporte a leitores de tela (TalkBack / VoiceOver).
