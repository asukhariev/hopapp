import { redirect } from "next/navigation";

// The console is retired — the main dashboard lives at the root now.
export default function ConsolePage() {
  redirect("/");
}
