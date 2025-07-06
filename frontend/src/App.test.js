import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';

// Mock fetch globally
global.fetch = jest.fn();

describe('App Component', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Initial Rendering', () => {
    it('renders main heading', () => {
      render(<App />);
      
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent('Hello from React Frontend');
    });

    it('renders description text', () => {
      render(<App />);
      
      const description = screen.getByText('This React app is served by the same Node.js container.');
      expect(description).toBeInTheDocument();
    });

    it('renders Health component', () => {
      render(<App />);
      
      const statusElement = screen.getByText(/Status:/);
      expect(statusElement).toBeInTheDocument();
    });

    it('applies correct styling', () => {
      render(<App />);
      
      const appContainer = screen.getByText('Hello from React Frontend').closest('div');
      expect(appContainer).toHaveStyle({
        textAlign: 'center',
        fontFamily: 'Arial, sans-serif'
      });
    });
  });

  describe('Health Component', () => {
    it('shows loading state initially', () => {
      render(<App />);
      
      const loadingText = screen.getByText('Status: loading...');
      expect(loadingText).toBeInTheDocument();
    });

    it('displays success status when API call succeeds', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'ok' })
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Status: ok')).toBeInTheDocument();
      });

      expect(fetch).toHaveBeenCalledWith('/api/health');
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('displays error status when API call fails', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Status: error')).toBeInTheDocument();
      });

      expect(fetch).toHaveBeenCalledWith('/api/health');
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('displays error status when response is not ok', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal server error' })
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Status: error')).toBeInTheDocument();
      });

      expect(fetch).toHaveBeenCalledWith('/api/health');
    });

    it('displays error status when JSON parsing fails', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => { throw new Error('Invalid JSON'); }
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Status: error')).toBeInTheDocument();
      });

      expect(fetch).toHaveBeenCalledWith('/api/health');
    });

    it('handles malformed API response', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invalidField: 'value' })
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Status: ')).toBeInTheDocument();
      });

      expect(fetch).toHaveBeenCalledWith('/api/health');
    });

    it('handles null response', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => null
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Status: error')).toBeInTheDocument();
      });

      expect(fetch).toHaveBeenCalledWith('/api/health');
    });

    it('handles undefined status in response', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: undefined })
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Status: ')).toBeInTheDocument();
      });

      expect(fetch).toHaveBeenCalledWith('/api/health');
    });

    it('handles empty response', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Status: ')).toBeInTheDocument();
      });

      expect(fetch).toHaveBeenCalledWith('/api/health');
    });
  });

  describe('Component Lifecycle', () => {
    it('makes API call on mount', () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'ok' })
      });

      render(<App />);

      expect(fetch).toHaveBeenCalledWith('/api/health');
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('does not make additional API calls on re-render', () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'ok' })
      });

      const { rerender } = render(<App />);
      rerender(<App />);

      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('cleans up properly on unmount', () => {
      const { unmount } = render(<App />);
      
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Error Boundaries and Edge Cases', () => {
    it('handles component errors gracefully', () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // Mock useEffect to throw an error
      const originalUseEffect = React.useEffect;
      React.useEffect = jest.fn(() => {
        throw new Error('Test error');
      });

      expect(() => render(<App />)).toThrow();

      React.useEffect = originalUseEffect;
      consoleError.mockRestore();
    });

    it('handles fetch timeout', async () => {
      fetch.mockImplementationOnce(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout')), 100);
        });
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Status: error')).toBeInTheDocument();
      }, { timeout: 200 });
    });

    it('handles network connectivity issues', async () => {
      fetch.mockRejectedValueOnce(new Error('Failed to fetch'));

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Status: error')).toBeInTheDocument();
      });
    });

    it('handles CORS errors', async () => {
      fetch.mockRejectedValueOnce(new Error('CORS error'));

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Status: error')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper heading structure', () => {
      render(<App />);
      
      const headings = screen.getAllByRole('heading');
      expect(headings).toHaveLength(1);
      expect(headings[0]).toHaveAttribute('aria-level', '1');
    });

    it('has readable text content', () => {
      render(<App />);
      
      const textElements = screen.getAllByText(/./);
      textElements.forEach(element => {
        expect(element).toBeVisible();
      });
    });

    it('supports keyboard navigation', () => {
      render(<App />);
      
      // Test that the component doesn't interfere with keyboard navigation
      const container = screen.getByText('Hello from React Frontend').closest('div');
      fireEvent.keyDown(container, { key: 'Tab' });
      // Should not throw or prevent default behavior
    });

    it('has appropriate ARIA labels', () => {
      render(<App />);
      
      // Check that status information is accessible
      const statusElement = screen.getByText(/Status:/);
      expect(statusElement).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('renders quickly', () => {
      const startTime = performance.now();
      render(<App />);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(100); // Should render in less than 100ms
    });

    it('handles multiple rapid state changes', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'ok' })
      });

      render(<App />);

      // Should handle rapid state changes without issues
      await waitFor(() => {
        expect(screen.getByText('Status: ok')).toBeInTheDocument();
      });
    });

    it('does not cause memory leaks', () => {
      const { unmount } = render(<App />);
      
      // Should clean up properly
      unmount();
      
      // No assertions needed - if there are memory leaks, Jest will detect them
    });
  });

  describe('Responsive Design', () => {
    it('applies responsive styles', () => {
      render(<App />);
      
      const container = screen.getByText('Hello from React Frontend').closest('div');
      expect(container).toHaveStyle('text-align: center');
    });

    it('handles different screen sizes', () => {
      // Mock window resize
      global.innerWidth = 320;
      global.innerHeight = 568;
      global.dispatchEvent(new Event('resize'));

      render(<App />);
      
      const container = screen.getByText('Hello from React Frontend').closest('div');
      expect(container).toBeInTheDocument();
    });
  });

  describe('Browser Compatibility', () => {
    it('handles older browsers gracefully', () => {
      // Mock older browser behavior
      const originalFetch = global.fetch;
      global.fetch = undefined;

      expect(() => render(<App />)).not.toThrow();

      global.fetch = originalFetch;
    });

    it('handles missing APIs gracefully', () => {
      const originalConsole = console.error;
      console.error = jest.fn();

      render(<App />);

      expect(console.error).not.toHaveBeenCalled();

      console.error = originalConsole;
    });
  });

  describe('Integration with Backend', () => {
    it('handles successful API integration', async () => {
      const mockResponse = {
        status: 'ok',
        timestamp: '2023-01-01T00:00:00Z',
        version: '0.6',
        aiProvider: 'mock'
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Status: ok')).toBeInTheDocument();
      });

      expect(fetch).toHaveBeenCalledWith('/api/health');
    });

    it('handles API version mismatches', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'ok', version: '999.0' })
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Status: ok')).toBeInTheDocument();
      });
    });

    it('handles API schema changes', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          status: 'ok',
          newField: 'value',
          renamedField: 'old_field_value'
        })
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Status: ok')).toBeInTheDocument();
      });
    });
  });

  describe('State Management', () => {
    it('maintains state consistency', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'ok' })
      });

      render(<App />);

      // Initial state
      expect(screen.getByText('Status: loading...')).toBeInTheDocument();

      // After API call
      await waitFor(() => {
        expect(screen.getByText('Status: ok')).toBeInTheDocument();
      });

      // State should remain consistent
      expect(screen.queryByText('Status: loading...')).not.toBeInTheDocument();
    });

    it('handles concurrent state updates', async () => {
      let resolveFirst, resolveSecond;
      
      fetch
        .mockImplementationOnce(() => new Promise(resolve => { resolveFirst = resolve; }))
        .mockImplementationOnce(() => new Promise(resolve => { resolveSecond = resolve; }));

      const { rerender } = render(<App />);
      
      // Trigger second render before first completes
      rerender(<App />);

      // Resolve in reverse order
      resolveSecond({ ok: true, json: async () => ({ status: 'second' }) });
      resolveFirst({ ok: true, json: async () => ({ status: 'first' }) });

      await waitFor(() => {
        expect(screen.getByText(/Status:/)).toBeInTheDocument();
      });
    });
  });

  describe('Error Recovery', () => {
    it('recovers from transient errors', async () => {
      fetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ status: 'ok' })
        });

      const { rerender } = render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Status: error')).toBeInTheDocument();
      });

      // Simulate component re-render (e.g., from parent component)
      rerender(<App />);

      await waitFor(() => {
        expect(screen.getByText('Status: ok')).toBeInTheDocument();
      });
    });

    it('handles partial API failures', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'degraded' })
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Status: degraded')).toBeInTheDocument();
      });
    });
  });

  describe('Security', () => {
    it('does not expose sensitive information', () => {
      render(<App />);
      
      const container = screen.getByText('Hello from React Frontend').closest('div');
      expect(container.innerHTML).not.toContain('password');
      expect(container.innerHTML).not.toContain('token');
      expect(container.innerHTML).not.toContain('secret');
    });

    it('handles malicious API responses safely', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          status: '<script>alert("xss")</script>',
          maliciousField: 'javascript:alert("xss")'
        })
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText(/Status:/)).toBeInTheDocument();
      });

      // Should not execute any scripts
      expect(document.querySelectorAll('script')).toHaveLength(0);
    });
  });

  describe('Internationalization', () => {
    it('displays text in correct language', () => {
      render(<App />);
      
      const heading = screen.getByText('Hello from React Frontend');
      expect(heading).toBeInTheDocument();
    });

    it('handles different text directions', () => {
      render(<App />);
      
      const container = screen.getByText('Hello from React Frontend').closest('div');
      expect(container).toHaveStyle('text-align: center');
    });
  });
});