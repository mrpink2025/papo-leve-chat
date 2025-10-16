import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

const Settings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { preferences, updatePreferences } = useUserPreferences();
  const { t, i18n } = useTranslation();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const [formData, setFormData] = useState({
    username: "",
    full_name: "",
    bio: "",
    phone: "",
  });
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (profile) {
      setFormData({
        username: profile.username || "",
        full_name: profile.full_name || "",
        bio: profile.bio || "",
        phone: profile.phone || "",
      });
    }
  }, [profile]);

  const updateProfile = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!user?.id) throw new Error("No user");
      const { error } = await supabase
        .from("profiles")
        .update(data)
        .eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      toast.success("Perfil atualizado");
    },
    onError: () => {
      toast.error("Erro ao atualizar perfil");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile.mutate(formData);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione apenas arquivos de imagem");
      return;
    }

    // Validar tamanho (máximo 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error("A imagem deve ter no máximo 5MB");
      return;
    }

    setUploadingAvatar(true);

    try {
      // Deletar avatar antigo se existir
      if (profile?.avatar_url) {
        const oldPath = profile.avatar_url.split('/').pop();
        if (oldPath) {
          await supabase.storage
            .from("avatars")
            .remove([`${user.id}/${oldPath}`]);
        }
      }

      // Gerar nome único para o arquivo
      const fileExt = file.name.split(".").pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      // Upload do novo avatar
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw new Error(uploadError.message);
      }

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      // Atualizar perfil com nova URL
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);

      if (updateError) {
        console.error("Update error:", updateError);
        throw new Error(updateError.message);
      }

      queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
      toast.success("Avatar atualizado com sucesso!");
    } catch (error: any) {
      console.error("Avatar upload error:", error);
      toast.error(`Erro ao fazer upload: ${error.message || "Tente novamente"}`);
    } finally {
      setUploadingAvatar(false);
      // Reset do input
      e.target.value = "";
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <div className="bg-card border-b border-border p-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-semibold">Configurações</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-6 space-y-8">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <Avatar className="h-32 w-32">
                <AvatarImage src={profile?.avatar_url || ""} />
                <AvatarFallback className="text-3xl">
                  {profile?.username?.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <label className={`absolute bottom-0 right-0 bg-primary rounded-full p-2 cursor-pointer hover:bg-primary-glow transition-colors ${uploadingAvatar ? 'opacity-50 cursor-not-allowed' : ''}`}>
                {uploadingAvatar ? (
                  <div className="h-5 w-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Camera className="h-5 w-5 text-primary-foreground" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                  disabled={uploadingAvatar}
                />
              </label>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="username">Nome de usuário</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="seu_usuario"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="full_name">Nome completo</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="Seu Nome Completo"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Sobre você..."
                className="min-h-[100px] resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+55 11 99999-9999"
              />
            </div>

            <Button type="submit" className="w-full" disabled={updateProfile.isPending}>
              {updateProfile.isPending ? "Salvando..." : "Salvar alterações"}
            </Button>
          </form>

          <Separator className="my-6" />

          {/* Preferences Section */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">{t('settings.preferences')}</h2>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="theme">{t('settings.theme')}</Label>
                <Select
                  value={preferences?.theme || 'default'}
                  onValueChange={(value) => updatePreferences({ theme: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">{t('settings.themes.default')}</SelectItem>
                    <SelectItem value="dark">{t('settings.themes.dark')}</SelectItem>
                    <SelectItem value="blue">{t('settings.themes.blue')}</SelectItem>
                    <SelectItem value="green">{t('settings.themes.green')}</SelectItem>
                    <SelectItem value="purple">{t('settings.themes.purple')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="language">{t('settings.language')}</Label>
                <Select
                  value={preferences?.language || 'pt'}
                  onValueChange={(value) => {
                    updatePreferences({ language: value });
                    i18n.changeLanguage(value);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pt">{t('settings.languages.pt')}</SelectItem>
                    <SelectItem value="en">{t('settings.languages.en')}</SelectItem>
                    <SelectItem value="es">{t('settings.languages.es')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
