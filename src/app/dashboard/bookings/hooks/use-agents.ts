import { useQuery } from "@tanstack/react-query";

export interface Agent {
  id: string;
  name: string;
  email: string;
  role: string;
}

export function useAgents() {
  return useQuery({
    queryKey: ["agents"],
    queryFn: async () => {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Failed to fetch agents");
      return res.json() as Promise<Agent[]>;
    },
  });
}
