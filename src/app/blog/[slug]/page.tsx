import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { getAllPosts, getPostBySlug } from "@/lib/blog";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};
  return {
    title: `${post.title} | Etc Tools Blog`,
    description: post.description,
    openGraph: post.image ? { images: [post.image] } : undefined,
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
      <Link
        href="/blog"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Blog
      </Link>

      {post.image && (
        <div className="relative w-full h-56 sm:h-80 rounded-lg overflow-hidden mb-8">
          <Image
            src={post.image}
            alt={post.title}
            fill
            className="object-cover"
            priority
          />
        </div>
      )}

      <h1 className="text-3xl sm:text-4xl font-bold mb-2">{post.title}</h1>
      <p className="text-sm text-muted-foreground mb-8">
        {post.date && format(new Date(post.date), "MMMM d, yyyy")}
        {post.author && ` · ${post.author}`}
      </p>

      <article className="prose prose-neutral dark:prose-invert max-w-none">
        <ReactMarkdown
          components={{
            img: ({ src, alt }) => (
              <span className="block relative w-full h-64 sm:h-96 my-6">
                <Image
                  src={src ?? ""}
                  alt={alt ?? ""}
                  fill
                  className="object-cover rounded-lg"
                />
              </span>
            ),
          }}
        >
          {post.content}
        </ReactMarkdown>
      </article>
    </div>
  );
}
