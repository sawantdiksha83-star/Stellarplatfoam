import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import TxHistory, { TxRecord } from '../components/TxHistory';

// truncateAddress uses stellar-sdk internally via lib/stellar — mock the module
jest.mock('../lib/stellar', () => ({
  truncateAddress: (addr: string) =>
    addr.length <= 8 ? addr : `${addr.slice(0, 4)}...${addr.slice(-4)}`,
}));

const MOCK_RECORDS: TxRecord[] = [
  {
    paymentId: 'pay-001',
    sender: 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN',
    recipient: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
    amount: '100.00',
    asset: 'XLM',
    status: 'confirmed',
  },
  {
    paymentId: 'pay-002',
    sender: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
    recipient: 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN',
    amount: '50.00',
    asset: 'USDC',
    status: 'sent',
  },
  {
    paymentId: 'pay-003',
    sender: 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN',
    recipient: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
    amount: '25.00',
    asset: 'XLM',
    status: 'failed',
  },
];

describe('TxHistory', () => {
  it('renders all rows from mock transaction data', () => {
    render(<TxHistory records={MOCK_RECORDS} />);

    expect(screen.getByText('pay-001')).toBeInTheDocument();
    expect(screen.getByText('pay-002')).toBeInTheDocument();
    expect(screen.getByText('pay-003')).toBeInTheDocument();
  });

  it('renders correct amount and asset for each row', () => {
    render(<TxHistory records={MOCK_RECORDS} />);

    expect(screen.getByText('100.00')).toBeInTheDocument();
    expect(screen.getByText('50.00')).toBeInTheDocument();
    expect(screen.getByText('25.00')).toBeInTheDocument();
    expect(screen.getAllByText('XLM')).toHaveLength(2);
    expect(screen.getByText('USDC')).toBeInTheDocument();
  });

  it('renders status badges for each row', () => {
    render(<TxHistory records={MOCK_RECORDS} />);

    expect(screen.getByText('confirmed')).toBeInTheDocument();
    expect(screen.getByText('sent')).toBeInTheDocument();
    expect(screen.getByText('failed')).toBeInTheDocument();
  });

  it('filters rows when a search term is entered', () => {
    render(<TxHistory records={MOCK_RECORDS} />);

    fireEvent.change(screen.getByRole('searchbox'), {
      target: { value: 'USDC' },
    });

    expect(screen.getByText('pay-002')).toBeInTheDocument();
    expect(screen.queryByText('pay-001')).not.toBeInTheDocument();
    expect(screen.queryByText('pay-003')).not.toBeInTheDocument();
  });

  it('shows empty state when no records match the filter', () => {
    render(<TxHistory records={MOCK_RECORDS} />);

    fireEvent.change(screen.getByRole('searchbox'), {
      target: { value: 'nonexistent-id-xyz' },
    });

    expect(screen.getByText('No transactions found.')).toBeInTheDocument();
  });

  it('renders empty state when records array is empty', () => {
    render(<TxHistory records={[]} />);

    expect(screen.getByText('No transactions found.')).toBeInTheDocument();
  });
});
