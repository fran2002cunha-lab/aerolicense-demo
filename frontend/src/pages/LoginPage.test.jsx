import { render, screen, fireEvent } from '@testing-library/react';
import LoginPage from './LoginPage';

test('renders two role cards', () => {
  render(<LoginPage onLogin={() => {}} />);
  expect(screen.getByTestId('role-card-operador')).toBeInTheDocument();
  expect(screen.getByTestId('role-card-inspector')).toBeInTheDocument();
});

test('enter button is disabled when no role is selected', () => {
  render(<LoginPage onLogin={() => {}} />);
  expect(screen.getByTestId('enter-btn')).toBeDisabled();
});

test('selecting a role enables the enter button', () => {
  render(<LoginPage onLogin={() => {}} />);
  fireEvent.click(screen.getByTestId('role-card-operador'));
  expect(screen.getByTestId('enter-btn')).not.toBeDisabled();
});

test('clicking enter calls onLogin with the selected role id', () => {
  const onLogin = jest.fn();
  render(<LoginPage onLogin={onLogin} />);
  fireEvent.click(screen.getByTestId('role-card-inspector'));
  fireEvent.click(screen.getByTestId('enter-btn'));
  expect(onLogin).toHaveBeenCalledWith('inspector');
});

test('clicking a selected role again deselects it', () => {
  render(<LoginPage onLogin={() => {}} />);
  fireEvent.click(screen.getByTestId('role-card-operador'));
  fireEvent.click(screen.getByTestId('role-card-operador'));
  expect(screen.getByTestId('enter-btn')).toBeDisabled();
});
