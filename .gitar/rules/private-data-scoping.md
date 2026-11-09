---
title: "Private data scoping"
description: "Every query on per-user private indices must be scoped to the owner"
type: check
when: "PRs that add or modify Elasticsearch queries, repositories, or routes touching contacts, clips, or highlights"
actions: "Request changes if any query on contacts, clips, or highlights can run without an owner_id term filter; point to the exact query and suggest the fix"
---

# Private data scoping

`contacts`, `clips`, and `highlights` hold one attendee's private notes and saved conversations. Confy has no auth (demo persona via the `x-user-id` header), so the `owner_id` filter is the only thing separating users' data.

Verify that:
- Every repository method for these indices takes `ownerId` as a required parameter, and the ES query includes `{ term: { owner_id: ownerId } }` in `filter`, including inside `knn.filter` and inside each retriever of an RRF query.
- Routes pass `request.userId`, not a value from the request body or query string.
- Writes set `owner_id` from `request.userId`.
