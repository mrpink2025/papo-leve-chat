import { format, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DateSeparatorProps {
  date: Date | string;
}

const DateSeparator = ({ date }: DateSeparatorProps) => {
  const dateObj = typeof date === "string" ? new Date(date) : date;

  const getDateLabel = () => {
    if (isToday(dateObj)) {
      return "Hoje";
    }
    if (isYesterday(dateObj)) {
      return "Ontem";
    }
    return format(dateObj, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  };

  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-border" />
      <span className="text-xs text-muted-foreground font-medium px-2">
        {getDateLabel()}
      </span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
};

export default DateSeparator;
