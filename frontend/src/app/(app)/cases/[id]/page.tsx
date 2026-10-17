"use client";

import ConversationHome from "@/components/fl/conversation-home";
import { useCase } from "@/components/fl/case-context";

/** Conversation — the default entry to a case (DESIGN §2.2). */
export default function ConversationPage() {
  const { ws } = useCase();
  return <ConversationHome ws={ws} />;
}
