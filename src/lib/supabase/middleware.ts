import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";

const PUBLIC_PATHS = ["/login", "/auth"];

export async function updateSession(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + "/"));
  const sessionValue = request.cookies.get(SESSION_COOKIE)?.value;
  let hasSession = Boolean(sessionValue);

  if (sessionValue) {
    try {
      const session = JSON.parse(sessionValue) as { id?: string | number };
      const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_PUBLISHABLE_KEY!,
        { auth: { persistSession: false, autoRefreshToken: false } }
      );
      const { data } = await supabase.from("profiles").select("id").eq("id", session.id).maybeSingle();
      hasSession = Boolean(data);
    } catch {
      hasSession = false;
    }
  }

  if (!hasSession && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    const response = NextResponse.redirect(url);
    response.cookies.delete(SESSION_COOKIE);
    return response;
  }

  if (!hasSession && path === "/login") {
    const response = NextResponse.next({ request });
    response.cookies.delete(SESSION_COOKIE);
    return response;
  }

  if (hasSession && path === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next({ request });
}
