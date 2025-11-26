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
import { Phone, Mail, MessageCircle, Users, FileText } from "lucide-react";

interface Interaction {
  id: string;
  type: string;
  content: string;
  date: string;
  agent: { name: string };
}

interface CustomerInteractionsProps {
  customerId: string;
  initialInteractions: Interaction[];
}

export function CustomerInteractions({
  customerId,
  initialInteractions,
}: CustomerInteractionsProps) {
  const [interactions, setInteractions] = useState(initialInteractions);
  const [content, setContent] = useState("");
  const [type, setType] = useState("CALL");
  const [loading, setLoading] = useState(false);

  const handleAddInteraction = async () => {
    if (!content) return;
    setLoading(true);
    try {
      const res = await fetch("/api/interactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId, type, content }),
      });
      if (res.ok) {
        const newInteraction = await res.json();
        setInteractions([newInteraction, ...interactions]);
        setContent("");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
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
          <Button onClick={handleAddInteraction} disabled={loading || !content}>
            {loading ? "Logging..." : "Log Interaction"}
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {interactions.map((interaction) => (
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
        ))}
      </div>
    </div>
  );
}
