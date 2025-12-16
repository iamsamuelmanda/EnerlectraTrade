# Enerlectra API Freeze – v0.1-demo-lock

As of git tag `v0.1-demo-lock`, Enerlectra APIs that prove contribution, ownership, and outcome are frozen for demo and regulatory review.

Frozen endpoints (no breaking changes allowed):

- POST /clusters
- GET  /clusters

- POST /clusters/:id/join
- GET  /clusters/:id/contributions

- GET  /clusters/:id/ownership

- POST /clusters/:id/simulate
- POST /clusters/:id/distribute

- POST /suppliers
- POST /suppliers/:id/products
- GET  /suppliers

Ownership and outcomes are *never* written to disk. They are always computed from recorded contributions and cluster configuration.
