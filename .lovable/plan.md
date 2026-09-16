# Product Imagery, Performance, and Reliability Completion

## Goal
Finish the remaining production-readiness work while preserving the current design, ordering flow, pricing, navigation, and admin behavior.

## Product images
- Inventory every distinct product and menu-item name, keeping one image assignment per exact product record.
- Replace broad category artwork with the closest accurate brand/product packshot available from reputable public web references; reuse one asset only for duplicate records of the same exact product.
- Store images through the project asset flow rather than hotlinking Google or third-party URLs.
- Fill the remaining missing food-menu image and retain the existing fallback for any future item without artwork.
- Verify that every active product has a valid image URL and that representative images load in product grids.

## Speed and responsiveness
- Reduce catalog payloads by selecting only fields each customer screen renders.
- Remove unnecessary eager image prefetching and prioritize only visible content; keep lazy loading and stable image dimensions to avoid layout shifts.
- Correct image URL handling and caching so project-hosted assets and Cloud-hosted images load efficiently.
- Review repeated settings/catalog requests and reuse cached queries where safe.
- Test the main customer flow at 320px, 375px, 414px, tablet, and desktop widths; fix only verified overflow, tap-target, sticky-control, and navigation issues.

## Bugs and reliability
- Check browser errors, failed requests, broken links, empty/error states, cart persistence, checkout, order confirmation/tracking, and admin product/order screens.
- Check Cloud health, slow queries, and recent function/database errors; add an index or code fix only when evidence shows it is needed.
- Complete the pending admin map support for guest-order location pins only if the existing order data supports it without changing checkout behavior.
- Keep product tiles non-clickable and ensure no product-details experience returns.

## Validation
- Run focused tests and the project’s automated checks.
- Exercise add-to-cart, quantity changes, refresh persistence, checkout validation, order tracking, admin product editing, and mobile navigation in the live preview.
- Confirm all active products and menu items have working, relevant images and report any source limitations honestly.
