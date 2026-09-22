import { createClient } from "npm:@supabase/supabase-js@2";

import { rebuildAnalyticsInSupabase } from "./rebuild-lib.js";

const corsHeaders: Readonly<Record<string, string>> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type RebuildAnalyticsSuccessBody = {
  ok: true;
  updatedAt: string;
  pageCount: number;
  resourceCount: number;
};

type RebuildAnalyticsErrorBody = {
  ok: false;
  error: string;
};

type ParsedRebuildRequest = {
  readonly method: string;
  readonly url: URL;
  readonly pathname: string;
  readonly searchParams: URLSearchParams;
  readonly headers: Readonly<{
    authorization: string | null;
    apikey: string | null;
    contentType: string | null;
    xClientInfo: string | null;
    accept: string | null;
  }>;
  readonly hasJsonBody: boolean;
};

function parseRebuildRequest(req: Request): ParsedRebuildRequest {
  const url = new URL(req.url);
  const contentType = req.headers.get("Content-Type");
  return {
    method: req.method,
    url,
    pathname: url.pathname,
    searchParams: url.searchParams,
    headers: {
      authorization: req.headers.get("Authorization"),
      apikey: req.headers.get("apikey"),
      contentType,
      xClientInfo: req.headers.get("x-client-info"),
      accept: req.headers.get("Accept"),
    },
    hasJsonBody: (contentType ?? "").includes("application/json"),
  };
}

async function readOptionalJsonBody(req: Request, parsed: ParsedRebuildRequest): Promise<unknown> {
  if (req.method === "GET" || req.method === "HEAD" || !parsed.hasJsonBody) {
    return undefined;
  }
  const text = await req.text();
  if (!text.trim()) {
    return undefined;
  }
  return JSON.parse(text) as unknown;
}

function jsonResponse(body: RebuildAnalyticsSuccessBody | RebuildAnalyticsErrorBody, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request): Promise<Response> => {
  const incoming = parseRebuildRequest(req);

  if (incoming.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (incoming.method !== "POST") {
    return jsonResponse({ ok: false, error: "Method not allowed" }, 405);
  }

  try {
    await readOptionalJsonBody(req, incoming);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !serviceKey || !anonKey) {
      throw new Error("Missing Supabase env for rebuild-analytics");
    }

    const authorization = incoming.headers.authorization;
    if (!authorization?.startsWith("Bearer ")) {
      return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
    });
    const { data: isAdmin, error: adminError } = await userClient.rpc("is_app_admin");
    if (adminError || !isAdmin) {
      return jsonResponse({ ok: false, error: "Forbidden" }, 403);
    }

    const client = createClient(supabaseUrl, serviceKey);
    const result = await rebuildAnalyticsInSupabase(client);

    const body: RebuildAnalyticsSuccessBody = {
      ok: true,
      updatedAt: result.updatedAt,
      pageCount: result.pageCount,
      resourceCount: result.resourceCount,
    };
    return jsonResponse(body, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return jsonResponse({ ok: false, error: message }, 500);
  }
});
