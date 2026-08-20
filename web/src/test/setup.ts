import '@testing-library/jest-dom/vitest';

/**
 * O jsdom ainda não implementa showModal/close do <dialog> (jsdom#3294), embora
 * todos os navegadores alvo implementem. O shim abaixo reproduz só o suficiente
 * do contrato para que os testes exercitem o componente real: alternar `open` e
 * disparar o evento `close`.
 */
if (
  typeof HTMLDialogElement !== 'undefined' &&
  typeof HTMLDialogElement.prototype.showModal !== 'function'
) {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.open = true;
  };

  HTMLDialogElement.prototype.close = function close(
    this: HTMLDialogElement,
    returnValue?: string,
  ) {
    this.open = false;
    if (returnValue !== undefined) this.returnValue = returnValue;
    this.dispatchEvent(new Event('close'));
  };
}
