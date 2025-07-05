import * as React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders IntelliNews header', () => {
  render(<App />);
  const headerElement = screen.getByText(/IntelliNews/i);
  expect(headerElement).toBeInTheDocument();
});
