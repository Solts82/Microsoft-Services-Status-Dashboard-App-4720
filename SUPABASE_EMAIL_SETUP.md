# Supabase Email Configuration Setup

## Step 1: Configure Authentication Settings

1. Go to your **Supabase Dashboard**: https://supabase.com/dashboard
2. Select your project: `ceqlnmraiismxsprgrio`
3. Navigate to **Authentication** > **Settings**

## Step 2: Site URL Configuration

In the **Site URL** section, set:
```
Site URL: https://your-production-domain.com
```
*(Replace with your actual domain when deploying)*

For local development, you can also add:
```
Site URL: http://localhost:3000
```

## Step 3: Redirect URLs

Add these redirect URLs (replace `your-production-domain.com` with your actual domain):

### For Production:
```
https://your-production-domain.com/#/auth/callback
https://your-production-domain.com/#/auth/reset-password
```

### For Development (optional):
```
http://localhost:3000/#/auth/callback
http://localhost:3000/#/auth/reset-password
```

### For Vercel/Netlify Deployment:
If you're using Vercel, Netlify, or similar:
```
https://your-app-name.vercel.app/#/auth/callback
https://your-app-name.vercel.app/#/auth/reset-password

https://your-app-name.netlify.app/#/auth/callback
https://your-app-name.netlify.app/#/auth/reset-password
```

## Step 4: Custom SMTP Configuration

### Option A: Use Custom SMTP (Recommended)

1. Go to **Authentication** > **Settings** > **SMTP Settings**
2. Enable **Custom SMTP**
3. Configure with your email service:

```
SMTP Host: smtp.your-email-provider.com
SMTP Port: 587
SMTP User: no-reply@microsoftservicealert.com
SMTP Pass: your-smtp-password
Sender Name: Microsoft Service Health Alert
Sender Email: no-reply@microsoftservicealert.com
```

### Option B: Popular Email Services

#### Gmail/Google Workspace:
```
SMTP Host: smtp.gmail.com
SMTP Port: 587
SMTP User: no-reply@microsoftservicealert.com
SMTP Pass: your-app-password
```

#### SendGrid:
```
SMTP Host: smtp.sendgrid.net
SMTP Port: 587
SMTP User: apikey
SMTP Pass: your-sendgrid-api-key
```

#### Mailgun:
```
SMTP Host: smtp.mailgun.org
SMTP Port: 587
SMTP User: postmaster@your-domain.mailgun.org
SMTP Pass: your-mailgun-password
```

## Step 5: Email Templates

1. Go to **Authentication** > **Email Templates**

### Confirm Signup Template:
```html
<h2>Welcome to Microsoft Service Health Dashboard</h2>
<p>Thank you for signing up! Click the link below to confirm your email address:</p>
<p><a href="{{ .ConfirmationURL }}">Confirm your account</a></p>
<p>If you didn't create an account, you can safely ignore this email.</p>
<br>
<p>Best regards,<br>Microsoft Service Health Alert Team</p>
```

### Reset Password Template:
```html
<h2>Password Reset Request</h2>
<p>You requested a password reset for your Microsoft Service Health Dashboard account.</p>
<p>Click the link below to reset your password:</p>
<p><a href="{{ .ConfirmationURL }}">Reset Password</a></p>
<p>This link will expire in 1 hour for security reasons.</p>
<p>If you didn't request this password reset, you can safely ignore this email.</p>
<br>
<p>Best regards,<br>Microsoft Service Health Alert Team</p>
```

## Step 6: Authentication Flow Settings

1. Go to **Authentication** > **Settings**
2. Configure the following:

### User Signups:
- **Enable email confirmations**: ON (for production)
- **Enable phone confirmations**: OFF
- **Double confirm email changes**: ON

### Password Requirements:
- **Minimum password length**: 6 characters
- **Require special characters**: OFF (optional)
- **Require uppercase letters**: OFF (optional)
- **Require numbers**: OFF (optional)

