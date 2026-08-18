import { redirect } from "next/navigation";
import { initialSetupHasRegisteredUser } from "@/lib/initial-setup";

export default async function SignupPage() {
  redirect(
    (await initialSetupHasRegisteredUser()) ? "/login" : "/setup/account",
  );
}
