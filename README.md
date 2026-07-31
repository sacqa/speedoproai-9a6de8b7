# Speedo Express

You are a senior full-stack engineer.

Do not explain anything. Do not summarize. Start coding immediately. Generate real files and working code.

Build a complete production-ready PWA (Progressive Web App), backend system, and admin dashboard called:

SPEEDO

================================================== PWA REQUIREMENTS (CRITICAL)

Build as a PWA, NOT React Native.

PWA must:

Work as a website on desktop (full browser layout)

Work as an app on mobile (app-like layout, bottom nav, no browser chrome feel)

Be installable on Android and iOS via "Add to Home Screen"

Include manifest.json with correct icons, theme_color, display: standalone

Include service worker for offline caching of shell and static assets

Use responsive CSS breakpoints: Desktop: min-width 1024px → website layout (header nav, sidebar) Mobile: max-width 1023px → app layout (bottom nav, full screen cards)

On mobile, remove all horizontal padding waste, use full-width cards

On desktop, show sidebar navigation and content area side by side

Tech stack for PWA:

React (Vite)

React Router DOM

Tailwind CSS

PWA via vite-plugin-pwa

Axios for API calls

================================================== UI DESIGN SYSTEM (MANDATORY — PIXEL PERFECT)

Reference design: Almeera.qa and Wafa grocery app (Qatar)

COLOR PALETTE:

Primary brand: #6C3FC5 (purple — Speedo brand color)

Primary dark: #4A2A8C

Accent green: #22C55E

Background: #F5F5F5

Card background: #FFFFFF

Text primary: #1A1A1A

Text secondary: #6B7280

Border: #E5E7EB

Success: #16A34A

Warning: #F59E0B

Danger: #DC2626

TYPOGRAPHY:

Font: Inter (Google Fonts)

Headings: 600-700 weight

Body: 400-500 weight

Small/caption: 12px

COMPONENT STYLE:

Border radius: 12px for cards, 8px for buttons, 50px for pills

Shadows: soft shadows only (0 2px 8px rgba(0,0,0,0.08))

Buttons: filled primary = purple, outlined = white with purple border

Input fields: white bg, gray border, 12px radius, 16px padding

================================================== DESKTOP LAYOUT (min-width: 1024px)

Header bar (fixed top, white, shadow):

Left: Speedo logo + location selector dropdown ("Delivering to: Dipalpur")

Center: Search bar (full width, rounded, gray bg)

Right: Notification bell + Cart icon with badge + Login/Avatar

Left sidebar (fixed, 240px wide):

Navigation links: Home, SpeedMart, Pharmacy, SpeedSend, Custom Orders, Orders, Profile

Main content area (fluid, left margin 240px):

Full scrollable content

Max-width 1280px centered

24px padding horizontal

Homepage desktop sections (in order):

Hero banner slider (full width, 400px height, auto-sliding, with dots + arrows)

Delivery type selector (Instant Delivery vs Scheduled Delivery tabs — like Almeera)

Categories horizontal scroll row (circular icons with labels, "View All" link)

Browse by Brands row (brand logos in horizontal scroll)

Featured Products grid (4 columns, product cards)

Daily Essentials section (sub-category cards: Dairy, Bakery, Snacks, Beverages)

Promotional banner (full-width image banner)

More product sections (Fruits & Vegetables, Meat & Chicken with "View All")

Footer (desktop only):

Logo + tagline

Navigation links (About, Contact, Privacy Policy, Terms)

App download buttons (App Store, Google Play placeholders)

Social links

Copyright

================================================== MOBILE LAYOUT (max-width: 1023px)

Top bar (fixed, white, shadow):

Left: Hamburger menu + "Delivering to" with location pin icon + dropdown arrow

Right: 3-bar menu icon (≡)

Store status banner (thin top strip):

"Our store is closed now, will reopen at 08:00 AM"

Scrolling marquee if multiple messages

Search bar (below top bar, full width with rounded gray input, search icon left):

Placeholder: "Search for Fresh Food"

Delivery mode selector (two buttons side by side):

Left pill: ⚡ Instant Delivery / In 40 Mins (white bg, gray border)

Right pill: 📅 Scheduled Delivery / Today 8:00am–10:00am (dark green bg, white text)

Main hero banner slider (full width, 180px height, swipeable):

Auto-advance every 4s

Bottom dots indicator

Next/Prev arrow buttons (rounded white buttons)

Sub-banners row (horizontal scroll, 2 visible):

Two image banners side by side

Each with text overlay and CTA button (e.g., "Grocery Essentials", "Order Now")

Bottom page dots indicator

Categories section:

Section title "Categories" (bold, left) + "View All" button (right) + arrow buttons

