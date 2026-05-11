import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

beforeEach(() => sessionStorage.clear());

test('shows login page when sessionStorage is empty', () => {
  render(<App />);
  expect(screen.getByTestId('role-card-gestor')).toBeInTheDocument();
});

test('shows role badge after logging in', () => {
  render(<App />);
  fireEvent.click(screen.getByTestId('role-card-gestor'));
  fireEvent.click(screen.getByTestId('enter-btn'));
  expect(screen.getByTestId('role-badge')).toBeInTheDocument();
});

test('rehydrates from sessionStorage without showing login', () => {
  sessionStorage.setItem('aero_role', 'gestor');
  render(<App />);
  expect(screen.queryByTestId('role-card-gestor')).not.toBeInTheDocument();
  expect(screen.getByTestId('role-badge')).toBeInTheDocument();
});
