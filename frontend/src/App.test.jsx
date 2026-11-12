import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

beforeEach(() => { sessionStorage.clear(); window.location.hash = ''; });

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

test('sidebar shows the role chosen at login', () => {
  sessionStorage.setItem('aero_role', 'piloto');
  render(<App />);
  expect(screen.getByTestId('sidebar-role')).toHaveTextContent('Piloto');
  expect(screen.getByTestId('sidebar-role')).not.toHaveTextContent('Admin');
});

test('forgery demo link logs in and opens the blockchain route', () => {
  render(<App />);
  fireEvent.click(screen.getByTestId('forgery-demo-link'));
  expect(sessionStorage.getItem('aero_role')).toBe('regulador');
  expect(window.location.hash).toBe('#/blockchain');
  expect(screen.getByTestId('role-badge')).toBeInTheDocument();
});
