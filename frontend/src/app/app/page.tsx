import { Suspense } from "react";
import Conversation from "@/components/keeper/conversation";

export default function ConversationPage() {
  return (
    <Suspense>
      <Conversation />
    </Suspense>
  );
}
