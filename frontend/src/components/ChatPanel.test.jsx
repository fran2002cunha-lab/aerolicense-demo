import { render, screen, fireEvent } from '@testing-library/react';
import { formatToolCall, parseRecordings } from './ChatPanel';

test('formatToolCall renders name(args)', () => {
  expect(formatToolCall({ name: 'get_expiring_documents', arguments: { days: 30 } }))
    .toBe('get_expiring_documents(days=30)');
  expect(formatToolCall({ name: 'get_pilot_detail', arguments: { pilot_id: 'P003' } }))
    .toBe('get_pilot_detail(pilot_id="P003")');
});

test('parseRecordings drops placeholders and rejects bad input', () => {
  expect(parseRecordings(null)).toBeNull();
  expect(parseRecordings({ recordings: [{ question: 'q', answer: '<to be recorded>' }] })).toBeNull();
  const r = parseRecordings({ model: 'm', recorded_at: '2026-11-12', recordings: [{ question: 'q', answer: 'a' }] });
  expect(r.recordings).toHaveLength(1);
  expect(r.recordings[0].toolCalls).toEqual([]);
});

test('demo chat renders recorded answer as plain text', async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      model: 'test-model', recorded_at: '2026-11-12T10:00:00Z',
      recordings: [{ question: 'Pergunta?', tool_calls: [{ name: 'get_risk_scores', arguments: {} }], answer: '<b>x</b>\n• y' }],
    }),
  });
  const { DemoChatPanel } = require('./ChatPanel');
  render(<DemoChatPanel initiallyOpen />);
  fireEvent.click(await screen.findByRole('button', { name: 'Pergunta?' }));
  expect(screen.getByText('tool call: get_risk_scores()')).toBeInTheDocument();
  expect(screen.getByText(/<b>x<\/b>/)).toBeInTheDocument();
  expect(screen.getByText(/Resposta gravada do modelo real \(test-model,/)).toBeInTheDocument();
});

test('demo chat without recordings explains the tool loop and shows the questions disabled', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404 });
  const { DemoChatPanel, DEMO_QUESTIONS, README_AI_URL } = require('./ChatPanel');
  render(<DemoChatPanel initiallyOpen />);
  const note = await screen.findByTestId('chat-no-backend');
  expect(note).toHaveTextContent(/não tem backend/);
  expect(note).toHaveTextContent(/ferramentas/);
  expect(note.style.color).not.toBe('rgb(248, 113, 113)');
  expect(screen.getByRole('link', { name: /README/ })).toHaveAttribute('href', README_AI_URL);
  expect(DEMO_QUESTIONS).toHaveLength(6);
  DEMO_QUESTIONS.forEach(q => expect(screen.getByRole('button', { name: q })).toBeDisabled());
});
