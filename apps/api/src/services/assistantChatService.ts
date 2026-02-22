import type { AssistantChat, AssistantChatMessage, AssistantContextReference } from "@pia/shared";

import { getSupabaseClient } from "./supabaseClient";

function buildChatTitle(question: string) {
  const trimmed = question.trim();
  if (!trimmed) {
    return "New chat";
  }
  return trimmed.length > 60 ? `${trimmed.slice(0, 57)}...` : trimmed;
}

export async function listAssistantChats(userId: string): Promise<AssistantChat[]> {
  const client = getSupabaseClient();
  if (!client) {
    return [];
  }
  const { data } = await client
    .from("assistant_chats")
    .select("*")
    .eq("user_id", userId)
    .order("last_message_at", { ascending: false });

  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    createdAtIso: row.created_at,
    updatedAtIso: row.updated_at,
    lastMessageAtIso: row.last_message_at
  })) as AssistantChat[];
}

export async function createAssistantChat(userId: string, question: string): Promise<AssistantChat> {
  const client = getSupabaseClient();
  if (!client) {
    const nowIso = new Date().toISOString();
    return {
      id: `chat-${Date.now()}`,
      title: buildChatTitle(question),
      createdAtIso: nowIso,
      updatedAtIso: nowIso,
      lastMessageAtIso: nowIso
    };
  }
  const nowIso = new Date().toISOString();
  const { data, error } = await client
    .from("assistant_chats")
    .insert({
      user_id: userId,
      title: buildChatTitle(question),
      created_at: nowIso,
      updated_at: nowIso,
      last_message_at: nowIso
    })
    .select("*")
    .single();
  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create assistant chat");
  }
  return {
    id: data.id,
    title: data.title,
    createdAtIso: data.created_at,
    updatedAtIso: data.updated_at,
    lastMessageAtIso: data.last_message_at
  };
}

export async function listAssistantChatMessages(
  userId: string,
  chatId: string
): Promise<AssistantChatMessage[]> {
  const client = getSupabaseClient();
  if (!client) {
    return [];
  }
  const { data } = await client
    .from("assistant_chat_messages")
    .select("*")
    .eq("user_id", userId)
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true });

  return (data ?? []).map((row) => ({
    id: row.id,
    chatId: row.chat_id,
    role: row.role,
    text: row.text,
    createdAtIso: row.created_at,
    attachments: row.attachments ?? [],
    contextReferences: row.context_references ?? []
  })) as AssistantChatMessage[];
}

export async function appendAssistantChatMessage(params: {
  userId: string;
  chatId: string;
  role: "user" | "assistant";
  text: string;
  attachments?: unknown[];
  contextReferences?: AssistantContextReference[];
}): Promise<AssistantChatMessage> {
  const client = getSupabaseClient();
  const nowIso = new Date().toISOString();
  if (!client) {
    return {
      id: `msg-${Date.now()}`,
      chatId: params.chatId,
      role: params.role,
      text: params.text,
      createdAtIso: nowIso,
      attachments: params.attachments as AssistantChatMessage["attachments"],
      contextReferences: params.contextReferences
    };
  }

  const { data, error } = await client
    .from("assistant_chat_messages")
    .insert({
      chat_id: params.chatId,
      user_id: params.userId,
      role: params.role,
      text: params.text,
      attachments: params.attachments ?? [],
      context_references: params.contextReferences ?? [],
      created_at: nowIso
    })
    .select("*")
    .single();
  if (error || !data) {
    throw new Error(error?.message ?? "Failed to append assistant chat message");
  }

  await client
    .from("assistant_chats")
    .update({
      updated_at: nowIso,
      last_message_at: nowIso
    })
    .eq("id", params.chatId)
    .eq("user_id", params.userId);

  return {
    id: data.id,
    chatId: data.chat_id,
    role: data.role,
    text: data.text,
    createdAtIso: data.created_at,
    attachments: data.attachments ?? [],
    contextReferences: data.context_references ?? []
  };
}
