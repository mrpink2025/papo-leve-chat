interface TypingIndicatorProps {
  users: string[];
}

const TypingIndicator = ({ users }: TypingIndicatorProps) => {
  if (users.length === 0) return null;

  const text =
    users.length === 1
      ? `${users[0]} está digitando...`
      : users.length === 2
      ? `${users[0]} e ${users[1]} estão digitando...`
      : `${users[0]} e outros estão digitando...`;

  return (
    <div className="px-4 py-2 text-sm text-muted-foreground italic animate-fade-in">
      {text}
      <span className="inline-flex gap-1 ml-1">
        <span className="animate-bounce" style={{ animationDelay: "0ms" }}>
          .
        </span>
        <span className="animate-bounce" style={{ animationDelay: "150ms" }}>
          .
        </span>
        <span className="animate-bounce" style={{ animationDelay: "300ms" }}>
          .
        </span>
      </span>
    </div>
  );
};

export default TypingIndicator;
