import { render, screen, fireEvent } from '@testing-library/react'
import { expect, it } from 'vitest'
import App from './App'

it('prevents adding duplicate feed and shows error', () => {
  render(<App />)
  const url = 'https://example.com/rss'
  fireEvent.change(screen.getByPlaceholderText('Feed URL'), { target: { value: url } })
  fireEvent.click(screen.getAllByText('Add')[0])

  // try adding same feed again
  fireEvent.change(screen.getByPlaceholderText('Feed URL'), { target: { value: url } })
  fireEvent.click(screen.getAllByText('Add')[0])

  expect(screen.getByText(/feed already exists/i)).toBeTruthy()
})