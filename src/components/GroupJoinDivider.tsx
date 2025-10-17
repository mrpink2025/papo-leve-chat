import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Users } from "lucide-react";

interface GroupJoinDividerProps {
  joinedAt: string | Date;
  userName?: string;
}

export const GroupJoinDivider = ({ joinedAt, userName }: GroupJoinDividerProps) => {
  const date = new Date(joinedAt);
  const formattedDate = format(date, "dd 'de' MMMM, HH:mm", { locale: ptBR });

  return (
    <div className="relative flex items-center justify-center py-6 my-4">
      {/* Linha horizontal */}
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t-2 border-amber-500/30"></div>
      </div>

      {/* Card central */}
      <div className="relative z-10 bg-gradient-to-r from-amber-500/10 via-amber-500/20 to-amber-500/10 border-2 border-amber-500/40 rounded-lg px-6 py-3 shadow-lg backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500/20 p-2 rounded-full">
            <Users size={20} className="text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
              {userName ? `${userName} entrou no grupo` : "Você entrou no grupo"}
            </p>
            <p className="text-xs text-amber-600/80 dark:text-amber-400/80">
              {formattedDate}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
