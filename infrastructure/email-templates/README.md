# Email Service - Setup Guide

## Overview
The email service allows sending transactional emails (welcome, order confirmation, password reset) with tenant-specific branding.

## Configuration

### Development (Gmail)
1. Create a Gmail account or use existing
2. Enable 2-Factor Authentication
3. Generate App-Specific Password:
   - Go to Google Account → Security → App Passwords
   - Generate password for "Mail"
4. Add to `.env`:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@yourdomain.com
FRONTEND_URL=http://localhost:3000
```

### Production (AWS SES)
1. Verify domain in AWS SES
2. Request production access (exit sandbox mode)
3. Configure SPF, DKIM, DMARC records
4. Add credentials to `.env`:
```env
AWS_SES_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
```

## Usage

### Sending Welcome Email
```typescript
import { NodemailerProvider } from '@/infrastructure/providers/nodemailer.provider';

const emailService = new NodemailerProvider();

await emailService.sendWelcomeEmail(
  'user@example.com',
  'John Doe',
  {
    tenantName: 'Acme Store',
    primaryColor: '#007bff',
    supportEmail: 'support@acme.com',
    websiteUrl: 'https://acme.com'
  }
);
```

## Templates

- `welcome.hbs`: Welcome email for new users
- `password-reset.hbs`: Password reset with secure link
- `order-confirmation.hbs`: Order details and tracking

## Customization

Each template supports tenant branding:
- `tenantName`: Company name
- `tenantLogo`: Logo URL (optional)
- `primaryColor`: Brand color for buttons/links
- `supportEmail`: Support contact
- `websiteUrl`: Website URL for links

## Testing

Send a test email:
```typescript
const emailService = new NodemailerProvider();
const result = await emailService.sendEmail(
  'test@example.com',
  'Test Email',
  'welcome',
  { name: 'Test User' }
);
console.log('Email sent:', result);
```

## Troubleshooting

**SMTP Connection Error:**
- Verify SMTP credentials
- Check firewall/antivirus blocking port 587
- Ensure "Less secure apps" is enabled (Gmail)

**Template Not Found:**
- Check template path in `infrastructure/email-templates/`
- Ensure `.hbs` extension

**Emails Not Delivering:**
- Check spam folder
- Verify sender email is verified
- Monitor AWS SES sending quotas (production)
