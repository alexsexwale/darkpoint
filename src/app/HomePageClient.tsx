"use client";

import Link from "next/link";
import { ProductGrid } from "@/components/store";
import { Button, ProductGridSkeleton, CategoryBannerSkeleton } from "@/components/ui";
import { SITE_NAME } from "@/lib/constants";
import { useProducts } from "@/hooks";

export function HomePageClient() {
  // Fetch featured products
  const { products: featuredProducts, loading: featuredLoading } = useProducts({
    featured: true,
    limit: 3,
  });

  // Fetch latest products
  const { products: latestProducts, loading: latestLoading } = useProducts({
    sortBy: "newest",
    limit: 6,
  });

  return (
    <div>
      {/* Hero Section */}
      <section className="relative min-h-[60vh] flex items-center justify-center overflow-hidden">
        <div className="container relative z-10 text-center py-20">
          <h1 className="text-5xl md:text-7xl mb-6 leading-tight">
            Welcome to
            <br />
            <span className="text-[var(--color-main-1)]">{SITE_NAME}</span>
          </h1>
          <p className="text-xl text-[var(--muted-foreground)] max-w-2xl mx-auto mb-8">
            Your ultimate destination for gaming gear, tech gadgets, hardware, and
            exclusive merchandise. Level up your setup with premium products.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/store">
              <Button variant="primary" size="lg">
                Shop Now
              </Button>
            </Link>
            <Link href="/store?category=gaming">
              <Button variant="outline" size="lg">
                Gaming Gear
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl mb-4">Featured Products</h2>
            <p className="text-[var(--muted-foreground)]">
              Our handpicked selection of the best gaming and tech gear
            </p>
          </div>
          {featuredLoading ? (
            <ProductGridSkeleton count={3} columns={3} />
          ) : featuredProducts.length > 0 ? (
            <ProductGrid products={featuredProducts} columns={3} />
          ) : (
            <div className="text-center py-12 bg-[var(--color-dark-2)] border border-[var(--color-dark-3)]">
              <svg className="w-12 h-12 mx-auto text-[var(--color-main-1)]/50 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-[var(--muted-foreground)] mb-2">Configure API to load products</p>
              <p className="text-sm text-white/60">Add CJ Dropshipping credentials to .env.local</p>
            </div>
          )}
        </div>
      </section>

      {/* Categories Banner */}
      <section className="py-16 bg-[var(--color-dark-2)]">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl mb-4">Shop by Category</h2>
            <p className="text-[var(--muted-foreground)]">
              Find exactly what you need for your gaming setup
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {latestLoading ? (
              <>
                <CategoryBannerSkeleton />
                <CategoryBannerSkeleton />
                <CategoryBannerSkeleton />
                <CategoryBannerSkeleton />
              </>
            ) : (
              <>
                <Link
                  href="/store?category=gaming"
                  className="group relative aspect-square overflow-hidden bg-[var(--color-dark-3)] border border-[var(--color-dark-4)] hover:border-[var(--color-main-1)] transition-colors"
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg className="w-24 h-24 text-[var(--color-main-1)]/50 transition-transform duration-500 group-hover:scale-110" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-10 7H8v3H6v-3H3v-2h3V8h2v3h3v2zm4.5 2c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm4-3c-.83 0-1.5-.67-1.5-1.5S18.67 9 19.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
                    </svg>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <h3 className="text-xl font-heading text-[var(--color-main-1)]">Gaming Gear</h3>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      Controllers, Headsets & More
                    </p>
                  </div>
                </Link>

                <Link
                  href="/store?category=hardware"
                  className="group relative aspect-square overflow-hidden bg-[var(--color-dark-3)] border border-[var(--color-dark-4)] hover:border-[var(--color-main-1)] transition-colors"
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg className="w-24 h-24 text-[var(--color-main-1)]/50 transition-transform duration-500 group-hover:scale-110" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z" />
                    </svg>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <h3 className="text-xl font-heading text-[var(--color-main-1)]">Hardware</h3>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      Components & Upgrades
                    </p>
                  </div>
                </Link>

                <Link
                  href="/store?category=audio"
                  className="group relative aspect-square overflow-hidden bg-[var(--color-dark-3)] border border-[var(--color-dark-4)] hover:border-[var(--color-main-1)] transition-colors"
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg className="w-24 h-24 text-[var(--color-main-1)]/50 transition-transform duration-500 group-hover:scale-110" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 1c-4.97 0-9 4.03-9 9v7c0 1.66 1.34 3 3 3h3v-8H5v-2c0-3.87 3.13-7 7-7s7 3.13 7 7v2h-4v8h3c1.66 0 3-1.34 3-3v-7c0-4.97-4.03-9-9-9z" />
                    </svg>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <h3 className="text-xl font-heading text-[var(--color-main-1)]">Audio</h3>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      Headsets, Speakers & Mics
                    </p>
                  </div>
                </Link>

                <Link
                  href="/store?category=merchandise"
                  className="group relative aspect-square overflow-hidden bg-[var(--color-dark-3)] border border-[var(--color-dark-4)] hover:border-[var(--color-main-1)] transition-colors"
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg className="w-24 h-24 text-[var(--color-main-1)]/50 transition-transform duration-500 group-hover:scale-110" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.5 3H6c-1.1 0-2 .9-2 2v5.5c0 3.82 3.1 7.14 6.74 7.64L10 22h4l-.74-3.86C16.9 17.64 20 14.32 20 10.5V5c0-1.1-.9-2-2-2h-.5zM12 13c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z" />
                    </svg>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <h3 className="text-xl font-heading text-[var(--color-main-1)]">Merchandise</h3>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      Apparel, Collectibles & More
                    </p>
                  </div>
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-16">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl mb-4">Why Gamers Choose Us</h2>
            <p className="text-[var(--muted-foreground)]">
              We understand what makes a great gaming experience
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-[var(--color-main-1)]/20 rounded-lg flex items-center justify-center">
                <svg className="w-8 h-8 text-[var(--color-main-1)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-heading mb-2">Premium Quality</h3>
              <p className="text-[var(--muted-foreground)]">
                Only the best gaming gear and tech products make it to our store.
              </p>
            </div>

            <div className="text-center p-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-[var(--color-main-1)]/20 rounded-lg flex items-center justify-center">
                <svg className="w-8 h-8 text-[var(--color-main-1)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-heading mb-2">Fast Shipping</h3>
              <p className="text-[var(--muted-foreground)]">
                Get your gear quickly with our efficient delivery network across South Africa.
              </p>
            </div>

            <div className="text-center p-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-[var(--color-main-1)]/20 rounded-lg flex items-center justify-center">
                <svg className="w-8 h-8 text-[var(--color-main-1)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-heading mb-2">Gamer Support</h3>
              <p className="text-[var(--muted-foreground)]">
                Our team of gamers is here to help you find the perfect setup.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* All Products Preview */}
      <section className="py-16 bg-[var(--color-dark-2)]">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl mb-4">Latest Products</h2>
            <p className="text-[var(--muted-foreground)]">
              Check out our newest arrivals
            </p>
          </div>
          {latestLoading ? (
            <ProductGridSkeleton count={6} columns={3} />
          ) : latestProducts.length > 0 ? (
            <ProductGrid products={latestProducts} columns={3} />
          ) : (
            <div className="text-center py-12 bg-[var(--color-dark-3)] border border-[var(--color-dark-4)]">
              <svg className="w-12 h-12 mx-auto text-[var(--color-main-1)]/50 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-[var(--muted-foreground)] mb-2">Configure API to load products</p>
              <p className="text-sm text-white/60">Add CJ Dropshipping credentials to .env.local</p>
            </div>
          )}
          <div className="text-center mt-12">
            <Link href="/store">
              <Button variant="outline" size="lg">
                View All Products
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Newsletter Section - Godlike Style */}
      <section className="py-16 pb-32">
        <div className="container max-w-lg text-center">
          <h2 className="text-2xl font-heading uppercase tracking-wider mb-4">Join the Squad</h2>
          <p className="text-[var(--muted-foreground)] mb-8">
            Get first access to new drops, exclusive deals, and insider updates. 
            No spam, just the good stuff.
          </p>
          <form className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 items-stretch">
              <input
                type="email"
                placeholder="Email *"
                className="nk-form-control flex-1"
                required
              />
              <Button variant="outline" className="sm:flex-shrink-0">
                Subscribe
              </Button>
            </div>
            <p className="text-sm text-[var(--muted-foreground)]">
              We&apos;ll never share your email with anyone else.
            </p>
          </form>
        </div>
      </section>
    </div>
  );
}

