import { auth } from "@/lib/auth/server";

/** Admin-only routes. Daily jobs + reports stay public (no login). */
export default auth.middleware({
  loginUrl: "/login",
});

export const config = {
  matcher: [
    "/jobs",
    "/customers",
    "/products",
    "/origins",
    "/destinations",
    "/trucks",
  ],
};
