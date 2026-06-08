# AeroAcquire — Aircraft Acquisition Platform

A full-featured aircraft acquisition tracking app with:
- Pipeline dashboard
- URL listing import with field extraction
- Aircraft records
- Side-by-side comparison table
- Due diligence tracker
- Mentor summary export

## Deploy in 5 Minutes

### Step 1: Set up Supabase database
1. Go to supabase.com → your project → SQL Editor
2. Paste the contents of `supabase-schema.sql` and click Run

### Step 2: Push to GitHub
1. Create a new repo at github.com (name it `aircraft-acquisition-app`)
2. Upload all these files to it

### Step 3: Deploy to Vercel
1. Go to vercel.com → Add New Project
2. Import your GitHub repo
3. Add these Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your Supabase anon key
4. Click Deploy

Your app will be live at a shareable URL in ~2 minutes.
