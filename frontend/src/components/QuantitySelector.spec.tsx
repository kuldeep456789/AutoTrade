import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import QuantitySelector from './QuantitySelector';

describe('QuantitySelector', () => {
  it('renders correctly with initial value', () => {
    const onChange = vi.fn();
    const onIncrement = vi.fn();
    const onDecrement = vi.fn();

    render(
      <QuantitySelector
        value={1}
        onIncrement={onIncrement}
        onDecrement={onDecrement}
        onChange={onChange}
      />
    );

    // Initial value is rendered as a span, so we look for the text content
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('calls onIncrement when plus button is clicked', () => {
    const onChange = vi.fn();
    const onIncrement = vi.fn();
    const onDecrement = vi.fn();

    const { container } = render(
      <QuantitySelector
        value={1}
        onIncrement={onIncrement}
        onDecrement={onDecrement}
        onChange={onChange}
      />
    );

    const incrementButton = container.querySelectorAll('button')[2];
    fireEvent.click(incrementButton);

    expect(onIncrement).toHaveBeenCalledTimes(1);
  });

  it('calls onDecrement when minus button is clicked', () => {
    const onChange = vi.fn();
    const onIncrement = vi.fn();
    const onDecrement = vi.fn();

    const { container } = render(
      <QuantitySelector
        value={2}
        onIncrement={onIncrement}
        onDecrement={onDecrement}
        onChange={onChange}
      />
    );

    const decrementButton = container.querySelectorAll('button')[0];
    fireEvent.click(decrementButton);

    expect(onDecrement).toHaveBeenCalledTimes(1);
  });
});
