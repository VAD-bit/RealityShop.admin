import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Aquí irá la validación de sesión de Supabase
  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*'],
}