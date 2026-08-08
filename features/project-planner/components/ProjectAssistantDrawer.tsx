"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  Bot,
  Check,
  Eye,
  FileText,
  PenLine,
  Send,
  Sparkles,
  X,
} from "lucide-react";

import { Button, IconButton, TextArea } from "@/components/ui";

type NoteView = "write" | "preview";
const NOTE_SAVE_DELAY_MS = 600;

export interface ProjectAssistantDrawerProps {
  markdown: string;
  onMarkdownChange: (markdown: string) => void;
  onMarkdownDraftChange: (markdown: string) => void;
  onClose: () => void;
  onSendMessage?: (message: string) => Promise<string>;
}

type ChatMessage = {
  id: number;
  role: "assistant" | "user";
  text: string;
};

const NOTE_VIEWS: ReadonlyArray<{
  value: NoteView;
  label: string;
  icon: ReactNode;
}> = [
  { value: "write", label: "Write", icon: <PenLine size={14} /> },
  { value: "preview", label: "Preview", icon: <Eye size={14} /> },
];

const INLINE_MARKDOWN_PATTERN = /(\*\*[^*\n]+\*\*|`[^`\n]+`|\[[^\]\n]+\]\((?:https?:\/\/|mailto:)[^)\s]+\))/g;

function renderInlineMarkdown(value: string, keyPrefix: string): ReactNode[] {
  return value.split(INLINE_MARKDOWN_PATTERN).filter(Boolean).map((token, index) => {
    const key = `${keyPrefix}-${index}`;
    if (token.startsWith("**") && token.endsWith("**")) {
      return <strong key={key}>{token.slice(2, -2)}</strong>;
    }
    if (token.startsWith("`") && token.endsWith("`")) {
      return <code key={key}>{token.slice(1, -1)}</code>;
    }
    if (token.startsWith("[")) {
      const labelEnd = token.indexOf("](");
      if (labelEnd > 0) {
        const label = token.slice(1, labelEnd);
        const href = token.slice(labelEnd + 2, -1);
        return (
          <a key={key} href={href} target="_blank" rel="noreferrer">
            {label}
          </a>
        );
      }
    }
    return token;
  });
}

function isBlockStart(line: string): boolean {
  return /^(?:#{1,3}\s|[-*]\s|\d+\.\s|>\s|```)/.test(line);
}

