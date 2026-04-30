import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PaymentForm from '../components/PaymentForm';

// Mock usePayment so we control status/error without real contract calls
jest.mock('../hooks/usePayment', () => ({
  usePayment: () => ({
    status: 'idle',
    error: null,
    paymentId: null,
    submit: jest.fn(),
    retry: jest.fn(),
  }),
}));

const VALID_ADDRESS = 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN';
const mockSignFn = jest.fn();

describe('PaymentForm', () => {
  it('shows required field errors when form is submitted empty', async () => {
    render(
      <PaymentForm publicKey={VALID_ADDRESS} signFn={mockSignFn} />
    );

    fireEvent.click(screen.getByText('Send Payment'));

    await waitFor(() => {
      expect(screen.getByText('Recipient address is required.')).toBeInTheDocument();
      expect(screen.getByText('Amount is required.')).toBeInTheDocument();
    });
  });

  it('shows validation error for invalid Stellar address', async () => {
    render(
      <PaymentForm publicKey={VALID_ADDRESS} signFn={mockSignFn} />
    );

    fireEvent.change(screen.getByLabelText('Recipient address'), {
      target: { value: 'not-a-valid-address' },
    });
    fireEvent.change(screen.getByLabelText('Amount'), {
      target: { value: '10' },
    });
    fireEvent.click(screen.getByText('Send Payment'));

    await waitFor(() => {
      expect(screen.getByText('Invalid Stellar address format.')).toBeInTheDocument();
    });
  });

  it('shows validation error for non-positive amount', async () => {
    render(
      <PaymentForm publicKey={VALID_ADDRESS} signFn={mockSignFn} />
    );

    fireEvent.change(screen.getByLabelText('Recipient address'), {
      target: { value: VALID_ADDRESS },
    });
    fireEvent.change(screen.getByLabelText('Amount'), {
      target: { value: '-5' },
    });
    fireEvent.click(screen.getByText('Send Payment'));

    await waitFor(() => {
      expect(screen.getByText('Amount must be a positive number.')).toBeInTheDocument();
    });
  });

  it('pre-populates fields from defaultTo and defaultAmount props', () => {
    render(
      <PaymentForm
        publicKey={VALID_ADDRESS}
        signFn={mockSignFn}
        defaultTo={VALID_ADDRESS}
        defaultAmount="42"
      />
    );

    expect(screen.getByLabelText('Recipient address')).toHaveValue(VALID_ADDRESS);
    expect(screen.getByLabelText('Amount')).toHaveValue(42);
  });
});
