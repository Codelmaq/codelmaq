import type {Metadata} from 'next';
import './globals.css'; // Global styles
import { ClockGuard } from '@/components/ClockGuard';
import { ShiftFeedbackProvider } from '@/components/ShiftFeedbackProvider';

export const metadata: Metadata = {
  title: 'My Google AI Studio App',
  description: 'My Google AI Studio App',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ShiftFeedbackProvider>
          {/* Banner global de proteção contra alteração de relógio do aparelho.
              Não renderiza nada visível se o relógio do device estiver alinhado
              com o servidor Supabase. */}
          <ClockGuard />
          {children}
        </ShiftFeedbackProvider>
      </body>
    </html>
  );
}
