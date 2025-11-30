"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { Phone, Mail, MessageCircle, Users, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import { useInteractions, useCreateInteraction } from "../hooks/use-interactions";
import { toast } from "sonner";

interface CustomerInteractionsProps {
  customerId: string;
}

export function CustomerInteractions({ customerId }: CustomerInteractionsProps) {
  const [page, setPage] = useState(1);
  const pageSize = 3;
  const [content, setContent] = useState("");
  const [type, setType] = useState("CALL");

  const { data: interactionsResponse, isLoading, error } = useInteractions(customerId, page, pageSize);
  const createInteractionMutation = useCreateInteraction();

  const interactions = interactionsResponse?.data || [];
  const total = interactionsResponse?.total || 0;
  const totalPages = interactionsResponse?.totalPages || 0;

  const handleAddInteraction = async () => {
    if (!content) return;
    try {
      await createInteractionMutation.mutateAsync({
        customerId,
        type,
        content,
      });
      setContent("");
      setPage(1);
    } catch {
      toast.error("Failed to add interaction. Please try again.");
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "CALL": return <Phone className="h-4 w-4" />;
      case "EMAIL": return <Mail className="h-4 w-4" />;
      case "LINE": return <MessageCircle className="h-4 w-4" />;
      case "MEETING": return <Users className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4 border p-4 rounded-md bg-card">
        <h3 className="font-semibold">Log Interaction</h3>
        <div className="flex gap-4">
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CALL">Call</SelectItem>
              <SelectItem value="EMAIL">Email</SelectItem>
              <SelectItem value="LINE">LINE</SelectItem>
              <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
              <SelectItem value="MEETING">Meeting</SelectItem>
            </SelectContent>
          </Select>
          <Textarea
            placeholder="What happened?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="flex-1 min-h-[80px]"
          />
        </div>
        <div className="flex justify-end">
          <Button
            onClick={handleAddInteraction}
            disabled={createInteractionMutation.isPending || !content}
          >
            {createInteractionMutation.isPending ? "Logging..." : "Log Interaction"}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">Loading interactions...</p>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center py-8">
          <p className="text-destructive">Failed to load interactions. Please try again.</p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {interactions.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-muted-foreground">No interactions found.</p>
              </div>
            ) : (
              interactions.map((interaction) => (
                <div key={interaction.id} className="flex gap-4 p-4 border rounded-md">
                  <div className="mt-1 p-2 bg-muted rounded-full h-fit">
                    {getIcon(interaction.type)}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{interaction.agent.name}</p>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(interaction.date), "PP p")}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{interaction.content}</p>
                    <span className="text-xs font-medium px-2 py-0.5 bg-secondary rounded-full">
                      {interaction.type}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <div className="text-sm text-muted-foreground">
                Page {page} of {totalPages} ({total} total)
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