Horizontal scroll row of category circles: Each circle: circular image (80px), label below (12px, center) Categories: Fruit & Veg, Poultry Meat & Seafood, Beverages, Snacks & Chocolate, Frozen Food, Coffee & Tea, Condiments, Bakery, Dairy & Eggs, Milk, Ice Cream, Deli, Ready to Eat, Cooking & B...

Scroll with arrows left/right

Product cards (in all sections):

White card, 12px radius, soft shadow

Product image (top, 120px height, contain)

Product name (14px, semibold, 2 lines max)

Price (16px, purple, bold)

"+" add button (round, purple, bottom right)

Optional: unit label (e.g., "per kg"), stock badge

Bottom navigation bar (mobile only, fixed bottom):

5 tabs: Home (house icon), Search (magnifier), [Center brand button — round purple], Cart (cart icon + badge), Login/Profile (person icon)

Center button: large round purple circle with Speedo "S" logo or lightning bolt

Active tab: purple icon + purple label

Inactive tab: gray icon + gray label

================================================== SpeedMART SCREEN (MOBILE)

Full-screen product browser:

Top: Category filter chips (horizontal scroll pills) Below: Search input (in-screen, not global) Product grid: 2 columns (mobile), 4 columns (desktop) Each product card: image, name, price, +/- quantity selector, Add button Pagination: "View More" button loads 4 more items each click Show 12 initially

================================================== SERVICE SHORTCUTS (HOME SCREEN)

Four service cards in 2x2 grid (mobile) or horizontal row (desktop):

SpeedMart — 🛒 icon, "Groceries & Essentials"

Pharmacy — 💊 icon, "Medicines & Health"

SpeedSend — 📦 icon, "Send a Parcel"

Custom — ✏️ icon, "Any Custom Request"

Each card: colored icon bg (purple tint), bold label, small description, arrow icon

================================================== ORDER TRACKING SCREEN

Timeline view (vertical stepper): Each step: colored circle (filled = done, outline = pending) + label + timestamp Steps match the order status flow

Payment status chip displayed prominently Rider info card if assigned (name, phone, vehicle) Call rider button

================================================== APP OVERVIEW

Speedo is a hyperlocal purchase + delivery service in Dipalpur, Pakistan.

This is NOT a marketplace. Customers do not browse independent sellers. Customers place requests. Speedo purchases the items and delivers them.

Payment model: No Cash on Delivery. Only digital payment is allowed.

Supported payments:

JazzCash

EasyPaisa

Bank Transfer

Primary final goal: After order creation, redirect user to WhatsApp with prefilled order summary. WhatsApp flow must remain intact and must happen only after backend save.

Official WhatsApp number: +923337339009

================================================== USER ROLES

Customer

Admin

Implement strict role-based authentication and authorization.

================================================== CORE FEATURES

CUSTOMER:

Signup/Login

OTP based auth flow

Create orders

Upload prescription where required

Upload payment proof

Track order status

Order history

Reorder previous order

Saved addresses

In-app notifications for order status changes

WhatsApp confirmation redirect after order creation

Search products in SpeedMart

Filter products by category and price

Recent orders and quick reorder on home screen

Promo banner on home screen

Support/help section

Profile management

ADMIN:

Dashboard

View and manage all orders

Approve/reject payments manually

Assign riders

Set/update pricing rules

View analytics

Manage categories and sample products

Manage promotional banners

Activate/deactivate products

View customers and riders

View payment proofs and review notes

================================================== ORDER TYPES

SpeedMart

Pharmacy

SpeedSend

Custom Orders

================================================== ORDER STATUS FLOW

Submitted Waiting for Estimate Awaiting Payment Payment Under Review Payment Verified Rider Assigned Purchasing Items Out for Delivery Delivered Cancelled

================================================== PAYMENT SYSTEM

User uploads payment screenshot

User enters transaction ID

Admin verifies payment manually

No order moves forward until payment is approved

Payment proof is mandatory before processing

No COD in any case

================================================== WHATSAPP INTEGRATION

After order creation:

Save the order in backend first

Generate a WhatsApp message with order summary

Redirect user to:

https://wa.me/923337339009?text=<encoded_order_details>

The message should include:

Order number

Order type

Customer name

Customer phone

Items summary

Delivery address

Payment method

Total estimated charges if available

================================================== TECH STACK

BACKEND:

Node.js

Express

PostgreSQL

Prisma ORM

FRONTEND PWA:

React (Vite)

React Router DOM

Tailwind CSS

vite-plugin-pwa (manifest + service worker)

Axios

ADMIN WEB:

React web app (same repo, /admin route or separate build)

================================================== PHASE ORDER

PHASE 1: Backend (Node.js + Express + PostgreSQL + Prisma) PHASE 2: PWA frontend (React + Vite + Tailwind) PHASE 3: Admin dashboard

