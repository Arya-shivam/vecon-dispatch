import { redirect } from "next/navigation";
import { today } from "@/lib/domain";
import { connection } from "next/server";
export default async function Home() {
  await connection();
  redirect("/d/" + today());
}
