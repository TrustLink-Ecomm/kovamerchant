# KOVA Merchant API Documentation

**Base URL:** `https://api.kovaonline.com`

This document covers two audiences:

- **Merchant Dashboard** — endpoints for a logged-in merchant managing their own store (products, orders, invoices,
  account settings). All merchant endpoints require a `ROLE_MERCHANT` JWT.
- **Buyer / Public** — endpoints used by the buyer-facing app to browse merchant products and place orders. Public
  browse endpoints require no token. Order placement requires a regular `ROLE_USER` JWT.

---

## Authentication

All authenticated requests must include:

```
Authorization: Bearer <token>
```

Tokens are issued as JWTs. The merchant token carries `ROLE_MERCHANT`; the buyer token carries `ROLE_USER`. Do not use a
merchant token to call buyer endpoints or vice versa.

---

## Table of Contents

1. [Merchant Auth](#1-merchant-auth)
2. [Merchant Dashboard](#2-merchant-dashboard)
3. [Merchant Products](#3-merchant-products)
4. [Merchant Orders](#4-merchant-orders)
5. [Merchant Invoices](#5-merchant-invoices)
6. [Mobile Money Account](#6-mobile-money-account)
7. [Public — Browse Merchant Products](#7-public--browse-merchant-products)
8. [Buyer — Place & Track Orders](#8-buyer--place--track-orders)
9. [Schemas](#9-schemas)
10. [Enums](#10-enums)
11. [Error Responses](#11-error-responses)

---

## 1. Merchant Auth

### Login

```
POST /api/v1/merchant/auth/login
```

**Auth:** None

**Request Body:**

```json
{
  "email": "kofi@farms.com",
  "password": "Merchant@2024"
}
```

**Response `200 OK`:**

```json
{
  "token": "<jwt>",
  "status": "success",
  "merchant": {
    "id": "merch-uuid",
    "businessName": "Kofi Farms & Agro",
    "email": "kofi@farms.com",
    "phoneNumber": "+233244300101",
    "description": "Fresh farm produce delivered across Accra.",
    "logoUrl": null,
    "status": "ACTIVE",
    "billingCycle": "MONTHLY",
    "billingStartDate": "2024-01-01",
    "createdAt": "2024-01-01T08:00:00",
    "updatedAt": "2024-06-01T10:00:00",
    "momoAccount": {
      "id": 1,
      "accountName": "Kofi Agyemang",
      "phoneNumber": "+233244300101",
      "network": "MTN"
    }
  }
}
```

> `momoAccount` is `null` if the merchant has not yet added a Mobile Money account.

**Error cases:**

- `401` — wrong email or password
- `403` — account is `SUSPENDED` or still `PENDING_APPROVAL`

---

### Re-authenticate (Refresh Token)

```
GET /api/v1/merchant/auth/re-authenticate
```

**Auth:** `ROLE_MERCHANT` JWT

Issues a fresh token without requiring the password again. Call this before the current token expires to keep the
merchant session alive.

**Response `200 OK`:** Same shape as the login response.

---

## 2. Merchant Dashboard

All endpoints in this section require a `ROLE_MERCHANT` JWT. The merchant identity is derived from the token — no
`merchantId` path parameter is needed.

### Get Dashboard Summary

```
GET /api/v1/merchant/dashboard
```

**Auth:** `ROLE_MERCHANT`

Returns an overview of the merchant's store: order counts by status, total revenue, product count, and invoice count.
Designed to populate the main dashboard screen.

**Response `200 OK`:**

```json
{
  "totalOrders": 47,
  "pendingOrders": 5,
  "processingOrders": 3,
  "completedOrders": 38,
  "cancelledOrders": 1,
  "totalRevenue": 12450.00,
  "totalProducts": 8,
  "totalInvoices": 3,
  "merchantInfo": {
    "id": "merch-uuid",
    "businessName": "Kofi Farms & Agro",
    "email": "kofi@farms.com",
    "phoneNumber": "+233244300101",
    "description": "Fresh farm produce delivered across Accra.",
    "logoUrl": null,
    "status": "ACTIVE",
    "billingCycle": "MONTHLY",
    "billingStartDate": "2024-01-01",
    "createdAt": "2024-01-01T08:00:00",
    "updatedAt": "2024-06-01T10:00:00",
    "momoAccount": {
      "id": 1,
      "accountName": "Kofi Agyemang",
      "phoneNumber": "+233244300101",
      "network": "MTN"
    }
  }
}
```

---

## 3. Merchant Products

All endpoints require `ROLE_MERCHANT`. The merchant can only see and manage their own products.

### Create Product

```
POST /api/v1/merchant/products
```

**Auth:** `ROLE_MERCHANT`

**Request Body:**

```json
{
  "name": "Premium Tomatoes (1 Crate)",
  "description": "Fresh, sun-ripened tomatoes from Volta Region. 1 crate (~60 pieces).",
  "price": 85.00,
  "stockQuantity": 40,
  "categoryId": 1,
  "subCategoryId": null,
  "images": [
    "https://res.cloudinary.com/your-cloud/image/upload/tomatoes_1.jpg",
    "https://res.cloudinary.com/your-cloud/image/upload/tomatoes_2.jpg"
  ],
  "specifications": {
    "Weight per crate": "~25kg",
    "Origin": "Volta Region",
    "Shelf life": "5-7 days"
  }
}
```

| Field            | Required | Notes                               |
|------------------|----------|-------------------------------------|
| `name`           | Yes      |                                     |
| `price`          | Yes      | Must be > 0                         |
| `categoryId`     | Yes      | ID from the platform category list  |
| `description`    | No       |                                     |
| `stockQuantity`  | No       |                                     |
| `subCategoryId`  | No       |                                     |
| `images`         | No       | Array of Cloudinary URLs            |
| `specifications` | No       | Key-value map of product attributes |

**Response `201 Created`:** [`MerchantProductResponse`](#merchantproductresponse)

---

### List My Products

```
GET /api/v1/merchant/products?page={page}&size={size}&sort={field,direction}
```

**Auth:** `ROLE_MERCHANT`

Returns only the calling merchant's products (excluding soft-deleted ones).

**Query Params:**

| Param  | Default | Description                          |
|--------|---------|--------------------------------------|
| `page` | `0`     | Zero-based page number               |
| `size` | `20`    | Items per page                       |
| `sort` | —       | e.g. `createdAt,desc` or `price,asc` |

**Response `200 OK`:**

```json
{
  "content": [
    /* MerchantProductResponse */
  ],
  "totalElements": 8,
  "totalPages": 1,
  "number": 0,
  "size": 20
}
```

---

### Get Product by ID

```
GET /api/v1/merchant/products/{productId}
```

**Auth:** `ROLE_MERCHANT`

**Path Param:** `productId` — numeric product ID

**Response `200 OK`:** [`MerchantProductResponse`](#merchantproductresponse)

---

### Update Product

```
PUT /api/v1/merchant/products/{productId}
```

**Auth:** `ROLE_MERCHANT`

All fields are optional — send only what needs to change.

**Request Body:**

```json
{
  "name": "Premium Tomatoes (1 Crate) — Seasonal",
  "price": 90.00,
  "stockQuantity": 25,
  "images": [
    "https://res.cloudinary.com/your-cloud/image/upload/tomatoes_updated.jpg"
  ],
  "specifications": {
    "Weight per crate": "~25kg",
    "Origin": "Volta Region",
    "Shelf life": "5-7 days",
    "Season": "Harmattan special"
  }
}
```

**Response `200 OK`:** [`MerchantProductResponse`](#merchantproductresponse) with updated values.

**Error cases:**

- `403` — product belongs to a different merchant
- `404` — product not found

---

### Delete Product

```
DELETE /api/v1/merchant/products/{productId}
```

**Auth:** `ROLE_MERCHANT`

Soft-deletes the product (sets `isDeleted = true`). The product will no longer appear in public listings. Existing
orders referencing the product are unaffected.

**Response `204 No Content`**

**Error cases:**

- `403` — product belongs to a different merchant
- `404` — product not found

---

## 4. Merchant Orders

All endpoints require `ROLE_MERCHANT`. Orders are scoped to the calling merchant.

### List Orders

```
GET /api/v1/merchant/orders?status={status}&page={page}&size={size}&sort={field,direction}
```

**Auth:** `ROLE_MERCHANT`

**Query Params:**

| Param    | Required | Description                                                                 |
|----------|----------|-----------------------------------------------------------------------------|
| `status` | No       | Filter by status. Values: `PENDING`, `PROCESSING`, `COMPLETED`, `CANCELLED` |
| `page`   | No       | Default `0`                                                                 |
| `size`   | No       | Default `20`                                                                |
| `sort`   | No       | e.g. `orderDate,desc`                                                       |

Omitting `status` returns all orders regardless of status.

**Response `200 OK`:**

```json
{
  "content": [
    /* MerchantOrderResponse */
  ],
  "totalElements": 47,
  "totalPages": 3,
  "number": 0,
  "size": 20
}
```

---

### Get Order Details

```
GET /api/v1/merchant/orders/{orderId}
```

**Auth:** `ROLE_MERCHANT`

**Path Param:** `orderId` — the string order ID (e.g. `MO-2024-00001`)

**Response `200 OK`:** [`MerchantOrderResponse`](#merchantorderresponse)

**Error cases:**

- `403` — order belongs to a different merchant
- `404` — order not found

---

### Update Order Status

```
PUT /api/v1/merchant/orders/{orderId}/status
```

**Auth:** `ROLE_MERCHANT`

Used to move an order through its lifecycle. The merchant can also mark the payment as received.

**Request Body:**

```json
{
  "orderStatus": "PROCESSING",
  "paymentStatus": "PAID"
}
```

| Field           | Required | Notes                                                        |
|-----------------|----------|--------------------------------------------------------------|
| `orderStatus`   | Yes      | `PENDING` → `PROCESSING` → `COMPLETED` or `CANCELLED`        |
| `paymentStatus` | No       | `PENDING` or `PAID`. Omit to leave payment status unchanged. |

**Typical flow:**

1. Order arrives as `PENDING` + `PENDING`
2. Merchant confirms and starts preparing → `PROCESSING`
3. For MoMo orders: merchant confirms payment received → `paymentStatus: PAID`
4. Order dispatched/collected → `COMPLETED`

**Response `200 OK`:** [`MerchantOrderResponse`](#merchantorderresponse) with updated status.

**Error cases:**

- `400` — invalid status transition
- `403` — order belongs to a different merchant

---

## 5. Merchant Invoices

Invoices are generated automatically by the platform based on the merchant's billing cycle (weekly or monthly). The
merchant views them here; they cannot create or delete invoices.

### List My Invoices

```
GET /api/v1/merchant/dashboard/invoices?page={page}&size={size}
```

**Auth:** `ROLE_MERCHANT`

**Query Params:**

| Param  | Default |
|--------|---------|
| `page` | `0`     |
| `size` | `20`    |

**Response `200 OK`:**

```json
{
  "content": [
    /* MerchantInvoiceResponse */
  ],
  "totalElements": 3,
  "totalPages": 1,
  "number": 0,
  "size": 20
}
```

---

### Get Invoice Details

```
GET /api/v1/merchant/dashboard/invoices/{invoiceId}
```

**Auth:** `ROLE_MERCHANT`

**Path Param:** `invoiceId` — numeric invoice ID

**Response `200 OK`:** [`MerchantInvoiceResponse`](#merchantinvoiceresponse) including all line items.

**Error cases:**

- `403` — invoice belongs to a different merchant
- `404` — invoice not found

---

## 6. Mobile Money Account

The merchant adds their Mobile Money details after onboarding. These details are shown to buyers who choose MoMo as
their payment method when placing an order.

### Save / Update MoMo Account

```
POST /api/v1/merchant/dashboard/momo-account
```

**Auth:** `ROLE_MERCHANT`

Creates the account if none exists, or replaces the existing one.

**Request Body:**

```json
{
  "accountName": "Kofi Agyemang",
  "phoneNumber": "+233244300101",
  "network": "MTN"
}
```

| Field         | Required | Notes                                   |
|---------------|----------|-----------------------------------------|
| `accountName` | Yes      | Name registered with the mobile network |
| `phoneNumber` | Yes      | MoMo number including country code      |
| `network`     | Yes      | `MTN`, `VODAFONE`, or `AIRTELTIGO`      |

**Response `200 OK`:**

```json
{
  "id": 1,
  "accountName": "Kofi Agyemang",
  "phoneNumber": "+233244300101",
  "network": "MTN"
}
```

---

### Get MoMo Account

```
GET /api/v1/merchant/dashboard/momo-account
```

**Auth:** `ROLE_MERCHANT`

**Response `200 OK`:**

```json
{
  "id": 1,
  "accountName": "Kofi Agyemang",
  "phoneNumber": "+233244300101",
  "network": "MTN"
}
```

**Error cases:**

- `404` — merchant has not set up a MoMo account yet

---

## 7. Public — Browse Merchant Products

These endpoints require **no authentication**. They are used by the buyer-facing app to display merchant products.

### List All Merchant Products

```
GET /api/v1/merchant-products?search={query}&page={page}&size={size}&sort={field,direction}
```

**Auth:** None

**Query Params:**

| Param    | Required | Description                           |
|----------|----------|---------------------------------------|
| `search` | No       | Searches product name and description |
| `page`   | No       | Default `0`                           |
| `size`   | No       | Default `20`                          |
| `sort`   | No       | e.g. `price,asc` or `createdAt,desc`  |

Returns only active (non-deleted) products from `ACTIVE` merchants.

**Response `200 OK`:**

```json
{
  "content": [
    {
      "id": 1,
      "name": "Premium Tomatoes (1 Crate)",
      "description": "Fresh, sun-ripened tomatoes from Volta Region.",
      "price": 85.00,
      "stockQuantity": 40,
      "images": [
        "https://res.cloudinary.com/your-cloud/image/upload/tomatoes_1.jpg"
      ],
      "specifications": {
        "Weight per crate": "~25kg",
        "Origin": "Volta Region"
      },
      "categoryName": "Food & Groceries",
      "subCategoryName": null,
      "merchantId": "merch-uuid",
      "merchantBusinessName": "Kofi Farms & Agro",
      "createdAt": "2024-01-15T09:00:00",
      "updatedAt": "2024-06-01T10:00:00"
    }
  ],
  "totalElements": 45,
  "totalPages": 3,
  "number": 0,
  "size": 20
}
```

---

### Get Single Merchant Product

```
GET /api/v1/merchant-products/{productId}
```

**Auth:** None

**Path Param:** `productId` — numeric product ID

**Response `200 OK`:** [`MerchantProductResponse`](#merchantproductresponse) — full detail including all images and
specifications.

**Error cases:**

- `404` — product not found or has been deleted

---

## 8. Buyer — Place & Track Orders

These endpoints require a regular `ROLE_USER` JWT (the buyer's token). A buyer cannot use a merchant token here.

### Place an Order

```
POST /api/v1/merchant-orders
```

**Auth:** `ROLE_USER`

**Request Body:**

```json
{
  "productId": 1,
  "quantity": 2,
  "paymentMethod": "MOBILE_MONEY",
  "buyerName": "Kwame Asante",
  "buyerPhone": "+233244112233",
  "deliveryAddress": "No. 12 Ring Road East, Osu, Accra",
  "notes": "Please deliver before noon."
}
```

| Field             | Required | Notes                                 |
|-------------------|----------|---------------------------------------|
| `productId`       | Yes      | ID of the merchant product            |
| `quantity`        | Yes      | Must be > 0                           |
| `paymentMethod`   | Yes      | `MOBILE_MONEY` or `PAY_ON_DELIVERY`   |
| `buyerName`       | Yes      | Delivery contact name                 |
| `buyerPhone`      | Yes      | Delivery contact phone                |
| `deliveryAddress` | No       |                                       |
| `notes`           | No       | Special instructions for the merchant |

**Response `201 Created`:** [`MerchantOrderResponse`](#merchantorderresponse)

> When `paymentMethod` is `MOBILE_MONEY`, the response includes `merchantMomo` with the merchant's MoMo details so the
> buyer can complete the payment immediately.

**Error cases:**

- `404` — product not found
- `400` — invalid quantity or product is deleted/out of stock

---

### Get My Orders (Buyer)

```
GET /api/v1/merchant-orders/user?page={page}&size={size}
```

**Auth:** `ROLE_USER`

Returns all merchant orders placed by the authenticated buyer, newest first.

**Query Params:**

| Param  | Default |
|--------|---------|
| `page` | `0`     |
| `size` | `20`    |

**Response `200 OK`:**

```json
{
  "content": [
    /* MerchantOrderResponse */
  ],
  "totalElements": 5,
  "totalPages": 1,
  "number": 0,
  "size": 20
}
```

---

### Get Order Details (Buyer)

```
GET /api/v1/merchant-orders/user/{orderId}
```

**Auth:** `ROLE_USER`

**Path Param:** `orderId` — the string order ID (e.g. `MO-2024-00001`)

**Response `200 OK`:** [`MerchantOrderResponse`](#merchantorderresponse)

**Error cases:**

- `403` — order belongs to a different buyer
- `404` — order not found

---

## 9. Schemas

### MerchantProductResponse

```json
{
  "id": 1,
  "name": "Premium Tomatoes (1 Crate)",
  "description": "Fresh, sun-ripened tomatoes from Volta Region.",
  "price": 85.00,
  "stockQuantity": 40,
  "images": [
    "https://res.cloudinary.com/your-cloud/image/upload/tomatoes_1.jpg"
  ],
  "specifications": {
    "Weight per crate": "~25kg",
    "Origin": "Volta Region",
    "Shelf life": "5-7 days"
  },
  "categoryName": "Food & Groceries",
  "subCategoryName": null,
  "merchantId": "merch-uuid",
  "merchantBusinessName": "Kofi Farms & Agro",
  "createdAt": "2024-01-15T09:00:00",
  "updatedAt": "2024-06-01T10:00:00"
}
```

---

### MerchantOrderResponse

```json
{
  "id": 101,
  "orderId": "MO-2024-00001",
  "status": "COMPLETED",
  "paymentMethod": "MOBILE_MONEY",
  "paymentStatus": "PAID",
  "totalPrice": 170.00,
  "quantity": 2,
  "buyerId": "user-uuid",
  "buyerName": "Kwame Asante",
  "buyerPhone": "+233244112233",
  "deliveryAddress": "No. 12 Ring Road East, Osu, Accra",
  "notes": "Please deliver before noon.",
  "productId": 1,
  "productName": "Premium Tomatoes (1 Crate)",
  "productPrice": 85.00,
  "merchantId": "merch-uuid",
  "merchantBusinessName": "Kofi Farms & Agro",
  "merchantMomo": {
    "id": 1,
    "accountName": "Kofi Agyemang",
    "phoneNumber": "+233244300101",
    "network": "MTN"
  },
  "orderDate": "2024-06-10T14:30:00",
  "updatedAt": "2024-06-11T09:00:00"
}
```

> `merchantMomo` is `null` when `paymentMethod` is `PAY_ON_DELIVERY`.

---

### MerchantInvoiceResponse

```json
{
  "id": 1,
  "invoiceNumber": "INV-2024-KF-001",
  "merchantId": "merch-uuid",
  "merchantBusinessName": "Kofi Farms & Agro",
  "merchantEmail": "kofi@farms.com",
  "periodStart": "2024-01-01",
  "periodEnd": "2024-01-31",
  "totalOrderValue": 4820.00,
  "totalOrders": 23,
  "status": "SENT",
  "generatedAt": "2024-02-01T00:00:00",
  "items": [
    {
      "id": 201,
      "orderId": "MO-2024-00001",
      "productName": "Premium Tomatoes (1 Crate)",
      "quantity": 2,
      "unitPrice": 85.00,
      "totalPrice": 170.00,
      "paymentMethod": "MOBILE_MONEY",
      "paymentStatus": "PAID",
      "buyerName": "Kwame Asante",
      "buyerPhone": "+233244112233",
      "orderDate": "2024-01-10T14:30:00"
    }
  ]
}
```

---

### MerchantResponse (used inside auth and dashboard)

```json
{
  "id": "merch-uuid",
  "businessName": "Kofi Farms & Agro",
  "email": "kofi@farms.com",
  "phoneNumber": "+233244300101",
  "description": "Fresh farm produce delivered across Accra.",
  "logoUrl": null,
  "status": "ACTIVE",
  "billingCycle": "MONTHLY",
  "billingStartDate": "2024-01-01",
  "createdAt": "2024-01-01T08:00:00",
  "updatedAt": "2024-06-01T10:00:00",
  "momoAccount": {
    "id": 1,
    "accountName": "Kofi Agyemang",
    "phoneNumber": "+233244300101",
    "network": "MTN"
  }
}
```

---

## 10. Enums

### MerchantStatus

| Value              | Meaning                                                       |
|--------------------|---------------------------------------------------------------|
| `PENDING_APPROVAL` | Account created by admin but not yet approved                 |
| `ACTIVE`           | Fully operational — can log in, list products, receive orders |
| `SUSPENDED`        | Temporarily blocked — login returns `403`                     |
| `DEACTIVATED`      | Permanently closed                                            |

---

### MerchantOrderStatus

| Value        | Merchant action                               |
|--------------|-----------------------------------------------|
| `PENDING`    | New order — awaiting merchant acknowledgement |
| `PROCESSING` | Merchant is preparing / fulfilling the order  |
| `COMPLETED`  | Order dispatched or collected                 |
| `CANCELLED`  | Order cancelled by merchant                   |

**Allowed transitions (merchant-side):**

```
PENDING → PROCESSING
PENDING → CANCELLED
PROCESSING → COMPLETED
PROCESSING → CANCELLED
```

---

### MerchantPaymentStatus

| Value     | Meaning                       |
|-----------|-------------------------------|
| `PENDING` | Payment not yet confirmed     |
| `PAID`    | Payment confirmed by merchant |

---

### MerchantPaymentMethod

| Value             | Meaning                                                 |
|-------------------|---------------------------------------------------------|
| `MOBILE_MONEY`    | Buyer pays via MoMo to the merchant's registered number |
| `PAY_ON_DELIVERY` | Buyer pays cash on delivery                             |

---

### MomoNetwork

| Value        | Provider         |
|--------------|------------------|
| `MTN`        | MTN Mobile Money |
| `VODAFONE`   | Vodafone Cash    |
| `AIRTELTIGO` | AirtelTigo Money |

---

### InvoiceStatus

| Value       | Meaning                                 |
|-------------|-----------------------------------------|
| `GENERATED` | Auto-generated by the platform          |
| `SENT`      | Emailed to the merchant                 |
| `PAID`      | Admin has marked the invoice as settled |

---

### BillingCycle (read-only for merchant)

| Value     | Invoice schedule                                                   |
|-----------|--------------------------------------------------------------------|
| `WEEKLY`  | Invoice generated every 7 days from `billingStartDate`             |
| `MONTHLY` | Invoice generated on the same day each month as `billingStartDate` |

---

## 11. Error Responses

All errors return a consistent envelope:

```json
{
  "status": "error",
  "message": "Description of what went wrong",
  "timestamp": "2024-06-20T10:00:00"
}
```

| HTTP Code                   | When it happens                                                                        |
|-----------------------------|----------------------------------------------------------------------------------------|
| `400 Bad Request`           | Validation failure — missing required field, invalid enum value, non-positive quantity |
| `401 Unauthorized`          | No token provided, or token has expired                                                |
| `403 Forbidden`             | Valid token but wrong role, or accessing another merchant's / buyer's resource         |
| `404 Not Found`             | Product, order, or invoice ID does not exist                                           |
| `409 Conflict`              | Duplicate resource (e.g. unique constraint on product name within the same merchant)   |
| `500 Internal Server Error` | Unexpected server failure                                                              |

---

## Quick Reference

### Merchant Dashboard Routes

| Method   | Path                                       | Description                        |
|----------|--------------------------------------------|------------------------------------|
| `POST`   | `/api/v1/merchant/auth/login`              | Login                              |
| `GET`    | `/api/v1/merchant/auth/re-authenticate`    | Refresh token                      |
| `GET`    | `/api/v1/merchant/dashboard`               | Dashboard summary stats            |
| `GET`    | `/api/v1/merchant/dashboard/momo-account`  | Get MoMo account                   |
| `POST`   | `/api/v1/merchant/dashboard/momo-account`  | Create / update MoMo account       |
| `GET`    | `/api/v1/merchant/dashboard/invoices`      | List invoices                      |
| `GET`    | `/api/v1/merchant/dashboard/invoices/{id}` | Invoice detail                     |
| `POST`   | `/api/v1/merchant/products`                | Create product                     |
| `GET`    | `/api/v1/merchant/products`                | List my products                   |
| `GET`    | `/api/v1/merchant/products/{id}`           | Get product                        |
| `PUT`    | `/api/v1/merchant/products/{id}`           | Update product                     |
| `DELETE` | `/api/v1/merchant/products/{id}`           | Delete product                     |
| `GET`    | `/api/v1/merchant/orders`                  | List orders (filterable by status) |
| `GET`    | `/api/v1/merchant/orders/{orderId}`        | Order detail                       |
| `PUT`    | `/api/v1/merchant/orders/{orderId}/status` | Update order status / payment      |

### Buyer / Public Routes

| Method | Path                                     | Auth        | Description                  |
|--------|------------------------------------------|-------------|------------------------------|
| `GET`  | `/api/v1/merchant-products`              | None        | Browse all merchant products |
| `GET`  | `/api/v1/merchant-products/{id}`         | None        | Single product detail        |
| `POST` | `/api/v1/merchant-orders`                | `ROLE_USER` | Place an order               |
| `GET`  | `/api/v1/merchant-orders/user`           | `ROLE_USER` | My orders                    |
| `GET`  | `/api/v1/merchant-orders/user/{orderId}` | `ROLE_USER` | My order detail              |
