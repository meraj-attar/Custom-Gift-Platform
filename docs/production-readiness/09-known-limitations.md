# Phase 12: Known Limitations & Future Enhancements

**Date**: 2026-11-09  
**Platform**: CustomGift E-Commerce Platform  

---

## 1. Current Architecture Characteristics & Considerations

1. **In-Memory Rate Limiting**:
   - The current `RateLimitMiddleware` uses an in-memory sliding window store. This is ideal for single-node deployments or container clusters with sticky sessions.
   - *Future Enhancement*: For multi-instance load-balanced deployments across multiple physical hosts, migrate the rate-limiting store to Redis via `redis-py` or an API gateway (e.g. Kong / Cloudflare WAF).

2. **Razorpay Webhook Handling**:
   - The platform verifies payments directly via customer callback signature verification (`/payments/verify`) using HMAC-SHA256.
   - *Future Enhancement*: Add an asynchronous background webhook endpoint (`/payments/webhook`) with signature verification to handle delayed bank reconciliation if a customer closes their browser before returning.

3. **Background Worker Queues**:
   - The platform sends password reset emails synchronously inside the request lifecycle using SMTP with a 15-second timeout.
   - *Future Enhancement*: For high-volume transactional email loads (thousands per minute), offload email sending to a Celery or ARQ background task worker with Redis/RabbitMQ.

4. **Multi-Currency Support**:
   - Currently, pricing and payments are hardcoded to INR (`₹`).
   - *Future Enhancement*: Add currency conversion rates and multi-currency Razorpay support for international orders.
