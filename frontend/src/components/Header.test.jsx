import { render, screen } from '@testing-library/react';
import Header from './Header';

test('renders role badge for gestor', () => {
  render(<Header activeRole="gestor" />);
  expect(screen.getByTestId('role-badge')).toBeInTheDocument();
  expect(screen.getByTestId('role-badge')).toHaveTextContent('Gestor');
});

test('renders role badge for regulador', () => {
  render(<Header activeRole="regulador" />);
  expect(screen.getByTestId('role-badge')).toBeInTheDocument();
  expect(screen.getByTestId('role-badge')).toHaveTextContent('Regulador ANAC');
});

test('does not render role badge when activeRole is null', () => {
  render(<Header activeRole={null} />);
  expect(screen.queryByTestId('role-badge')).not.toBeInTheDocument();
});
