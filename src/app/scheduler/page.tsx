import { redirect } from "next/navigation";

export default async function SchedulerPage() {
  // Redirect to dashboard (scheduler's main view)
  redirect("/dashboard");
}
