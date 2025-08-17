# Microsoft Service Health Dashboard - Setup Instructions

## 🚀 Quick Setup Guide

### Step 1: Get Your Supabase Credentials

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard
2. **Select your project** or create a new one
3. **Navigate to Settings > API**
4. **Copy these values**:
   - Project URL (looks like: `https://abcdefghijk.supabase.co`)
   - anon/public key (long string starting with `eyJ...`)

### Step 2: Update Supabase Configuration

**Option A: Direct Update (Quick)**
1. Open `src/lib/supabase.js`
2. Replace these lines:
```javascript
const SUPABASE_URL = 'https://ceqlnmraiismxsprgrio.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

With your actual credentials:
```javascript
const SUPABASE_URL = 'https://YOUR-PROJECT-ID.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR-ANON-KEY-HERE';
```

**Option B: Environment Variables (Recommended)**
1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Edit `.env` and add your credentials:
```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### Step 3: Set Up Database Tables

1. **Go to Supabase Dashboard > SQL Editor**
2. **Copy and paste** the contents of `src/services/databaseSchema.sql`
3. **Run the SQL** to create all required tables
4. **Copy and paste** the contents of `src/services/adminSetup.sql`
5. **Run the SQL** to set up admin functionality

### Step 4: Test the Connection

1. **Start the development server**:
```bash
npm run dev
```

2. **Check the browser console** for these messages:
   - ✅ `Supabase configuration looks valid`
   - ✅ `Supabase client initialized`
   - ✅ `Supabase connection test successful`

3. **If you see errors**, double-check your credentials

### Step 5: Make Yourself Admin (Optional)

1. **Register an account** in your app first
2. **Go to Supabase Dashboard > SQL Editor**
3. **Run this query** (replace with your email):
```sql
SELECT promote_user_to_admin('your-email@example.com', 'super_admin');
```

## 🔧 Troubleshooting

### "Database Connection Issue" Error

**Cause**: Supabase credentials are incorrect or missing

**Solution**:
1. Verify your Project URL and anon key in Supabase Dashboard
2. Make sure the URL starts with `https://` and ends with `.supabase.co`
3. Ensure the anon key is the full key (starts with `eyJ`)
4. Check for typos in your credentials

### Tables Don't Exist

**Cause**: Database schema hasn't been set up

**Solution**:
1. Run the SQL from `src/services/databaseSchema.sql` in Supabase SQL Editor
2. Check that tables were created in Database > Tables
3. Verify Row Level Security (RLS) is enabled

### Authentication Issues

**Cause**: Auth settings not configured

**Solution**:
1. Go to Authentication > Settings in Supabase
2. Set Site URL to your domain (e.g., `http://localhost:3000`)
3. Add redirect URLs:
   - `http://localhost:3000/#/auth/callback`
   - `http://localhost:3000/#/auth/reset-password`

### Network/CORS Errors

**Cause**: Browser blocking requests or network issues

**Solution**:
1. Check your internet connection
2. Try refreshing the page
3. Check browser console for detailed error messages
4. Verify Supabase project is not paused

## 📋 Checklist

- [ ] Supabase project created
- [ ] Project URL and anon key obtained
- [ ] Credentials updated in `src/lib/supabase.js` or `.env`
- [ ] Database schema SQL executed
- [ ] Admin setup SQL executed
- [ ] App starts without connection errors
- [ ] Can register and login
- [ ] Admin panel accessible (if admin user created)

## 🚀 Next Steps

Once everything is working:
1. **Customize the monitoring** by adding your own service endpoints
2. **Set up email notifications** using the Supabase email setup guide
3. **Deploy to production** and update redirect URLs
4. **Monitor the logs** in Supabase Dashboard > Logs

## 💡 Tips

- **Keep your credentials secure** - never commit them to version control
- **Use environment variables** in production
- **Test thoroughly** before deploying
- **Monitor database usage** in Supabase Dashboard
- **Set up backups** for production data

---

Need help? Check the browser console for detailed error messages or create an issue in the repository.