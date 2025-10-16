import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { Download, Smartphone, Share2, Plus, ArrowLeft } from "lucide-react";
import logo from "@/assets/nosso-papo-logo-transparent.png";

const Install = () => {
  const navigate = useNavigate();
  const { isInstalled, isIOS, promptInstall, canInstall } = useInstallPrompt();

  const handleInstall = async () => {
    const installed = await promptInstall();
    if (installed) {
      navigate("/");
    }
  };

  if (isInstalled) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center space-y-6">
          <img src={logo} alt="Nosso Papo" className="h-24 w-24 mx-auto" />
          <div>
            <h1 className="text-2xl font-bold mb-2">App já instalado! 🎉</h1>
            <p className="text-muted-foreground">
              O Nosso Papo já está instalado no seu dispositivo.
            </p>
          </div>
          <Button onClick={() => navigate("/")} className="w-full">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao App
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <div className="max-w-4xl mx-auto py-8 space-y-8">
        <div className="text-center space-y-4">
          <img src={logo} alt="Nosso Papo" className="h-20 w-20 mx-auto" />
          <h1 className="text-3xl font-bold">Instalar Nosso Papo</h1>
          <p className="text-muted-foreground text-lg">
            Tenha o app sempre à mão, funciona offline e é super rápido!
          </p>
        </div>

        {!isIOS && canInstall && (
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Download className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Instalação Rápida</h2>
                <p className="text-muted-foreground">Clique no botão abaixo</p>
              </div>
            </div>
            <Button onClick={handleInstall} size="lg" className="w-full">
              <Download className="mr-2 h-5 w-5" />
              Instalar Agora
            </Button>
          </Card>
        )}

        {isIOS && (
          <Card className="p-6 space-y-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Smartphone className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Instalação no iOS</h2>
                <p className="text-muted-foreground">Siga os passos abaixo</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0">
                  1
                </div>
                <div className="flex-1">
                  <p className="font-medium mb-2">Toque no botão de compartilhar</p>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Share2 className="h-5 w-5" />
                    <span className="text-sm">
                      Ícone de compartilhar no Safari (parte inferior da tela)
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0">
                  2
                </div>
                <div className="flex-1">
                  <p className="font-medium mb-2">Selecione "Adicionar à Tela Inicial"</p>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Plus className="h-5 w-5" />
                    <span className="text-sm">
                      Role para baixo e toque em "Adicionar à Tela Inicial"
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0">
                  3
                </div>
                <div className="flex-1">
                  <p className="font-medium mb-2">Confirme a instalação</p>
                  <p className="text-sm text-muted-foreground">
                    Toque em "Adicionar" no canto superior direito
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-primary/5 rounded-lg p-4">
              <p className="text-sm text-center">
                ⚠️ <strong>Importante:</strong> Esta opção só aparece no navegador Safari
              </p>
            </div>
          </Card>
        )}

        <Card className="p-6 space-y-4">
          <h3 className="text-lg font-semibold">Por que instalar?</h3>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-green-600">✓</span>
              </div>
              <div>
                <p className="font-medium">Funciona Offline</p>
                <p className="text-sm text-muted-foreground">
                  Continue conversando mesmo sem internet
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-green-600">✓</span>
              </div>
              <div>
                <p className="font-medium">Notificações Push</p>
                <p className="text-sm text-muted-foreground">
                  Receba alertas de novas mensagens
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-green-600">✓</span>
              </div>
              <div>
                <p className="font-medium">Carregamento Rápido</p>
                <p className="text-sm text-muted-foreground">
                  App otimizado com cache inteligente
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-green-600">✓</span>
              </div>
              <div>
                <p className="font-medium">Experiência Nativa</p>
                <p className="text-sm text-muted-foreground">
                  Aparência e sensação de app nativo
                </p>
              </div>
            </li>
          </ul>
        </Card>

        <div className="text-center">
          <Button variant="ghost" onClick={() => navigate("/")} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Voltar ao Início
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Install;
