import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // Permite que o fluxo de login e controle de páginas seja gerenciado no cliente,
  // preservando a flexibilidade e evitando redirecionamentos indesejados.
  return NextResponse.next();
}

// Define em quais caminhos o middleware vai rodar
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
