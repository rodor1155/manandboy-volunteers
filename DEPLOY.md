# MAN&BOY Volunteer Sign-Up -- Deployment Guide

## What you're deploying

A Next.js app with:
- Public volunteer page (event list, sign up, withdraw)
- Admin panel at /admin (PIN: 2304)
- Supabase backend (events + signups tables)
- Hosted on Vercel

---

## Step 1: Supabase

1. Log into supabase.com
2. Click "New project" -- name it "manandboy-volunteers"
3. Choose a strong database password and save it somewhere
4. Wait for the project to provision (~1 min)
5. Go to the SQL Editor (left sidebar)
6. Paste the entire contents of supabase-schema.sql and click Run
7. You should see "Success" -- this creates the tables and seeds the initial events

8. Go to Project Settings > API
9. Copy:
   - Project URL  (looks like https://xxxxx.supabase.co)
   - anon public key (the long string under "Project API keys")

---

## Step 2: GitHub

1. Create a new private repo on GitHub called "manandboy-volunteers"
2. In the manandboy folder, run:

   git init
   git add .
   git commit -m "Initial build"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/manandboy-volunteers.git
   git push -u origin main

---

## Step 3: Vercel

1. Log into vercel.com
2. Click "Add New > Project"
3. Import your manandboy-volunteers GitHub repo
4. Under "Environment Variables", add:

   NEXT_PUBLIC_SUPABASE_URL        = (paste Project URL from Step 1)
   NEXT_PUBLIC_SUPABASE_ANON_KEY   = (paste anon key from Step 1)
   ADMIN_PIN                       = 2304

5. Click Deploy
6. Wait ~2 minutes for the build to complete
7. Vercel will give you a URL like manandboy-volunteers.vercel.app

---

## Step 4: Test

Volunteer view:
- Open the Vercel URL
- You'll be asked for your name -- enter it
- Try signing up for an event
- Try withdrawing
- Try signing up with an email address

Admin panel:
- Go to [your-url]/admin
- Enter PIN: 2304
- Try adding a new event with a volunteer cap
- Try editing an existing event
- Try cancelling and restoring an event
- Check the MI dashboard updates

---

## Step 5: Share with Clare

Send Clare:
- The Vercel URL for the volunteer page
- The /admin URL
- PIN: 2304

For the Man & Boy website, they can embed it with:
   <iframe src="YOUR_VERCEL_URL" width="100%" height="800" frameborder="0"></iframe>

---

## Updating the admin PIN later

1. Go to Vercel > your project > Settings > Environment Variables
2. Update ADMIN_PIN to your new 4-digit PIN
3. Redeploy (Vercel > Deployments > Redeploy)

---

## Adding the logo later

When Clare supplies the logo file:
1. Place it in /public/logo.png in the project
2. Update the LOGO constant in app/page.tsx and app/admin/page.tsx to "/logo.png"
3. Push to GitHub -- Vercel redeploys automatically

---

## Future: custom domain

If Man & Boy get DNS access later, point volunteers.manandboy.org to Vercel:
1. Vercel > Project > Settings > Domains
2. Add volunteers.manandboy.org
3. Add the CNAME record Vercel gives you to their DNS
