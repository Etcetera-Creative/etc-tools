import Link from "next/link";
import Image from "next/image";
import { getAllPosts } from "@/lib/blog";
import { format } from "date-fns";

export const metadata = {
  title: "Blog | Etc Tools",
  description: "Updates and stories from the Etc Tools team.",
};

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
      <div className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">Blog</h1>
        <p className="text-muted-foreground">
          Updates, stories, and behind-the-scenes from Etc&nbsp;Tools.
        </p>
      </div>

      {posts.length === 0 ? (
        <p className="text-muted-foreground">No posts yet. Check back soon!</p>
      ) : (
        <div className="grid gap-8">
          {posts.map((post) => (
            <Link key={post.slug} href={`/blog/${post.slug}`}>
              <article className="group border rounded-lg overflow-hidden hover:border-primary transition-colors">
                {post.image && (
                  <div className="relative w-full h-48 sm:h-64 bg-muted">
                    <Image
                      src={post.image}
                      alt={post.title}
                      fill
                      className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
                    />
                  </div>
                )}
                <div className="p-5 sm:p-6">
                  <h2 className="text-xl sm:text-2xl font-semibold mb-1 group-hover:text-primary transition-colors">
                    {post.title}
                  </h2>
                  <p className="text-sm text-muted-foreground mb-3">
                    {post.date && format(new Date(post.date), "MMMM d, yyyy")}
                    {post.author && ` · ${post.author}`}
                  </p>
                  <p className="text-muted-foreground">{post.description}</p>
                </div>
              </article>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
