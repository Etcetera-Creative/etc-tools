import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { isPast } from "date-fns";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function RedirectPage({ params }: PageProps) {
  const { slug } = await params;

  // Find the short link
  const link = await prisma.shortLink.findUnique({
    where: { slug },
  });

  // Not found
  if (!link) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-4xl font-bold">404</h1>
          <p className="text-xl text-muted-foreground">
            This short link does not exist.
          </p>
        </div>
      </div>
    );
  }

  // Check expiration
  if (link.expiresAt && isPast(new Date(link.expiresAt))) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-4xl font-bold">Link Expired</h1>
          <p className="text-xl text-muted-foreground">
            This link has expired and is no longer accessible.
          </p>
        </div>
      </div>
    );
  }

  // Record click (async, don't wait)
  const headersList = await headers();
  const referrer = headersList.get("referer") || null;
  const userAgent = headersList.get("user-agent") || null;
  const forwarded = headersList.get("x-forwarded-for");
  const realIp = headersList.get("x-real-ip");
  const ipAddress = forwarded?.split(",")[0] || realIp || null;

  // Fire and forget click recording + increment counter
  prisma.linkClick
    .create({
      data: {
        shortLinkId: link.id,
        referrer,
        userAgent,
        ipAddress,
      },
    })
    .then(() => {
      return prisma.shortLink.update({
        where: { id: link.id },
        data: { clickCount: { increment: 1 } },
      });
    })
    .catch((err) => {
      console.error("Failed to record click:", err);
    });

  // Redirect (302)
  redirect(link.destinationUrl);
}
