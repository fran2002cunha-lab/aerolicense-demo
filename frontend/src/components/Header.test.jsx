import { render, screen } from '@testing-library/react';
import Header from './Header';

test('renders role badge for operador', () => {
  render(<Header activeRole="operador" />);
  expect(screen.getByTestId('role-badge')).toBeInTheDocument();
  expect(screen.getByTestId('role-badge')).toHaveTextContent('Operador');
});

test('renders role badge for inspector', () => {
  render(<Header activeRole="inspector" />);
  expect(screen.getByTestId('role-badge')).toBeInTheDocument();
  expect(screen.getByTestId('role-badge')).toHaveTextContent('Inspector ANAC');
});

test('does not render role badge when activeRole is null', () => {
  render(<Header activeRole={null} />);
  expect(screen.queryByTestId('role-badge')).not.toBeInTheDocument();
});
