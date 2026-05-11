import { render, screen, fireEvent } from '@testing-library/react';
import LoginPage from './LoginPage';

test('renders three role cards', () => {
  render(<LoginPage onLogin={() => {}} />);
  expect(screen.getByTestId('role-card-gestor')).toBeInTheDocument();
  expect(screen.getByTestId('role-card-piloto')).toBeInTheDocument();
  expect(screen.getByTestId('role-card-regulador')).toBeInTheDocument();
});

test('enter button is disabled when no role is selected', () => {
  render(<LoginPage onLogin={() => {}} />);
  expect(screen.getByTestId('enter-btn')).toBeDisabled();
});

test('selecting a role enables the enter button', () => {
  render(<LoginPage onLogin={() => {}} />);
  fireEvent.click(screen.getByTestId('role-card-gestor'));
  expect(screen.getByTestId('enter-btn')).not.toBeDisabled();
});

test('clicking enter calls onLogin with selected role id', () => {
  const onLogin = jest.fn();
  render(<LoginPage onLogin={onLogin} />);
  fireEvent.click(screen.getByTestId('role-card-piloto'));
  fireEvent.click(screen.getByTestId('enter-btn'));
  expect(onLogin).toHaveBeenCalledWith('piloto');
});

test('clicking a selected role again deselects it', () => {
  render(<LoginPage onLogin={() => {}} />);
  fireEvent.click(screen.getByTestId('role-card-gestor'));
  fireEvent.click(screen.getByTestId('role-card-gestor'));
  expect(screen.getByTestId('enter-btn')).toBeDisabled();
});

test('guest link calls onLogin with visitante', () => {
  const onLogin = jest.fn();
  render(<LoginPage onLogin={onLogin} />);
  fireEvent.click(screen.getByTestId('guest-link'));
  expect(onLogin).toHaveBeenCalledWith('visitante');
});
