import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { previewCsvImportRows } from "@/lib/server/csv-import";

export async function POST(request: Request) {
  const { supabase } = await requireRole(["admin"]);
  const body = await request.json();
  const rows = Array.isArray(body.rows) ? body.rows : [];

  const result = await previewCsvImportRows(supabase, rows);

  return NextResponse.json(result);
}
