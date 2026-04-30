import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import WalletConnect from '../components/WalletConnect';

describe('WalletConnect', () => {
  it('renders Freighter and Albedo connect buttons', () => {
    render(
      <WalletConnect onConnect={jest.fn()} isConnecting={false} error={null} />
    );

    expect(screen.getByText('Connect Freighter')).toBeInTheDocument();
    expect(screen.getByText('Connect Albedo')).toBeInTheDocument();
  });

  it('calls onConnect with "freighter" when Freighter button is clicked', async () => {
    const onConnect = jest.fn().mockResolvedValue(undefined);
    render(
      <WalletConnect onConnect={onConnect} isConnecting={false} error={null} />
    );

    fireEvent.click(screen.getByText('Connect Freighter'));

    await waitFor(() => {
      expect(onConnect).toHaveBeenCalledWith('freighter');
    });
  });

  it('calls onConnect with "albedo" when Albedo button is clicked', async () => {
    const onConnect = jest.fn().mockResolvedValue(undefined);
    render(
      <WalletConnect onConnect={onConnect} isConnecting={false} error={null} />
    );

    fireEvent.click(screen.getByText('Connect Albedo'));

    await waitFor(() => {
      expect(onConnect).toHaveBeenCalledWith('albedo');
    });
  });

  it('disables buttons while connecting', () => {
    render(
      <WalletConnect onConnect={jest.fn()} isConnecting={true} error={null} />
    );

    const buttons = screen.getAllByRole('button');
    buttons.forEach((btn) => expect(btn).toBeDisabled());
  });

  it('displays error message when error prop is set', () => {
    render(
      <WalletConnect
        onConnect={jest.fn()}
        isConnecting={false}
        error="Freighter wallet extension is not installed."
      />
    );

    expect(
      screen.getByRole('alert')
    ).toHaveTextContent('Freighter wallet extension is not installed.');
  });
});
