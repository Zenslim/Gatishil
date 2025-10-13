import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';

const mockReplace = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockResetPasswordForEmail = vi.fn();
const mockGetSession = vi.fn();
const mockSignOut = vi.fn();

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...rest }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...rest}>{children}</div>
    ),
  },
  useScroll: () => ({ scrollYProgress: { on: vi.fn(), destroy: vi.fn() } }),
  useTransform: () => 1,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      signInWithPassword: mockSignInWithPassword,
      resetPasswordForEmail: mockResetPasswordForEmail,
      getSession: mockGetSession,
      signOut: mockSignOut,
    },
  },
}));

import HomePage from '@/app/page';
import LoginPage from '@/app/login/page';
import DashboardPage from '@/app/dashboard/page';

describe('route components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({
      data: { session: { user: { email: 'demo@gatishil.org' } } },
    });
    mockSignOut.mockResolvedValue({});
  });

  it('renders the homepage hero content', () => {
    render(<HomePage />);

    expect(screen.getByText(/gatishil nepal/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /faq/i })).toHaveAttribute('href', '/faq#dao');
  });

  it('shows the login form heading and fields', () => {
    render(<LoginPage />);

    expect(screen.getByRole('heading', { name: /member login/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email or phone/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('greets an authenticated user on the dashboard', async () => {
    render(<DashboardPage />);

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /welcome, demo@gatishil.org/i })).toBeInTheDocument(),
    );
  });

  it('redirects guests from the dashboard to the join page', async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: null } });

    render(<DashboardPage />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/join'));
  });
});