### Security Settings:
- **Enable phone auth**: OFF
- **Enable email auth**: ON
- **Enable anonymous sign-ins**: OFF

## Step 7: Test Email Configuration

### Test Email Confirmation:
1. Register a new account in your application
2. Check that emails are sent from `no-reply@microsoftservicealert.com`
3. Verify the confirmation link redirects properly with hash routing
4. Confirm the account is activated

### Test Password Reset:
1. Use "Forgot Password" on the login screen
2. Check that the reset email is received
3. Verify the reset link works with hash routing
4. Confirm password can be updated successfully

## Step 8: Hash Routing Explanation

The app uses **Hash Router** (`/#/`) which means:

- ✅ **Correct URL format**: `https://yourdomain.com/#/auth/callback`
- ❌ **Wrong URL format**: `https://yourdomain.com/auth/callback`

The `#` (hash) is crucial for proper routing in single-page applications deployed on static hosting.

## Step 9: Deployment-Specific Setup

### Vercel Deployment:
1. Deploy your app to Vercel
2. Get your Vercel URL (e.g., `https://your-app.vercel.app`)
3. Update Supabase redirect URLs:
   ```
   https://your-app.vercel.app/#/auth/callback
   https://your-app.vercel.app/#/auth/reset-password
   ```

### Netlify Deployment:
1. Deploy your app to Netlify
2. Get your Netlify URL (e.g., `https://your-app.netlify.app`)
3. Update Supabase redirect URLs:
   ```
   https://your-app.netlify.app/#/auth/callback
   https://your-app.netlify.app/#/auth/reset-password
   ```

### Custom Domain:
1. Set up your custom domain
2. Update Supabase redirect URLs:
   ```
   https://your-custom-domain.com/#/auth/callback
   https://your-custom-domain.com/#/auth/reset-password
   ```

## Step 10: Email Flow Summary

### Registration Flow:
1. User registers → Confirmation email sent
2. User clicks link → Redirected to `/#/auth/callback`
3. Account confirmed → Redirected to dashboard

### Password Reset Flow:
1. User clicks "Forgot Password" → Reset email sent
2. User clicks link → Redirected to `/#/auth/reset-password`
3. User enters new password → Password updated
4. User redirected to dashboard

## Step 11: Troubleshooting

### Email Not Received
- Check spam/junk folder
- Verify SMTP credentials are correct
- Check Supabase logs in Dashboard > Logs
- Test with different email providers

### Redirect URL Issues
- Ensure URLs include the `#` for hash routing
- Check that redirect URLs match exactly (case-sensitive)
- Verify your domain is correctly configured
- Test with both production and development URLs

### Authentication Errors
- Check browser console for JavaScript errors
- Verify Supabase client configuration
- Ensure auth callback pages exist and are properly routed
- Test the complete flow from registration to login

## Step 12: Production Checklist

Before going live:

1. ✅ **Update Site URL** to production domain
2. ✅ **Update Redirect URLs** with production domain and `#` hash
3. ✅ **Enable Email Confirmations** if disabled during development
4. ✅ **Test complete auth flow** on production
5. ✅ **Monitor email delivery** rates and spam folders
6. ✅ **Set up proper SMTP** service (not development SMTP)

## Security Notes

- Never commit SMTP passwords to version control
- Use environment variables for sensitive data in production
- Consider using dedicated email service for production
- Monitor email delivery rates and bounces
- Implement rate limiting for password reset requests
- Use HTTPS in production for all auth flows
- The hash router provides client-side routing security

---

**Next Steps:**
1. Deploy your app to your hosting platform
2. Update Supabase redirect URLs with your production domain
3. Test email confirmation and password reset flows
4. Configure production SMTP settings
5. Monitor and verify everything works correctly

**Important**: The redirect URLs MUST include the `#` symbol for hash routing to work correctly!