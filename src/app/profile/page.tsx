import { redirect } from "next/navigation";

// Pre-rebrand route. Lives here so cookies and external links land at the
// new dashboard URL. Safe to delete once links and bookmarks have rolled
// over (a season after the rebrand).
export default function ProfileRedirect() {
  redirect("/contestant/dashboard");
}
