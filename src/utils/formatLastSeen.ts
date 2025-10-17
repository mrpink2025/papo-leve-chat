import { format, isToday, isYesterday, differenceInDays, differenceInWeeks, differenceInMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

export const formatLastSeen = (lastSeenDate: string | Date | null | undefined): string => {
  if (!lastSeenDate) return "offline";

  const date = new Date(lastSeenDate);
  const now = new Date();

  // Se a data for inválida
  if (isNaN(date.getTime())) return "offline";

  // Hoje - mostra "hoje às HH:mm"
  if (isToday(date)) {
    return `hoje às ${format(date, "HH:mm")}`;
  }

  // Ontem - mostra "ontem às HH:mm"
  if (isYesterday(date)) {
    return `ontem às ${format(date, "HH:mm")}`;
  }

  // Últimos 7 dias - mostra "há X dias"
  const daysDiff = differenceInDays(now, date);
  if (daysDiff < 7) {
    return `há ${daysDiff} ${daysDiff === 1 ? "dia" : "dias"}`;
  }

  // Últimas 4 semanas - mostra "há X semana(s)"
  const weeksDiff = differenceInWeeks(now, date);
  if (weeksDiff < 4) {
    return `há ${weeksDiff} ${weeksDiff === 1 ? "semana" : "semanas"}`;
  }

  // Últimos 12 meses - mostra "há X mês/meses"
  const monthsDiff = differenceInMonths(now, date);
  if (monthsDiff < 12) {
    return `há ${monthsDiff} ${monthsDiff === 1 ? "mês" : "meses"}`;
  }

  // Mais de 1 ano - mostra a data completa
  return format(date, "dd/MM/yyyy", { locale: ptBR });
};
