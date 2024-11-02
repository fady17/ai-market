"use client";

import { LLM } from "@prisma/client";
import ChatMessage, { ChatMessageProps } from "@/components/chat-message";
import { useEffect, useRef, useState, ElementRef } from "react";

interface ChatMessagesProps {
  messages: ChatMessageProps[];
  isLoading: boolean;
  llm: LLM;
}
const ChatMessages = ({ messages = [], isLoading, llm }: ChatMessagesProps) => {
  const scrollRef = useRef<ElementRef<"div">>(null);
  const [fakeLoading, setfakeLoading] = useState(
    messages.length === 0 ? true : false
  );
  useEffect(() => {
    const timeout = setTimeout(() => {
      setfakeLoading(false);
    }, 1000);
    return () => {
      clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    scrollRef?.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);
  return (
    <div className="flex-1 overflow-auto pr-4">
      <ChatMessage
        isLoading={fakeLoading}
        src={llm.src}
        role="system"
        content={`Hi, I am ${llm.name}, ${llm.description}`}
      />
      {messages.map((message) => (
        <ChatMessage
          key={message.content}
          role={message.role}
          content={message.content}
          src={message.src}
        />
      ))}
      {isLoading && <ChatMessage role="system" src={llm.src} isLoading />}

      <div ref={scrollRef} />
    </div>
  );
};

export default ChatMessages;
