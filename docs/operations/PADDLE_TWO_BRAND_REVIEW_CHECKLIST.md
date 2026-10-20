# Paddle two-brand review checklist

**Status:** Review preparation only — no Paddle submission, payment activation, or public Business Admin Desk publication is authorized.
**Source:** #1432 / PR #1437.
**Purpose:** Keep CorpFlowAI and Business Admin Desk evidence distinct while an operator prepares a Paddle onboarding review.

## 1. Scope and host separation

| Check | CorpFlowAI | Business Admin Desk |
| --- | --- | --- |
| Review route | `/pricing` and `/onboarding-review` on CorpFlowAI-controlled review surfaces | `/pricing` and `/onboarding-review` only on `cipc.corpflowai.com` / `cipc-desk.corpflowai.com` |
| Public client-production host | Not part of this checklist | `businessadmindesk.co.za` remains unchanged; review pages must not be promoted there |
| Pricing status | Approved selected-market package matrix | Quote-only; numerical ZAR rates remain unapproved |
| Search indexing | Review route is `noindex,nofollow` | Review route is `noindex,nofollow` |
| Checkout or payment claim | None | None |

The application must not show CorpFlowAI rates on Business Admin Desk hosts or Business Admin Desk review content on other tenant hosts. An unapproved Business Admin Desk public host returns its existing 404 response.

## 2. Package and handover evidence

For each customer package, confirm the public review material accurately states:

- the package outcome and agreed scope;
- configuration or implementation, AI processing where included, and human verification;
- testing, acceptance, and handover under the client’s control;
- that the client may revoke CorpFlowAI access after handover;
- that ongoing care is a separately agreed service requiring authorised access;
- that third-party licences, statutory fees, taxes, and complex or additional work are separately identified where applicable.

Do not represent the internal bill of materials, employee time, candidate rates, customer data, or a permanent hosted-login model as the product.

## 3. Review evidence to assemble

| Evidence | Current condition |
| --- | --- |
| CorpFlowAI package scope and regional price matrix | Implemented; validate against the approved matrix before any submission |
| Business Admin Desk package scope | Implemented as quote-only staging review; final numerical rates require approval |
| Terms, privacy, refund/cancellation, delivery, payment-security, and contact routes | Present; legal and contact-channel verification remain separate gates |
| Desktop, mobile, and printable review screenshots | Capture from the approved PR preview after its commit is available |
| Legal name and business/identity evidence | Operator-owned; not established by the pages |
| Product-category eligibility | Open; assess complete configured-software packages and associated fulfilment at package level |
| Paddle acceptance | Open; never infer it from a page, screenshot, sandbox, or this checklist |

## 4. Operator gates before any Paddle action

1. Confirm both brand views and their policy links on the intended review URLs.
2. Confirm the CorpFlowAI matrix is current and Business Admin Desk remains quote-only.
3. Obtain legal review, real contact-channel verification, identity evidence, and final Business Admin Desk commercial approval where needed.
4. Confirm product-category eligibility with Paddle using the actual package description and fulfilment model.
5. Obtain explicit approval before submitting material to Paddle, activating a checkout, or publishing Business Admin Desk on its public client-production domain.

This checklist is evidence preparation. It does not approve a product category, commercial rate, legal term, payment method, provider account, or deployment.
