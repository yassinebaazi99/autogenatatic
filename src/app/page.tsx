import { redirect } from "next/navigation";

// Nivara's front door is the Brand Knowledge Base — everything else
// (static ads, landers) depends on the brand context being filled in first.
export default function Home() {
  redirect("/brand");
}
