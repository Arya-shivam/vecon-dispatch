import Link from "next/link";
import { logout } from "@/app/actions";
import { getAccess } from "@/lib/auth";
import { demoMode } from "@/lib/store";
import { NotifyToggle } from "@/components/notify-toggle";
export default async function Settings() {
  const access = await getAccess();
  return (
    <>
      <p className="eyebrow">Workspace</p>
      <h1>Settings</h1>
      <section className="panel settings">
        <h2>Install on your phone</h2>
        <p>
          On iPhone, open this site in Safari, tap Share, then Add to Home
          Screen.
        </p>
        <p>
          On Android, open the Chrome menu and choose Install app or Add to Home
          screen.
        </p>
      </section>
      <section className="panel settings">
        <h2>Notifications</h2>
        <NotifyToggle />
      </section>
      <section className="panel settings">
        <h2>Connection and data</h2>
        <p>
          This app needs an internet connection to load jobs and save trip
          updates. If you lose connection, reconnect before trying again.
        </p>
        <p>Dispatch dates use Thailand time.</p>
        <p>
          {demoMode
            ? "Demo mode. Sample records are stored on this computer."
            : "Connected workspace. Records are stored in your PostgreSQL database."}
        </p>
      </section>
      <section className="panel settings">
        <h2>VECON Construction</h2>
        <p>Dispatch · Version 0.1.0</p>
        <p>
          Anyone can view daily jobs without signing in. Admins sign in to
          create, edit, and delete jobs, trucks, and masters.
        </p>
        {!demoMode && access.guest && (
          <p>
            <Link className="primary" href="/login">
              Admin sign in
            </Link>
          </p>
        )}
        {!demoMode && !access.guest && (
          <form action={logout}>
            <button className="secondary">Sign out</button>
          </form>
        )}
      </section>
    </>
  );
}
