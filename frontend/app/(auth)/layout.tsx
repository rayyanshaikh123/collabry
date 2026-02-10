/**
 * Auth Layout
 * Centered layout for authentication pages (login, register, role selection)
 * No sidebar or navbar
 */

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl">
        {children}
      </div>
    </div>
  );
}

