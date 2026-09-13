import { handlers } from "@/auth";

// Mounts the ready-made handlers at /api/auth/*, where the callback URLs point.
export const { GET, POST } = handlers;
