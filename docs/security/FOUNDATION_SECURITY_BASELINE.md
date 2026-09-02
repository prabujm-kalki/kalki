# Foundation Security Baseline

- Secrets are supplied through environment/secret management only.
- `.env` and credentials are excluded from Git.
- No production TMBill credentials are present; TMBill is disabled.
- No real Aadhaar numbers/documents are present.
- No real customer data is present.
- Branch and organization scope will be enforced server-side once authorization is enabled.
- Authentication does not replace business authorization.
- Health output contains only non-sensitive service metadata.
- AI has no direct database write path.
- External ingestion must be idempotent and auditable.
- Sensitive employee documents require least privilege, controlled replacement, and audit history.
