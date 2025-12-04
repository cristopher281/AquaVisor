import React from 'react';
import { render, screen } from '@testing-library/react';
import MetricCard from '../MetricCard';

describe('MetricCard trend color semantics', () => {
  test('increase shows danger (red) when invertTrend is true', () => {
    render(<MetricCard title="Valor Actual" value="10 L" change="+15%" trend="up" invertTrend={true} />);
    const changeEl = screen.getByText('+15%');
    expect(changeEl).toBeInTheDocument();
    expect(changeEl.parentElement).toHaveClass('danger');
  });

  test('decrease shows success (green) when invertTrend is true', () => {
    render(<MetricCard title="Valor Actual" value="10 L" change="-5%" trend="down" invertTrend={true} />);
    const changeEl = screen.getByText('-5%');
    expect(changeEl).toBeInTheDocument();
    expect(changeEl.parentElement).toHaveClass('success');
  });

  test('neutral or 0% shows neutral class', () => {
    render(<MetricCard title="Valor Actual" value="10 L" change="0%" trend="neutral" invertTrend={true} />);
    const changeEl = screen.getByText('0%');
    expect(changeEl).toBeInTheDocument();
    expect(changeEl.parentElement).toHaveClass('neutral');
  });
});
