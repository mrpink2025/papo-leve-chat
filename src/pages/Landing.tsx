import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import { 
  MessageSquare, 
  Users, 
  Video, 
  Shield, 
  Clock, 
  Smartphone,
  Lock,
  Database,
  ChevronDown
} from "lucide-react";
import logo from "@/assets/nosso-papo-logo-transparent.png";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const Landing = () => {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Header fixo */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={logo} alt="Nosso Papo" className="h-10 w-10" />
              <span className="text-xl font-bold text-primary">Nosso Papo</span>
            </div>

            <nav className="hidden md:flex items-center gap-6">
              <button onClick={() => scrollToSection('recursos')} className="text-sm hover:text-primary transition-colors">
                Recursos
              </button>
              <button onClick={() => scrollToSection('seguranca')} className="text-sm hover:text-primary transition-colors">
                Segurança
              </button>
              <button onClick={() => scrollToSection('faq')} className="text-sm hover:text-primary transition-colors">
                FAQ
              </button>
              <button onClick={() => scrollToSection('contato')} className="text-sm hover:text-primary transition-colors">
                Contato
              </button>
            </nav>

            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Link to="/entrar">
                <Button variant="ghost">Entrar</Button>
              </Link>
              <Link to="/criar-conta">
                <Button>Criar conta</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 md:py-32">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
                Nosso Papo
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground">
                Onde cada conversa importa
              </p>
              <p className="text-lg text-muted-foreground max-w-xl">
                Mensagens rápidas, chamadas nítidas e privacidade no centro. 
                Conecte-se com quem importa, quando importa.
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <Link to="/criar-conta">
                <Button size="lg" className="text-lg px-8">
                  Criar conta grátis
                </Button>
              </Link>
              <Button 
                size="lg" 
                variant="outline" 
                className="text-lg px-8"
                onClick={() => scrollToSection('recursos')}
              >
                Ver recursos
              </Button>
            </div>

            <div className="flex items-center gap-8 pt-4">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <span className="text-sm text-muted-foreground">100% Privado</span>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                <span className="text-sm text-muted-foreground">Criptografado</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <span className="text-sm text-muted-foreground">Tempo Real</span>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="bg-gradient-to-br from-primary/20 to-secondary/20 rounded-3xl p-8 backdrop-blur-sm border border-primary/20">
              <div className="bg-card rounded-2xl p-6 shadow-lg">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <MessageSquare className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">Grupo Família</p>
                    <p className="text-sm text-muted-foreground">5 membros online</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/20 flex-shrink-0" />
                    <div className="bg-message-received rounded-2xl rounded-tl-sm p-3 max-w-[80%]">
                      <p className="text-sm">Vamos marcar o almoço de domingo?</p>
                    </div>
                  </div>
                  <div className="flex gap-3 justify-end">
                    <div className="bg-message-sent text-message-sent-foreground rounded-2xl rounded-tr-sm p-3 max-w-[80%]">
                      <p className="text-sm">Ótima ideia! 12h tá bom? 🍽️</p>
                    </div>
                    <div className="h-8 w-8 rounded-full bg-secondary/20 flex-shrink-0" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Recursos */}
      <section id="recursos" className="py-20 bg-card/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Recursos Poderosos
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Tudo que você precisa para manter suas conversas fluindo
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="p-6 space-y-4 hover:shadow-lg transition-shadow">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <MessageSquare className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Mensagens Instantâneas</h3>
              <p className="text-muted-foreground">
                Envie textos, fotos, vídeos e documentos em tempo real com confirmação de leitura.
              </p>
            </Card>

            <Card className="p-6 space-y-4 hover:shadow-lg transition-shadow">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Grupos & Enquetes</h3>
              <p className="text-muted-foreground">
                Crie grupos para família, amigos ou trabalho. Faça enquetes e tome decisões juntos.
              </p>
            </Card>

            <Card className="p-6 space-y-4 hover:shadow-lg transition-shadow">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Video className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Chamadas HD</h3>
              <p className="text-muted-foreground">
                Chamadas de voz e vídeo com qualidade cristalina para 1 pessoa ou grupos.
              </p>
            </Card>

            <Card className="p-6 space-y-4 hover:shadow-lg transition-shadow">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Smartphone className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Multi-dispositivo</h3>
              <p className="text-muted-foreground">
                Use em celular, tablet e computador. Suas conversas sincronizadas em todos os dispositivos.
              </p>
            </Card>

            <Card className="p-6 space-y-4 hover:shadow-lg transition-shadow">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Privacidade Total</h3>
              <p className="text-muted-foreground">
                Suas conversas são protegidas. Controle quem vê suas informações e status.
              </p>
            </Card>

            <Card className="p-6 space-y-4 hover:shadow-lg transition-shadow">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Offline First</h3>
              <p className="text-muted-foreground">
                Continue usando o app mesmo sem conexão. Mensagens são enviadas quando voltar online.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Segurança */}
      <section id="seguranca" className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Sua Privacidade é Prioridade
              </h2>
              <p className="text-lg text-muted-foreground">
                Construído com Supabase para máxima segurança e desempenho
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <Card className="p-8 space-y-4">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-2">
                  <Lock className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Proteção de Dados</h3>
                <p className="text-muted-foreground">
                  Todos os seus arquivos e mensagens são armazenados com segurança. 
                  Links de mídia expiram automaticamente para maior proteção.
                </p>
              </Card>

              <Card className="p-8 space-y-4">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-2">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Acesso Controlado</h3>
                <p className="text-muted-foreground">
                  Apenas participantes da conversa podem acessar mensagens e arquivos. 
                  Você controla quem vê seu perfil e status.
                </p>
              </Card>

              <Card className="p-8 space-y-4">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-2">
                  <Database className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Infraestrutura Confiável</h3>
                <p className="text-muted-foreground">
                  Hospedado na infraestrutura do Supabase, garantindo 99.9% de uptime 
                  e backups automáticos dos seus dados.
                </p>
              </Card>

              <Card className="p-8 space-y-4">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-2">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Código Aberto</h3>
                <p className="text-muted-foreground">
                  Transparência total com tecnologias open-source. 
                  Você sabe exatamente como seus dados são tratados.
                </p>
              </Card>
            </div>

            <div className="mt-12 text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Assinado por:{" "}
                <span className="text-primary font-medium">Mr_Pink</span>
              </p>
              <p className="text-xs text-muted-foreground">
                Powered by{" "}
                <a 
                  href="https://supabase.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline font-medium"
                >
                  Supabase
                </a>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 bg-card/50">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Perguntas Frequentes
              </h2>
              <p className="text-lg text-muted-foreground">
                Tudo o que você precisa saber sobre o Nosso Papo
              </p>
            </div>

            <Accordion type="single" collapsible className="space-y-4">
              <AccordionItem value="item-1">
                <AccordionTrigger className="text-left">
                  Como criar uma conta no Nosso Papo?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  É simples! Clique em "Criar conta" no topo da página, preencha 
                  seus dados básicos (nome, email e senha) e pronto. Você receberá 
                  um email de confirmação para ativar sua conta.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2">
                <AccordionTrigger className="text-left">
                  Posso usar o Nosso Papo offline?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Sim! O Nosso Papo funciona offline. Você pode ler mensagens antigas 
                  e escrever novas mensagens que serão enviadas automaticamente quando 
                  você voltar a ter conexão.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3">
                <AccordionTrigger className="text-left">
                  Há versão para desktop?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Sim! O Nosso Papo é um PWA (Progressive Web App), o que significa 
                  que você pode instalá-lo no seu computador, celular ou tablet. 
                  Funciona como um aplicativo nativo e pode ser usado em qualquer dispositivo.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4">
                <AccordionTrigger className="text-left">
                  Minhas conversas são privadas?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Totalmente! Apenas você e os participantes da conversa têm acesso 
                  às mensagens. Usamos as melhores práticas de segurança do Supabase 
                  para proteger seus dados.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-5">
                <AccordionTrigger className="text-left">
                  Posso fazer chamadas de vídeo em grupo?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Sim! O Nosso Papo suporta chamadas de áudio e vídeo tanto individuais 
                  quanto em grupo, com qualidade HD e baixa latência.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-6">
                <AccordionTrigger className="text-left">
                  O serviço é gratuito?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Sim! O Nosso Papo é totalmente gratuito para uso pessoal. 
                  Todos os recursos estão disponíveis sem custo.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <h2 className="text-3xl md:text-5xl font-bold">
              Pronto para começar?
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Junte-se a milhares de pessoas que já conversam no Nosso Papo. 
              É grátis e leva menos de 1 minuto.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link to="/criar-conta">
                <Button size="lg" className="text-lg px-12">
                  Criar conta grátis
                </Button>
              </Link>
              <Link to="/entrar">
                <Button size="lg" variant="outline" className="text-lg px-12">
                  Já tenho conta
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contato" className="border-t border-border py-12 bg-card/30">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <img src={logo} alt="Nosso Papo" className="h-8 w-8" />
                <span className="text-lg font-bold text-primary">Nosso Papo</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Onde cada conversa importa
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">Links Rápidos</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <button onClick={() => scrollToSection('recursos')} className="hover:text-primary transition-colors">
                    Recursos
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollToSection('seguranca')} className="hover:text-primary transition-colors">
                    Segurança
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollToSection('faq')} className="hover:text-primary transition-colors">
                    FAQ
                  </button>
                </li>
              </ul>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">Legal</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Termos de Uso
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Política de Privacidade
                  </a>
                </li>
                <li>
                  <a href="mailto:contato@nossopapo.net" className="hover:text-primary transition-colors">
                    Contato
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-border text-center space-y-2">
            <p className="text-sm text-muted-foreground mb-1">
              <span className="font-semibold text-primary">Nosso Papo</span> — Assinado por: Mr_Pink
            </p>
            <p className="text-xs text-muted-foreground">
              © 2025 ·{" "}
              <a 
                href="https://nossopapo.net" 
                className="hover:text-primary transition-colors underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                nossopapo.net
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
