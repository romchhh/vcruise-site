import { NextResponse } from "next/server";
import { getChatSettings, listPresets } from "@/lib/cms/chat";

export const runtime = "nodejs";

export async function GET() {
  const settings = getChatSettings();
  const questions = listPresets("visitor_question").filter(
    (preset) => preset.active
  );

  return NextResponse.json({
    ok: true,
    enabled: settings.chatEnabled,
    welcomeMessage: settings.chatWelcomeMessage,
    agentName: settings.chatAgentName,
    agentImage: settings.chatAgentImage,
    offlineMessage: settings.chatOfflineMessage,
    brandName: settings.brandName,
    questions: questions.map((preset) => ({
      id: preset.id,
      label: preset.label,
      text: preset.text,
    })),
  });
}
