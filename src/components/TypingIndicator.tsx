interface TypingIndicatorProps {
  users: string[];
}

const TypingIndicator = ({ users }: TypingIndicatorProps) => {
  if (users.length === 0) return null;

  const displayText =
    users.length === 1
      ? `${users[0]} está digitando...`
      : users.length === 2
      ? `${users[0]} e ${users[1]} estão digitando...`
      : `${users[0]} e mais ${users.length - 1} estão digitando...`;

  return (
    <div className="px-4 py-2 text-sm text-muted-foreground flex items-center gap-2 animate-fade-in">
      <div className="flex gap-1">
        <span className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
        <span className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
        <span className="w-2 h-2 bg-primary rounded-full animate-bounce" />
      </div>
      {displayText}
    </div>
  );
};

export default TypingIndicator;