================================================== BACKEND REQUIREMENTS

Build a production-ready backend first.

Include:

Express server setup

PostgreSQL connection

Prisma schema

JWT authentication

OTP-ready auth structure

Role-based middleware

Validation middleware

File upload system (multer, local storage)

Error handling

Clean modular folder structure

Environment config (.env)

Seed data

Static file serving for uploaded files

Notification creation logic

Pricing calculator utilities

WhatsApp message generator utility

================================================== DATABASE MODELS

User, Address, Category, Product, Order, OrderItem, OrderStatusLog, SpeedSendDetails, CustomOrderDetails, Banner, Notification, PricingRule

================================================== SpeedMART SECTION

Full product catalog browsing experience. Add 50 sample grocery products in seed data.

================================================== PHARMACY SECTION

Allow prescription image upload. Customer describes medicines needed. Admin reviews and provides estimate.

================================================== SpeedSEND SECTION

Sender name, phone, receiver name, phone, address, package type, weight, fragile flag.

================================================== CUSTOM ORDER SECTION

Free-text description, optional budget, optional attachments.

================================================== FINAL CHECKOUT SCREEN

Address selection, payment method selection, order summary, place order button.

================================================== PAYMENT INSTRUCTION FLOW

Show payment account details (JazzCash/EasyPaisa/Bank). User makes payment externally. User uploads screenshot + enters transaction ID. Admin approves or rejects.

================================================== API REQUIREMENTS

Auth: register, login, verify-otp, refresh-token, logout Users: profile, update profile, saved addresses CRUD Products: list, search, filter, single product Orders: create, list, single, cancel, reorder, upload payment proof, upload prescription Admin: all orders, update status, assign rider, approve/reject payment, manage products, manage categories, manage banners, manage pricing rules, analytics Notifications: list, mark read

================================================== VALIDATION RULES

Phone: Pakistani format (03xxxxxxxxx) All required fields validated File type and size validation for uploads (images only, max 5MB)

================================================== BUSINESS RULES

No COD. Payment proof required before processing. WhatsApp redirect only after backend save. Customers cannot modify orders after submission. Admin controls all status transitions.

================================================== FILE UPLOAD

Multer, local storage, static serving via Express. Folders: payment-proofs, order-images, banners, avatars.

================================================== BACKEND CODE STRUCTURE

/src /controllers /routes /middleware /utils /validators /uploads /prisma schema.prisma seed.js .env package.json

================================================== PWA SCREEN LIST

CUSTOMER SCREENS:

Splash Screen (animated logo, auto-redirect after 2s)

Onboarding (swipeable slides x3, skip button)

Login Screen

OTP Verification Screen

Home Screen (Almeera/Wafa style)

Search Screen (live search with recent + suggestions)

SpeedMart Screen (category filter + product grid)

Pharmacy Screen

SpeedSend Screen

Custom Order Screen

Checkout Screen

Payment Proof Upload Screen

Order Confirmation Screen (success animation + WhatsApp CTA)

Order Details Screen

Order Tracking Screen (timeline stepper)

Notifications Screen

Order History Screen

Saved Addresses Screen

Profile Screen

Help and Support Screen

================================================== NOTIFICATIONS

In-app notifications created on every order status change. Notification includes: title, message, order reference, timestamp, read/unread state.

================================================== ADMIN WEB DASHBOARD

Dashboard with stats cards (total orders, pending, revenue, customers)

Orders table with filters and status update

Payment proofs viewer with approve/reject

Products manager (add, edit, toggle active)

Categories manager

Banners manager

Customers list

Pricing rules manager

Analytics charts (orders by type, revenue over time)

================================================== SEED DATA

1 Admin user

1 Test customer

14 categories

50 grocery products

3 banners

Default pricing rules (delivery fee, service charge)

================================================== UI RULES (FINAL)

Primary color: #6C3FC5 (purple)

Font: Inter

Desktop = website layout (header + sidebar)

Mobile = app layout (bottom nav, full screen)

PWA installable

No cluttered screens

Reusable components

Almeera.qa / Wafa app visual style

Clean spacing, modern cards, circular category icons

Animated banner sliders

Product grid with quantity selectors

Bottom nav on mobile with center brand button

================================================== IMPORTANT RULES

Do NOT rewrite requirements

Do NOT explain anything

Do NOT summarize anything

Do NOT skip any module

Build step by step

Start with backend first

Generate real working code

Save order before WhatsApp redirect

Keep WhatsApp flow at the end of order process

PWA must work on both desktop (web) and mobile (app)

Start with backend now.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://speedoproai.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/bf298262-6740-4858-bad6-0478c8c580d1).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
