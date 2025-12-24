import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticlePageClient } from "./ArticlePageClient";

// Mock news data - in a real app, this would come from a database or CMS
const newsArticles = [
  {
    id: "1",
    slug: "next-gen-processors-2024",
    title: "Next-Gen Processors: What to Expect in 2024",
    excerpt:
      "The semiconductor industry is gearing up for revolutionary changes. Here's what the latest processor architectures will bring.",
    date: "December 18, 2024",
    category: "News",
    author: "Tech Team",
    type: "image",
    image: "/images/news/processor.jpg",
    views: 1247,
    comments: 4,
    likes: 89,
    content: `
      <p>Were you seas fruitful seas under were deep that he every replenish grass creepeth to under saw own stars night you're cattle gathering gathered which fish seasons female there said, seas sea. Gathered, deep green, fifth the saying moving give, set don't day she'd seasons image. Given it doesn't midst first over, abundantly seed appear fish. Great two a yielding brought. Rule living rule called divide deep fruitful, herb fly unto said to created form brought whales living wherein. Deep have man fill creeping you'll replenish you'll beast dry meat. Firmament fly, divided in their have created deep.</p>
      
      <blockquote>
        <p>Creature dry face appear it had gathered earth seasons blessed Don't. Give created green the fish deep abundantly forth under is dominion Second signs cattle signs good after tree light. Creepeth that man midst multiply living abundantly moved void yielding.</p>
        <footer>Ben Rodriguez</footer>
      </blockquote>
      
      <p>Heaven also rule it land earth also creepeth man. Green. Them. Kind sea there they're unto them fly lesser can't there two spirit give gathered seas above had fly. Very firmament fly hath waters beginning lesser. Cattle void signs heaven subdue third herb moving upon open. Dry divided, shall, good his hath day creepeth saw one. Set together sea likeness seed fish so. Greater fifth moved bearing.</p>
      
      <p>Gathering him. Open own, gathering abundantly seed said created make it creepeth green don't midst let herb together, moved isn't subdue years without blessed days open our fly after appear gathered second signs fourth they're signs morning appear. There can't two let. Female land tree spirit living brought god. Fowl Second. Great divided. Kind, evening lights under bring whales hath of, abundantly won't one day multiply isn't fly make may had subdue firmament were you're day. Man seasons sixth face winged. God meat rule together tree.</p>
    `,
    tags: ["Image", "Demonstrate", "Tags"],
  },
  {
    id: "2",
    slug: "ai-powered-gadgets-ces",
    title: "AI-Powered Gadgets Steal the Show at CES",
    excerpt:
      "From smart home devices to wearable tech, artificial intelligence is transforming how we interact with our gadgets.",
    date: "December 15, 2024",
    category: "Events",
    author: "Event Coverage",
    type: "image",
    image: "/images/news/ai-gadgets.jpg",
    views: 892,
    comments: 15,
    likes: 67,
    content: `
      <p>CES 2024 has been nothing short of spectacular, with AI-powered innovations dominating every corner of the show floor.</p>
    `,
    tags: ["CES", "AI", "Gadgets", "Smart Home"],
  },
];

// Recent posts for sidebar
const recentPosts = [
  {
    slug: "next-gen-processors-2024",
    title: "Image Blog Post",
    date: "September 18, 2016",
    image: "/images/news/post-1.jpg",
  },
  {
    slug: "ai-powered-gadgets-ces",
    title: "Video Blog Post",
    date: "September 5, 2016",
    image: "/images/news/post-2.jpg",
  },
  {
    slug: "sustainable-tech-revolution",
    title: "Blockquote Blog Post",
    date: "August 27, 2016",
    image: "/images/news/post-3.jpg",
  },
];

const categories = ["Business", "Live News", "Lifestyle"];
const tags = ["Creative", "Responsive", "Design", "Bootstrap", "Multi-Concept"];

// Comments
const comments = [
  {
    id: "1",
    author: "Kurt Tucker",
    avatar: "/images/avatars/avatar-1.jpg",
    date: "20 September, 2017",
    content:
      "Of. Lesser it good moved tree under living male under day The evening. Waters creeping gathered give also grass beginning.",
    likes: 14,
  },
  {
    id: "2",
    author: "Lesa Cruz",
    avatar: "/images/avatars/avatar-2.jpg",
    date: "20 September, 2017",
    content:
      "Fourth give grass creature. Whose fowl. His which male which yielding fly won't creature after beast male. Itself. Life heaven whales over given fly whales lesser, day winged one after.",
    likes: 3,
  },
  {
    id: "3",
    author: "Katie Anderson",
    avatar: "/images/avatars/avatar-3.jpg",
    date: "21 September, 2017",
    content:
      "Given signs fifth female air and second face earth one is. Whose greater behold had after he whales forth cattle Thing said kind after his.",
    subContent:
      "Male upon thing had us hath doesn't great male fifth us. Every whales own given open upon divided life i which blessed subdue moving give.",
    likes: 0,
  },
];

interface ArticlePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ArticlePageProps) {
  const { slug } = await params;
  const article = newsArticles.find((a) => a.slug === slug);

  if (!article) {
    return { title: "Article Not Found | Dark Point" };
  }

  return {
    title: `${article.title} | Dark Point`,
    description: article.excerpt,
  };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const article = newsArticles.find((a) => a.slug === slug);

  if (!article) {
    notFound();
  }

  return (
    <ArticlePageClient
      article={article}
      recentPosts={recentPosts}
      categories={categories}
      tags={tags}
      comments={comments}
    />
  );
}
