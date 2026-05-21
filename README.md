This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Admin API & Environment Variables

This project includes a server-side admin API used by the admin dashboard to perform privileged operations (delete/update/insert) against the `events` table. The API uses the Supabase **service role** key and must only run on the server.

Required environment variables (set in `.env.local` during local development or in your host's environment settings):

- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL (public)
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — anon/public key (public)
- `SUPABASE_SERVICE_ROLE_KEY` — service role key (secret, server-only)

Example `.env.local` (DO NOT commit this file):

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

Notes:
- The `SUPABASE_SERVICE_ROLE_KEY` must be kept secret. Never expose it in client-side code or commit it to your repository.
- After editing `.env.local` you must restart the dev server: `npm run dev`.
- In production (Vercel, Netlify, etc.) set the environment variables in the project settings / environment variables panel rather than in code.

Security and RLS:
- If Row Level Security (RLS) is enabled on your Supabase tables, regular client keys (anon) may be blocked from performing updates/deletes. The server-side admin API uses the service role key to perform admin actions securely and bypass RLS for those server calls. For production, prefer writing server endpoints that perform the minimal privileged actions rather than using the service role from client code.

If you want help tightening RLS policies and converting more actions to secure server endpoints, I can help implement that next.
