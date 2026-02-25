import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createServerSupabase } from "@/lib/supabase/server";
import { Calendar, Link as LinkIcon } from "lucide-react";

export default async function Home() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  // Show tools hub if logged in, otherwise show landing
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 sm:p-8">
        <div className="max-w-2xl text-center space-y-6">
          <h1 className="text-5xl font-bold tracking-tight">
            Etc Tools
          </h1>
          <p className="text-xl text-muted-foreground">
            A collection of simple, useful tools to make life easier.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/login">
              <Button size="lg">Get Started</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">Your Tools</h1>
        <p className="text-muted-foreground">
          Choose a tool to get started
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        <Link href="/scheduler">
          <Card className="hover:border-primary transition-colors cursor-pointer h-full">
            <CardHeader>
              <Calendar className="h-8 w-8 mb-2 text-primary" />
              <CardTitle>Scheduler</CardTitle>
              <CardDescription>
                Make scheduling fun things with your friends easier. Create a plan, share the link, and find dates that work for everyone.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="secondary" className="w-full">
                Open Scheduler
              </Button>
            </CardContent>
          </Card>
        </Link>

        <Link href="/shortener">
          <Card className="hover:border-primary transition-colors cursor-pointer h-full">
            <CardHeader>
              <LinkIcon className="h-8 w-8 mb-2 text-primary" />
              <CardTitle>URL Shortener</CardTitle>
              <CardDescription>
                Create short, shareable links with custom slugs and expiration dates. Track clicks and analytics for each link.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="secondary" className="w-full">
                Open URL Shortener
              </Button>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
