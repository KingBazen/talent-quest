import { redirect } from "next/navigation";

// Permanent redirect: /how-it-works was the pre-rebrand route. Kept here so
// existing links and search results land somewhere sensible until they're
// updated. Safe to delete once the rebrand has been live for a season.
export default function HowItWorksRedirect() {
  redirect("/auditions");
}
