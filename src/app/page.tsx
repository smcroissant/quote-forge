import { redirect } from "next/navigation";

export default function Home() {
  // Landing page is at /home
  // Authenticated users get redirected to /dashboard by middleware
  redirect("/home");
}
