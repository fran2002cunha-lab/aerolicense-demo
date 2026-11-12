import { render, screen, fireEvent } from '@testing-library/react';
import DocumentCard, { FICTIONAL_MARK } from './DocumentCard';

const DOC = {
  hash: '0xabcdef0123456789abcdef0123456789',
  doc_type: 'ATPL',
  description: 'Licença ATPL — ANAC Portugal',
  expires_at: '2030-01-01',
  days_until_expiry: 300,
  status: 'valid',
};

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, blob: async () => new Blob(['png']) });
  global.URL.createObjectURL = jest.fn(() => 'blob:qr');
  global.URL.revokeObjectURL = jest.fn();
});
afterEach(() => { delete global.fetch; });

test('marks the document as fictional', () => {
  render(<DocumentCard document={DOC} />);
  expect(screen.getByText(FICTIONAL_MARK)).toBeInTheDocument();
});

test('QR modal is an accessible dialog that takes focus and closes on Escape', async () => {
  render(<DocumentCard document={DOC} />);
  const opener = screen.getByRole('button', { name: /QR Code/ });
  opener.focus();
  fireEvent.click(opener);
  const dialog = await screen.findByRole('dialog');
  expect(dialog).toHaveAttribute('aria-modal', 'true');
  expect(dialog).toHaveFocus();
  expect(screen.getByRole('img')).toHaveAttribute('alt', expect.stringMatching(/Código QR para verificar o documento Licença ATPL/));
  fireEvent.keyDown(window, { key: 'Escape' });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(opener).toHaveFocus();
});

test('Tab and Shift+Tab stay inside the QR dialog', async () => {
  render(<DocumentCard document={DOC} />);
  fireEvent.click(screen.getByRole('button', { name: /QR Code/ }));
  const dialog = await screen.findByRole('dialog');
  const close = screen.getByRole('button', { name: 'Fechar' });
  expect(dialog).toHaveFocus();
  // Tab from the dialog itself moves to its only control; Tab again wraps to it.
  fireEvent.keyDown(window, { key: 'Tab' });
  expect(close).toHaveFocus();
  fireEvent.keyDown(window, { key: 'Tab' });
  expect(close).toHaveFocus();
  fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
  expect(close).toHaveFocus();
  // Focus that escaped the dialog is pulled back in.
  screen.getByRole('button', { name: /QR Code/ }).focus();
  fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
  expect(close).toHaveFocus();
  expect(dialog).toContainElement(close);
});
