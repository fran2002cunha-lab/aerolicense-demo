import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import UploadDocument, { WRITE_AUTH_NOTE } from './UploadDocument';

afterEach(() => { delete global.fetch; });

test.each([401, 503])('explains the API key requirement when upload returns %i', async (status) => {
  global.fetch = jest.fn().mockResolvedValue({ ok: false, status, json: async () => ({ detail: 'x' }) });
  const { container } = render(<UploadDocument pilotAddress="0x0" />);
  fireEvent.change(screen.getByPlaceholderText(/ATPL/), { target: { value: 'ATPL teste' } });
  fireEvent.change(container.querySelector('input[type="date"]'), { target: { value: '2030-01-01' } });
  const file = new File(['%PDF-1.4'], 'doc.pdf', { type: 'application/pdf' });
  fireEvent.change(container.querySelector('#fileInput'), { target: { files: [file] } });
  fireEvent.click(screen.getByRole('button', { name: /Registar na Blockchain/ }));
  await waitFor(() => expect(screen.getByText(WRITE_AUTH_NOTE)).toBeInTheDocument());
  expect(global.fetch.mock.calls[0][1].headers).toBeUndefined();
});

test('the dropzone is keyboard operable and opens the file picker via a ref', () => {
  const { container } = render(<UploadDocument pilotAddress="0x0" />);
  const input = container.querySelector('#fileInput');
  const click = jest.spyOn(input, 'click');
  const zone = screen.getByRole('button', { name: /Selecionar ficheiro/ });
  fireEvent.keyDown(zone, { key: 'Enter' });
  fireEvent.click(zone);
  expect(click).toHaveBeenCalledTimes(2);
});
