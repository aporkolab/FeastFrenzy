# SSL Certificates Directory

This directory should contain your SSL certificates for production deployment.

## Required Files

- `certificate.crt` - Your SSL certificate
- `private.key` - Your private key

## Development Setup

For development, generate self-signed certificates:

```bash
make ssl-generate
```

Or manually:

```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout private.key \
    -out certificate.crt \
    -subj "/C=US/ST=State/L=City/O=FeastFrenzy/CN=localhost"
```

## Production Setup

For production, use certificates from a trusted CA:

1. **Let's Encrypt** (free, automated):
   ```bash
   certbot certonly --webroot -w /var/www/certbot -d your-domain.com
   ```

2. **Commercial CA**: Purchase from DigiCert, Comodo, etc.

## Security Notes

- Never commit real certificates to version control
- Use environment variables or secrets management for production
- Rotate certificates before expiration (90 days for Let's Encrypt)

## File Permissions

```bash
chmod 600 private.key
chmod 644 certificate.crt
```
