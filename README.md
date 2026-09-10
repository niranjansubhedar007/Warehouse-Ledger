# Warehouse Ledger

Inventory, purchasing, sales/billing and stock tracking for a small warehouse —
built with Next.js (App Router), Tailwind CSS, and Supabase (Postgres + Auth).

## Stack

- **Next.js 16** (App Router, Turbopack, Server Actions)
- **Tailwind CSS v4**
- **Supabase**: Postgres database, Auth (username/password via an email lookup), Row Level Security
- Real business logic (stock deduction, weighted-average cost, invoice/bill
  numbering) lives in Postgres functions (`supabase/schema.sql`) so it's atomic
  and race-safe no matter which client calls it.

## 1. Create your Supabase project

1. Go to [supabase.com](https://supabase.com), create a project (or use an existing one).
2. In your project dashboard, go to **Settings → API** and copy:
   - **Project URL**
   - **anon / public key**
3. Open `.env.local` in this folder and replace the placeholder values:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

   with your real project URL and anon key.

## 2. Set up the database

1. In the Supabase dashboard, open **SQL Editor → New query**.
2. Paste the entire contents of `supabase/schema.sql` and run it.
   - This creates all tables (`items`, `purchases`, `sales`, `sale_items`,
     `stock_transactions`, `profiles`), Row Level Security policies, and the
     `create_purchase` / `delete_purchase` / `create_sale` functions the app
     calls to keep stock numbers correct.
   - It also seeds 5 sample items if the `items` table is empty — delete that
     last block from the script first if you don't want sample data.
   - The script is safe to re-run.

## 3. Install dependencies & run

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## 4. Create your first (admin) user

There's no self-service sign-up in the app — accounts are created by an
admin from the Supabase dashboard:

The app logs people in with a **username + password** (Supabase Auth itself
still uses email under the hood — a `email_for_username` lookup in
`schema.sql` bridges the two, so the login form never needs to show an
email address).

1. In the Supabase dashboard, go to **Authentication → Users → Add user**
   and create a user with an email and password (tick "Auto Confirm User"
   so they can log in immediately without a confirmation email). The email
   itself is only used internally — it never appears in the app's UI.
   - The `profiles` row is created automatically for every new user, with a
     default **username** (the part of the email before the `@`) and the
     **staff** role (can manage items, purchases, sales and stock, but not
     Dashboard/Reports).
2. In the Supabase dashboard, go to **Table Editor → profiles**, find that
   row, and:
   - set `username` to whatever you want that person to log in with (must be
     unique — usernames are matched case-insensitively), and
   - change `role` from `staff` to `admin` if they need Dashboard and
     Reports access.
3. Create teammates the same way — leave them as `staff`, or promote them the
   same way if they need admin access.

Users log in at `/login` with their **username** and the password you set
for them in step 1.

## Project structure

```
src/
  app/
    login/                 — auth page (Server Action calls Supabase Auth)
    (app)/                 — everything behind auth, wrapped by AppShell
      dashboard/           — admin-only: KPIs + sales chart + low-stock preview
      items/                — Item Master (CRUD)
      purchase/             — Purchase Master (calls create_purchase / delete_purchase)
      sales/                — Sales/Billing (calls create_sale)
      stock/                — Stock levels + Low Stock filter + audit trail
      reports/              — admin-only: Sales/Purchase/Profit tabs, date range filter
  components/               — Sidebar, TopBar, AppShell, shared UI (Table, Modal,
                              SearchBar, Pagination, Toast, icons, bar chart)
  hooks/usePagedList.ts     — shared search + 10-per-page pagination logic
  lib/supabase/             — browser client, server client, middleware/session refresh
  lib/types.ts              — shared TypeScript types
supabase/schema.sql         — full DB schema, RLS policies, and RPC functions
```

## Notes / next steps

- **Roles**: gating for Dashboard/Reports is enforced both in the UI (hidden
  nav links, a "Restricted" page if you visit the URL directly) — the
  underlying tables themselves are readable/writable by any signed-in user,
  matching how the original prototype worked. If you want staff to be
  database-blocked from certain tables too, tighten the RLS policies in
  `schema.sql`.
- **Generated types**: `src/lib/types.ts` has hand-written types matching the
  schema. If you want fully generated, always-in-sync types, run
  `npx supabase gen types typescript --project-id <your-project-id> > src/lib/database.types.ts`
  (requires the Supabase CLI) and wire it in as the `Database` generic.
- **Stock transactions table** can grow large over time; the Stock page caps
  the audit trail fetch at the latest 500 rows.
# Warehouse-Ledger
