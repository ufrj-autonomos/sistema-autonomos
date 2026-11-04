import { traceApi } from '@/lib/activity/server';
import { authorizeApi } from '@/lib/session';
import { NextRequest, NextResponse } from "next/server";
import { getGestaoStats } from "@/lib/gestao";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(_req: NextRequest) {
  return traceApi(_req, "GET /api/gestao/stats", async () => {
  try {
    const access = await authorizeApi(_req, true);
    if (access.error) return access.error;
    const data = await getGestaoStats();
    return NextResponse.json(data, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("Erro crítico em /api/gestao/stats:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno ao consultar dados de gestão.",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }

  });
}
