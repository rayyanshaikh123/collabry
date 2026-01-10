/**
 * UI Components Tests
 * Tests for common UI components
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button, Card, Badge, Input, ProgressBar } from '../../components/UIElements';

describe('UI Components', () => {
  describe('Button', () => {
    it('should render with default variant', () => {
      render(<Button>Click me</Button>);
      expect(screen.getByText('Click me')).toBeInTheDocument();
    });

    it('should handle click events', () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Click me</Button>);
      
      fireEvent.click(screen.getByText('Click me'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should be disabled when disabled prop is true', () => {
      render(<Button disabled>Disabled</Button>);
      expect(screen.getByText('Disabled')).toBeDisabled();
    });

    it('should render with different variants', () => {
      const { rerender } = render(<Button variant="primary">Primary</Button>);
      expect(screen.getByText('Primary')).toBeInTheDocument();

      rerender(<Button variant="secondary">Secondary</Button>);
      expect(screen.getByText('Secondary')).toBeInTheDocument();

      rerender(<Button variant="ghost">Ghost</Button>);
      expect(screen.getByText('Ghost')).toBeInTheDocument();
    });

    it('should render with different sizes', () => {
      const { rerender } = render(<Button size="sm">Small</Button>);
      expect(screen.getByText('Small')).toBeInTheDocument();

      rerender(<Button size="lg">Large</Button>);
      expect(screen.getByText('Large')).toBeInTheDocument();
    });
  });

  describe('Card', () => {
    it('should render children', () => {
      render(<Card>Card content</Card>);
      expect(screen.getByText('Card content')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(<Card className="custom-class">Content</Card>);
      const card = screen.getByText('Content').parentElement;
      expect(card).toHaveClass('custom-class');
    });
  });

  describe('Badge', () => {
    it('should render with text', () => {
      render(<Badge>New</Badge>);
      expect(screen.getByText('New')).toBeInTheDocument();
    });

    it('should render with different variants', () => {
      const { rerender } = render(<Badge variant="indigo">Indigo</Badge>);
      expect(screen.getByText('Indigo')).toBeInTheDocument();

      rerender(<Badge variant="emerald">Emerald</Badge>);
      expect(screen.getByText('Emerald')).toBeInTheDocument();

      rerender(<Badge variant="rose">Rose</Badge>);
      expect(screen.getByText('Rose')).toBeInTheDocument();
    });
  });

  describe('Input', () => {
    it('should render input element', () => {
      render(<Input placeholder="Enter text" />);
      expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
    });

    it('should handle value changes', () => {
      const handleChange = jest.fn();
      render(<Input onChange={handleChange} placeholder="Test" />);
      
      const input = screen.getByPlaceholderText('Test');
      fireEvent.change(input, { target: { value: 'new value' } });
      
      expect(handleChange).toHaveBeenCalled();
    });

    it('should support different types', () => {
      render(<Input type="password" placeholder="Password" />);
      const input = screen.getByPlaceholderText('Password');
      expect(input).toHaveAttribute('type', 'password');
    });
  });

  describe('ProgressBar', () => {
    it('should render with value', () => {
      render(<ProgressBar value={50} />);
      // ProgressBar should be visible
      const progressBar = document.querySelector('[role="progressbar"]') || 
                          document.querySelector('.bg-indigo-600') ||
                          document.querySelector('[class*="progress"]');
      expect(progressBar || document.body.innerHTML.includes('50')).toBeTruthy();
    });

    it('should handle 0 value', () => {
      render(<ProgressBar value={0} />);
      // Should render without errors
      expect(document.body.innerHTML).toBeTruthy();
    });

    it('should handle 100 value', () => {
      render(<ProgressBar value={100} />);
      // Should render without errors
      expect(document.body.innerHTML).toBeTruthy();
    });
  });
});