function MarkdownPreview({ value }: { value: string }) {
  const content = useMemo(() => {
    const lines = value.split(/\r?\n/);
    const blocks: ReactNode[] = [];
    let index = 0;

    while (index < lines.length) {
      const line = lines[index] ?? "";
      if (!line.trim()) {
        index += 1;
        continue;
      }

      if (line.startsWith("```")) {
        const language = line.slice(3).trim();
        const code: string[] = [];
        const start = index;
        index += 1;
        while (index < lines.length && !lines[index]?.startsWith("```")) {
          code.push(lines[index] ?? "");
          index += 1;
        }
        if (index < lines.length) index += 1;
        blocks.push(
          <pre key={`code-${start}`} data-language={language || undefined}>
            <code>{code.join("\n")}</code>
          </pre>,
        );
        continue;
      }

      const heading = line.match(/^(#{1,3})\s+(.+)$/);
      if (heading) {
        const level = heading[1]?.length ?? 1;
        const children = renderInlineMarkdown(heading[2] ?? "", `heading-${index}`);
        if (level === 1) blocks.push(<h3 key={`heading-${index}`}>{children}</h3>);
        if (level === 2) blocks.push(<h4 key={`heading-${index}`}>{children}</h4>);
        if (level === 3) blocks.push(<h5 key={`heading-${index}`}>{children}</h5>);
        index += 1;
        continue;
      }

      if (/^[-*]\s+/.test(line)) {
        const items: ReactNode[] = [];
        const start = index;
        while (index < lines.length && /^[-*]\s+/.test(lines[index] ?? "")) {
          const item = (lines[index] ?? "").replace(/^[-*]\s+/, "");
          const task = item.match(/^\[([ xX])\]\s+(.+)$/);
          if (task) {
            const checked = task[1]?.toLowerCase() === "x";
            items.push(
              <li className="assistant-markdown-task" key={`item-${index}`}>
                <span className={`assistant-markdown-check${checked ? " is-checked" : ""}`} aria-hidden="true">
                  {checked && <Check size={11} strokeWidth={3} />}
                </span>
                <span>{renderInlineMarkdown(task[2] ?? "", `item-${index}`)}</span>
              </li>,
            );
          } else {
            items.push(<li key={`item-${index}`}>{renderInlineMarkdown(item, `item-${index}`)}</li>);
          }
          index += 1;
        }
        blocks.push(<ul key={`list-${start}`}>{items}</ul>);
        continue;
      }

      if (/^\d+\.\s+/.test(line)) {
        const items: ReactNode[] = [];
        const start = index;
        while (index < lines.length && /^\d+\.\s+/.test(lines[index] ?? "")) {
          const item = (lines[index] ?? "").replace(/^\d+\.\s+/, "");
          items.push(<li key={`item-${index}`}>{renderInlineMarkdown(item, `item-${index}`)}</li>);
          index += 1;
        }
        blocks.push(<ol key={`list-${start}`}>{items}</ol>);
        continue;
      }

      if (/^>\s+/.test(line)) {
        const quote: string[] = [];
        const start = index;
        while (index < lines.length && /^>\s+/.test(lines[index] ?? "")) {
          quote.push((lines[index] ?? "").replace(/^>\s+/, ""));
          index += 1;
        }
        blocks.push(
          <blockquote key={`quote-${start}`}>
            {renderInlineMarkdown(quote.join(" "), `quote-${start}`)}
          </blockquote>,
        );
        continue;
      }

      const paragraph: string[] = [line.trim()];
      const start = index;
      index += 1;
      while (
        index < lines.length &&
        (lines[index] ?? "").trim() &&
        !isBlockStart(lines[index] ?? "")
      ) {
        paragraph.push((lines[index] ?? "").trim());
        index += 1;
      }
      blocks.push(
        <p key={`paragraph-${start}`}>
          {renderInlineMarkdown(paragraph.join(" "), `paragraph-${start}`)}
        </p>,
      );
    }

    return blocks;
  }, [value]);

  if (!value.trim()) {
    return (
      <div className="assistant-markdown-empty">
        <FileText size={24} aria-hidden="true" />
        <strong>Nothing to preview yet</strong>
        <span>Switch to Write and add Markdown notes.</span>
      </div>
    );
  }

  return <div className="assistant-markdown-preview">{content}</div>;
}

export function ProjectAssistantDrawer({
  markdown,
  onClose,
  onMarkdownChange,
  onMarkdownDraftChange,
  onSendMessage,
}: ProjectAssistantDrawerProps) {
  const [noteView, setNoteView] = useState<NoteView>("write");
  const [noteDraft, setNoteDraft] = useState(markdown);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const noteDraftRef = useRef(markdown);
  const lastCommittedNoteRef = useRef(markdown);
  const noteCommitTimerRef = useRef<number | null>(null);
  const aiConnected = Boolean(onSendMessage);
  const lineCount = noteDraft ? noteDraft.split(/\r?\n/).length : 0;

  const commitNote = useCallback((nextMarkdown = noteDraftRef.current) => {
    if (noteCommitTimerRef.current !== null) {
      window.clearTimeout(noteCommitTimerRef.current);
      noteCommitTimerRef.current = null;
    }
    if (nextMarkdown === lastCommittedNoteRef.current) return;
    lastCommittedNoteRef.current = nextMarkdown;
    onMarkdownChange(nextMarkdown);
  }, [onMarkdownChange]);

  const updateNoteDraft = useCallback((nextMarkdown: string) => {
    noteDraftRef.current = nextMarkdown;
    setNoteDraft(nextMarkdown);
    onMarkdownDraftChange(nextMarkdown);
    if (noteCommitTimerRef.current !== null) {
      window.clearTimeout(noteCommitTimerRef.current);
    }
    noteCommitTimerRef.current = window.setTimeout(
      () => commitNote(nextMarkdown),
      NOTE_SAVE_DELAY_MS,
    );
  }, [commitNote, onMarkdownDraftChange]);

  const closeDrawer = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => () => {
    if (noteCommitTimerRef.current !== null) {
      window.clearTimeout(noteCommitTimerRef.current);
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      const target = event.target;
      if (
        target instanceof Element &&
        target.closest(".glass-select-menu, .glass-date-menu")
      ) {
        return;
      }
      closeDrawer();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [closeDrawer]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = draft.trim();
    if (!message || !onSendMessage || sending) return;

    const userMessage: ChatMessage = {
      id: Date.now(),
      role: "user",
      text: message,
    };
    setMessages((current) => [...current, userMessage]);
    setDraft("");
    setSending(true);
    try {
      const response = await onSendMessage(message);
      setMessages((current) => [
        ...current,
        { id: Date.now() + 1, role: "assistant", text: response },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          role: "assistant",
          text: "I could not reach the AI service. Please try again.",
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <aside
      id="project-assistant-drawer"
      className="project-assistant-dock glass-panel"
      aria-labelledby="project-assistant-title"
    >
      <header className="project-assistant-dock-header">
        <div className="project-assistant-dock-title">
          <span className="project-assistant-dock-mark" aria-hidden="true">
            <Sparkles size={17} />
          </span>
          <div>
            <p className="eyebrow">Project copilot</p>
            <h2 id="project-assistant-title">Notes & AI</h2>
          </div>
        </div>
        <IconButton
          size="sm"
          variant="ghost"
          label="Close project copilot"
          onClick={closeDrawer}
        >
          <X size={17} aria-hidden="true" />
        </IconButton>
      </header>
      <div className="project-assistant-layout">
        <section className="assistant-note-panel" aria-labelledby="assistant-note-title">
          <div className="assistant-panel-heading">
            <div className="assistant-panel-title">
              <span className="assistant-panel-icon" aria-hidden="true"><FileText size={16} /></span>
              <div>
                <h3 id="assistant-note-title">Project note</h3>
                <span>Saved with this project</span>
              </div>
            </div>
            <div className="assistant-note-tabs" role="tablist" aria-label="Markdown note view">
              {NOTE_VIEWS.map((view) => (
                <button
                  key={view.value}
                  id={`assistant-note-${view.value}-tab`}
                  type="button"
                  role="tab"
                  aria-selected={noteView === view.value}
                  aria-controls="assistant-note-content"
                  className={noteView === view.value ? "is-active" : undefined}
                  onClick={() => {
                    if (view.value === "preview") commitNote();
                    setNoteView(view.value);
                  }}
                >
                  <span aria-hidden="true">{view.icon}</span>
                  {view.label}
                </button>
              ))}
            </div>
          </div>

          <div
            id="assistant-note-content"
            className="assistant-note-content"
            role="tabpanel"
            aria-labelledby={`assistant-note-${noteView}-tab`}
          >
            {noteView === "write" ? (
              <TextArea
                aria-label="Project note in Markdown"
                className="assistant-note-editor"
                value={noteDraft}
                spellCheck
                placeholder="# Project brief\n\nCapture decisions, risks, links, and next steps..."
                onChange={(event) => updateNoteDraft(event.target.value)}
                onBlur={() => commitNote()}
              />
            ) : (
              <MarkdownPreview value={noteDraft} />
            )}
          </div>

          <footer className="assistant-note-footer">
            <span><Sparkles size={13} aria-hidden="true" /> Markdown</span>
            <span>{lineCount} {lineCount === 1 ? "line" : "lines"} · {noteDraft.length} characters</span>
          </footer>
        </section>

        <section className="assistant-chat-panel" aria-labelledby="assistant-chat-title">
          <div className="assistant-panel-heading">
            <div className="assistant-panel-title">
              <span className="assistant-panel-icon assistant-panel-icon--ai" aria-hidden="true"><Bot size={17} /></span>
              <div>
                <h3 id="assistant-chat-title">Chat with AI</h3>
                <span>Project-aware assistance</span>
              </div>
            </div>
            <span className={`assistant-ai-status${aiConnected ? " is-connected" : ""}`}>
              <i aria-hidden="true" />
              {aiConnected ? "Connected" : "Setup needed"}
            </span>
          </div>

          <div className="assistant-chat-stream" aria-live="polite">
            <div className="assistant-chat-message assistant-chat-message--assistant">
              <span className="assistant-chat-avatar" aria-hidden="true"><Sparkles size={14} /></span>
              <p>
                {aiConnected
                  ? "I can use your project note and workspace context. What would you like to work through?"
                  : "Your chat space is ready. Connect an AI provider to ask questions using this project and its Markdown note as context."}
              </p>
            </div>
            {messages.map((message) => (
              <div
                className={`assistant-chat-message assistant-chat-message--${message.role}`}
                key={message.id}
              >
                {message.role === "assistant" && (
                  <span className="assistant-chat-avatar" aria-hidden="true"><Sparkles size={14} /></span>
                )}
                <p>{message.text}</p>
              </div>
            ))}
          </div>

          <form className="assistant-chat-composer" onSubmit={handleSubmit}>
            <TextArea
              aria-label="Message the project AI"
              value={draft}
              rows={1}
              disabled={!aiConnected}
              placeholder={aiConnected ? "Ask about scope, risks, or delivery…" : "Connect an AI provider to start chatting"}
              onChange={(event) => setDraft(event.target.value)}
            />
            <Button
              type="submit"
              variant="primary"
              size="md"
              className="assistant-chat-send"
              aria-label="Send message"
              title={aiConnected ? "Send message" : "Connect an AI provider to enable chat"}
              disabled={!aiConnected || !draft.trim()}
              loading={sending}
            >
              <Send size={16} aria-hidden="true" />
              <span className="assistant-send-label">Send</span>
            </Button>
          </form>
        </section>
      </div>
    </aside>
  );
}
