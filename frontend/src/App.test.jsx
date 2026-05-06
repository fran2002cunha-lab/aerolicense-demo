import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

beforeEach(() => sessionStorage.clear());

test('shows login page when sessionStorage is empty', () => {
  render(<App />);
  expect(screen.getByTestId('role-card-operador')).toBeInTheDocument();
});

test('shows role badge after logging in', () => {
  render(<App />);
  fireEvent.click(screen.getByTestId('role-card-operador'));
  fireEvent.click(screen.getByTestId('enter-btn'));
  expect(screen.getByTestId('role-badge')).toBeInTheDocument();
});

test('rehydrates from sessionStorage without showing login', () => {
  sessionStorage.setItem('aero_role', 'inspector');
  render(<App />);
  expect(screen.queryByTestId('role-card-operador')).not.toBeInTheDocument();
  expect(screen.getByTestId('role-badge')).toBeInTheDocument();
});
