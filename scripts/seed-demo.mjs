import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const adminKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
const demoPassword = process.env.DEMO_PASSWORD;

const missing = [
  ["NEXT_PUBLIC_SUPABASE_URL", url],
  ["SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY", adminKey],
  ["DEMO_PASSWORD", demoPassword]
].filter(([, value]) => !value);

if (missing.length > 0) {
  console.error(`${missing.map(([name]) => name).join(", ")} are required.`);
  process.exit(1);
}

const supabase = createClient(url, adminKey, { auth: { persistSession: false } });

const demoUsers = [
  { email: "admin@table-to-app.example", full_name: "山本 管理", role: "admin" },
  { email: "staff@table-to-app.example", full_name: "田中 担当", role: "staff" },
  { email: "viewer@table-to-app.example", full_name: "佐藤 閲覧", role: "viewer" }
];

async function upsertUser({ email, full_name, role }) {
  const { data: existing } = await supabase.auth.admin.listUsers();
  const found = existing.users.find((user) => user.email === email);
  const {
    data: { user },
    error: createError
  } = found
    ? { data: { user: found }, error: null }
    : await supabase.auth.admin.createUser({
        email,
        password: demoPassword,
        email_confirm: true,
        user_metadata: { full_name }
      });

  if (createError || !user) throw createError ?? new Error(`Could not create user ${email}`);

  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    email,
    full_name,
    role,
    is_active: true
  });
  if (error) throw error;
  return user;
}

function dateFromToday(offsetDays) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

const customers = Array.from({ length: 10 }, (_, index) => ({
  customer_code: `C${String(index + 1).padStart(3, "0")}`,
  name: [
    "堺中央ビル管理",
    "泉北物流センター",
    "河内オフィスサービス",
    "南港テクノ倉庫",
    "和泉メディカル設備",
    "松原商業施設管理",
    "岸和田公共施設サポート",
    "高石製造所",
    "羽曳野福祉センター",
    "狭山教育会館"
  ][index],
  phone: `06-0000-${String(1100 + index)}`,
  email: `customer${index + 1}@example.invalid`
}));

async function main() {
  const users = await Promise.all(demoUsers.map(upsertUser));
  const admin = users[0];
  const staff = users[1];

  const { data: upsertedCustomers, error: customerError } = await supabase
    .from("customers")
    .upsert(customers, { onConflict: "customer_code" })
    .select();
  if (customerError) throw customerError;

  const sites = upsertedCustomers.flatMap((customer, index) =>
    [1, 2].map((n) => ({
      customer_id: customer.id,
      name: `${customer.name} 第${n}点検現場`,
      postal_code: `590-00${String(index).padStart(2, "0")}`,
      address: `大阪府南大阪市架空町${index + 1}-${n}-${index + n}`
    }))
  );

  const { data: upsertedSites, error: siteError } = await supabase
    .from("sites")
    .upsert(sites, { onConflict: "customer_id,name,address" })
    .select("id, customer_id, name, address");
  if (siteError) throw siteError;

  const statuses = ["scheduled", "in_progress", "report_preparing", "submitted", "completed", "cancelled"];
  const billings = ["not_quoted", "quoted", "ordered", "not_invoiced", "invoiced", "paid", "not_applicable"];
  const jobs = Array.from({ length: 50 }, (_, index) => {
    const site = upsertedSites[index % upsertedSites.length];
    const customer = upsertedCustomers.find((item) => item.id === site.customer_id);
    const assignee = index % 3 === 0 ? admin.id : staff.id;
    const offset = (index % 12) - 5;
    return {
      job_no: `MDS-2026-${String(index + 1).padStart(4, "0")}`,
      customer_id: customer.id,
      site_id: site.id,
      inspection_type: ["消防設備点検", "空調設備点検", "電気設備点検", "給排水設備点検"][index % 4],
      assignee_id: assignee,
      scheduled_date: dateFromToday(offset),
      report_due_date: dateFromToday(offset + 3),
      status: statuses[index % statuses.length],
      estimate_amount: 45000 + index * 2500,
      billing_status: billings[index % billings.length],
      notes: index % 9 === 0 ? "長めの備考確認用。前任者からの引継ぎ項目、現場入館ルール、報告書提出先の注意をまとめて確認する。" : "架空データ",
      created_by: admin.id,
      updated_by: admin.id
    };
  });

  const { data: upsertedJobs, error: jobError } = await supabase
    .from("inspection_jobs")
    .upsert(jobs, { onConflict: "job_no" })
    .select("id");
  if (jobError) throw jobError;

  console.log(`Seeded ${users.length} users, ${upsertedCustomers.length} customers, ${upsertedSites.length} sites, ${upsertedJobs.length} jobs.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
