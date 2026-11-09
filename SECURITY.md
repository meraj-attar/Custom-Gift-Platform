# Security notes

This repository is configured for portfolio/demo use by default. Before a public production deployment:

1. Replace `SECRET_KEY` and the seeded admin password.
2. Set `PAYMENT_DEMO_MODE=false` only after adding valid Razorpay keys.
3. Configure Cloudinary or private object storage for customer uploads.
4. Configure SMTP for password-reset delivery and run with `APP_ENV=production` so reset links are not returned in API responses.
5. Use HTTPS at the reverse proxy and set strict production CORS origins.
6. Add rate limiting at the API gateway/reverse proxy for login, password reset and upload endpoints.
7. Rotate any credential that has ever been committed to Git.
