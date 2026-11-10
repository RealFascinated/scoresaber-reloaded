import { fetchMe } from "@/common/auth/auth-api";
import { useQuery } from "@tanstack/react-query";

export const ME_QUERY_KEY = ["auth", "me"] as const;

/**
 * Gets the signed-in user. `data` is null when nobody is signed in.
 */
export default function useMe() {
  return useQuery({
    queryKey: ME_QUERY_KEY,
    queryFn: fetchMe,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false,
  });
}
