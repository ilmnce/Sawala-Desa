import type { UserRole } from "./types";

/** Halaman utama (portal) untuk tiap role. */
export function homePathForRole(role: UserRole): string {
  return role === "admin" ? "/admin" : "/dashboard";
}

/** Apakah sebuah path hanya boleh diakses admin. */
export function isAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}