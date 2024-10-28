# Email Validator Pro

A robust email validation tool that performs comprehensive checks for email addresses, including format validation, domain verification, MX record checks, SPF verification, and provider-specific SMTP validation.

## Features

- **Single Email Validation**
  - Format checking
  - Domain verification
  - MX record validation
  - SPF record checking
  - Provider-specific SMTP validation
  - Support for major email providers

- **Bulk Email Validation**
  - CSV file processing
  - Preserves all original data
  - Adds validation columns
  - Email notification with results
  - Detailed validation report

- **Provider-Specific Validation**
  - Gmail
  - Outlook/Hotmail
  - Yahoo
  - iCloud
  - ProtonMail
  - Generic email domains

- **Security Features**
  - Rate limiting
  - Helmet security headers
  - Health check endpoint
  - Session management
  - Secure authentication

## Environment Variables

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key

# SMTP Configuration
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_smtp_username
SMTP_PASS=your_smtp_password
SMTP_FROM=your_from_email
```

## API Endpoints

### Single Email Validation
```
POST /api/validate-single
Body: { "email": "user@example.com" }
```

### Bulk Email Validation
```
POST /api/validate-bulk
Form Data: 
- file: CSV file with email column
- userEmail: Logged in user's email
```

## Validation Checks

1. **Format Check**
   - Valid email syntax
   - Length restrictions
   - Character validation

2. **Domain Check**
   - Domain existence
   - DNS resolution

3. **MX Records**
   - MX record existence
   - Priority handling

4. **SPF Check**
   - SPF record validation
   - Policy verification

5. **SMTP Check**
   - Provider-specific validation
   - Mailbox existence verification
   - Connection testing

## CSV Processing

The bulk validator:
- Preserves all original columns
- Adds validation columns with "_" prefix
- Includes detailed check results
- Sends email notification with summary
- Provides downloadable results

## Rate Limiting

- 100 requests per 15 minutes per IP
- Batch processing for bulk validation
- 2-second delay between batches
- 10-second timeout for SMTP checks

## Health Check

```
GET /health
Response: { "status": "healthy" }
```

## Security Headers

```javascript
{
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", "supabase_url", "wss://*.supabase.co"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      fontSrc: ["'self'", "data:"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"]
    }
  }
}
```

## Deployment

The application is configured for Railway.app deployment with:
- Automatic health checks
- Graceful error handling
- Process management
- Static file serving
- WebSocket support

## Authentication

- Supabase authentication
- Persistent sessions
- Automatic token refresh
- Protected routes
- Secure sign-out

## Error Handling

- Detailed error messages
- Graceful fallbacks
- Type-safe responses
- Comprehensive logging
- User-friendly notifications