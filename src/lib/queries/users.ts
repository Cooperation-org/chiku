import { useQuery } from "@tanstack/react-query"
import { qk } from "@/lib/query"
import { getMe, type Me } from "@/lib/api/users"

/** The signed-in user, authoritatively from the API (GET /users/me). */
export function useMe() {
  return useQuery({
    queryKey: qk.me,
    queryFn: getMe,
    staleTime: 60_000,
  })
}

export type { Me }
