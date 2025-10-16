import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Shield, Users, Eye, Image, MessageSquare, Phone, Clock, CheckCheck } from "lucide-react";
import { usePrivacySettings } from "@/hooks/usePrivacySettings";
import { Separator } from "@/components/ui/separator";

export default function PrivacySettings() {
  const navigate = useNavigate();
  const { settings, isLoading, updateSettings } = usePrivacySettings();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground animate-pulse" />
          <p className="text-muted-foreground">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  const privacyOptions = [
    { value: "everyone", label: "Todos" },
    { value: "contacts", label: "Meus contatos" },
    { value: "nobody", label: "Ninguém" },
  ];

  const addMeOptions = [
    { value: "everyone", label: "Todos" },
    { value: "contacts_only", label: "Apenas contatos de contatos" },
    { value: "nobody", label: "Ninguém" },
  ];

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/app/configuracoes")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Privacidade</h1>
            <p className="text-sm text-muted-foreground">
              Configure quem pode ver suas informações
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Quem pode me adicionar */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <Label className="text-base font-medium">Quem pode me adicionar</Label>
              <p className="text-sm text-muted-foreground">
                Controle quem pode adicionar você aos contatos
              </p>
            </div>
          </div>
          <Select
            value={settings.who_can_add_me}
            onValueChange={(value: any) =>
              updateSettings.mutate({ who_can_add_me: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {addMeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Quem pode ver meu status */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Eye className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <Label className="text-base font-medium">Quem pode ver meu status</Label>
              <p className="text-sm text-muted-foreground">
                Controle quem pode ver se você está online
              </p>
            </div>
          </div>
          <Select
            value={settings.who_can_see_status}
            onValueChange={(value: any) =>
              updateSettings.mutate({ who_can_see_status: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {privacyOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Quem pode ver minha foto */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Image className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <Label className="text-base font-medium">Quem pode ver minha foto</Label>
              <p className="text-sm text-muted-foreground">
                Controle quem pode ver seu avatar
              </p>
            </div>
          </div>
          <Select
            value={settings.who_can_see_avatar}
            onValueChange={(value: any) =>
              updateSettings.mutate({ who_can_see_avatar: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {privacyOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Quem pode ver minha bio */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <MessageSquare className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <Label className="text-base font-medium">Quem pode ver minha bio</Label>
              <p className="text-sm text-muted-foreground">
                Controle quem pode ver sua descrição
              </p>
            </div>
          </div>
          <Select
            value={settings.who_can_see_bio}
            onValueChange={(value: any) =>
              updateSettings.mutate({ who_can_see_bio: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {privacyOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Quem pode me ligar */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Phone className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <Label className="text-base font-medium">Quem pode me ligar</Label>
              <p className="text-sm text-muted-foreground">
                Controle quem pode fazer chamadas para você
              </p>
            </div>
          </div>
          <Select
            value={settings.who_can_call_me}
            onValueChange={(value: any) =>
              updateSettings.mutate({ who_can_call_me: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {privacyOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Exibir "Visto por último" */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-primary" />
            <div>
              <Label className="text-base font-medium">Exibir "Visto por último"</Label>
              <p className="text-sm text-muted-foreground">
                Mostrar quando você esteve online pela última vez
              </p>
            </div>
          </div>
          <Switch
            checked={settings.show_last_seen}
            onCheckedChange={(checked) =>
              updateSettings.mutate({ show_last_seen: checked })
            }
          />
        </div>

        <Separator />

        {/* Confirmações de leitura */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCheck className="h-5 w-5 text-primary" />
            <div>
              <Label className="text-base font-medium">Confirmações de leitura</Label>
              <p className="text-sm text-muted-foreground">
                Mostrar quando você leu mensagens
              </p>
            </div>
          </div>
          <Switch
            checked={settings.read_receipts}
            onCheckedChange={(checked) =>
              updateSettings.mutate({ read_receipts: checked })
            }
          />
        </div>
      </div>
    </div>
  );
}
