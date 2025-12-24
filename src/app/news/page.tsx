import Link from "next/link";
import { NewsPageClient } from "./NewsPageClient";

// Mock news data
export const newsArticles = [
  {
    id: "1",
    slug: "next-gen-processors-2024",
    title: "Next-Gen Processors: What to Expect in 2024",
    excerpt:
      "The semiconductor industry is gearing up for revolutionary changes. Here's what the latest processor architectures will bring.",
    date: "December 18, 2024",
    category: "News",
    type: "image",
    image: "/images/news/processor.jpg",
    views: 1247,
    comments: 23,
  },
  {
    id: "2",
    slug: "ai-powered-gadgets-ces",
    title: "AI-Powered Gadgets Steal the Show at CES",
    excerpt:
      "From smart home devices to wearable tech, artificial intelligence is transforming how we interact with our gadgets.",
    date: "December 15, 2024",
    category: "Events",
    type: "image",
    image: "/images/news/ai-gadgets.jpg",
    views: 892,
    comments: 15,
  },
  {
    id: "3",
    slug: "sustainable-tech-revolution",
    title: "The Sustainable Tech Revolution",
    excerpt:
      "How eco-friendly materials and renewable energy are reshaping the technology industry for a greener future.",
    date: "December 12, 2024",
    category: "Tech",
    type: "video",
    image: "/images/news/sustainable.jpg",
    views: 1532,
    comments: 31,
  },
  {
    id: "4",
    slug: "wireless-audio-evolution",
    title: "Wireless Audio: The Evolution Continues",
    excerpt:
      "From Bluetooth 5.4 to spatial audio, wireless earbuds and headphones are reaching new heights in sound quality.",
    date: "December 10, 2024",
    category: "Audio",
    type: "audio",
    image: "/images/news/wireless-audio.jpg",
    views: 678,
    comments: 12,
  },
  {
    id: "5",
    slug: "smartphone-photography-tips",
    title: "Master Smartphone Photography: Pro Tips & Tricks",
    excerpt:
      "Learn how to take stunning photos with your smartphone using these professional techniques and hidden features.",
    date: "December 8, 2024",
    category: "Guides",
    type: "gallery",
    image: "/images/news/smartphone-photo.jpg",
    views: 2103,
    comments: 47,
  },
  {
    id: "6",
    slug: "gaming-peripherals-roundup",
    title: "2024 Gaming Peripherals Roundup",
    excerpt:
      "We test the best gaming keyboards, mice, and headsets to help you gear up for victory.",
    date: "December 5, 2024",
    category: "Reviews",
    type: "image",
    image: "/images/news/gaming-gear.jpg",
    views: 1876,
    comments: 38,
  },
];

export const metadata = {
  title: "News | Dark Point",
  description: "Latest tech news, reviews, and updates from Dark Point.",
};

export default function NewsPage() {
  return <NewsPageClient articles={newsArticles} />;
}
