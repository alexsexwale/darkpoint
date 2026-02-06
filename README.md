# 🎮 Darkpoint

> Your ultimate destination for cutting-edge gaming gear, high-performance tech, and exclusive merchandise.

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38B2AC?style=flat-square&logo=tailwind-css)
![Framer Motion](https://img.shields.io/badge/Framer_Motion-Animations-ff69b4?style=flat-square)

## ✨ Features

### 🛒 E-Commerce
- **Product Catalog** - Gaming gear, tech gadgets, accessories, and wearables
- **CJ Dropshipping Integration** - Real-time product sync with supplier
- **Shopping Cart** - Persistent cart with quantity management
- **Wishlist** - Save items for later
- **Checkout Flow** - Complete payment process with success/failure states
- **Order Tracking** - Track orders without an account
- **Returns & Refunds** - Easy return request system

### 🎮 Retro Game Arcade
- **Browser-Based Emulation** - Play classic games directly in your browser
- **12+ Consoles Supported**:
  - PlayStation 1, PSP, PS2 (experimental)
  - Nintendo NES, SNES, N64, Game Boy, GBC, GBA
  - Sega Master System, Genesis/Mega Drive, Game Gear
- **ROM Library** - Search and download PlayStation/PSP ROMs
- **Save States** - Save your progress anywhere

### 🏆 Gamification System
- **XP & Leveling** - Earn XP for purchases, reviews, and engagement
- **Achievements** - Unlock badges for various activities
- **Daily Rewards** - Login streaks with bonus rewards
- **Spin Wheel** - Win discounts, XP, and prizes
- **Referral Program** - Earn rewards for inviting friends
- **Rewards Shop** - Redeem XP for exclusive items

### 🎨 Design & UX
- **Dark Gaming Theme** - Immersive dark UI with fire/gaming aesthetics
- **Responsive Design** - Optimized for all devices
- **Smooth Animations** - Framer Motion powered transitions
- **Background Music** - Ambient audio with mute controls
- **Preloader** - Branded loading experience

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm, yarn, or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/darkpoint.git

# Navigate to the project
cd darkpoint

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
```

### Environment Variables

Create a `.env.local` file with the following:

```env
# CJ Dropshipping API (for product sync)
CJ_EMAIL=your-cj-email
CJ_API_KEY=your-cj-api-key

# Supabase (for gamification features)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Resend (for transactional email: order confirmations, password reset, contact form, etc.)
RESEND_API_KEY=re_xxxx
# Optional: sender address (default: support@darkpoint.co.za)
RESEND_FROM_EMAIL=support@darkpoint.co.za
```

### Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint
```

Open [http://localhost:3000](http://localhost:3000) to view the site.

## 📁 Project Structure

```
darkpoint/
├── public/
│   ├── audio/          # Background music tracks
│   ├── fonts/          # Custom fonts
│   └── images/         # Static images
├── src/
│   ├── app/            # Next.js App Router pages
│   │   ├── (emulator)/ # PS2 emulator route group
│   │   ├── account/    # User account pages
│   │   ├── api/        # API routes
│   │   ├── cart/       # Shopping cart
│   │   ├── checkout/   # Checkout flow
│   │   ├── games/      # Retro arcade
│   │   ├── store/      # Product listings
│   │   └── ...
│   ├── components/
│   │   ├── effects/    # Visual effects (preloader, audio)
│   │   ├── games/      # Emulator components
│   │   ├── gamification/ # XP, achievements, rewards
│   │   ├── layout/     # Navbar, footer, etc.
│   │   ├── store/      # Product components
│   │   └── ui/         # Reusable UI components
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # Utility functions & API clients
│   ├── stores/         # Zustand state stores
│   ├── styles/         # Global styles & SCSS
│   └── types/          # TypeScript type definitions
└── supabase/           # Database migrations
```

## 🛠 Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS 4, SCSS |
| Animations | Framer Motion |
| State Management | Zustand |
| Database | Supabase (PostgreSQL) |
| Product API | CJ Dropshipping |
| Emulation | EmulatorJS |
| Audio | Howler.js |

## 📱 Pages

| Page | Description |
|------|-------------|
| `/` | Homepage with featured products & categories |
| `/store` | Product catalog with filters |
| `/product/[slug]` | Product detail page |
| `/cart` | Shopping cart |
| `/checkout` | Checkout process |
| `/games` | Retro game arcade |
| `/games/ps2` | PlayStation 2 emulator |
| `/rewards` | Gamification hub |
| `/rewards/spin` | Spin wheel game |
| `/rewards/shop` | XP rewards shop |
| `/account` | User dashboard |
| `/track-order` | Order tracking |
| `/return-request` | Return requests |

## 🎨 Design Credits

- Template inspired by [Godlike - Gaming Theme](https://themeforest.net)
- Icons from [Heroicons](https://heroicons.com)
- Fonts: Custom gaming typography

## 📄 License

This project is proprietary. All rights reserved.

## 🤝 Contributing

This is a private project. Please contact the owner for contribution guidelines.

---

<p align="center">
  <strong>Darkpoint</strong> - Level up your gaming experience 🎮
</p>
