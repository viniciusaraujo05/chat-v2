import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { usePage } from "@inertiajs/react";
import { SharedData } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { motion } from "framer-motion";

export default function ChatbotLandingPage() {
  const [email, setEmail] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const features = [
    {
      title: "Respostas Instantâneas",
      description: "Responda clientes em segundos, 24/7, sem espera.",
      icon: "⚡",
    },
    {
      title: "Personalização Total",
      description: "Adapte o chatbot ao seu negócio e público.",
      icon: "🎨",
    },
    {
      title: "Aumento de Conversão",
      description: "Chatbots podem aumentar vendas em até 67%.",
      icon: "📈",
    },
  ];

  const stats = [
    { value: "70%", label: "das conversas são concluídas por chatbots", source: "Demandsage, 2025" },
    { value: "30%", label: "de redução nos custos de suporte", source: "IBM, 2023" },
    { value: "2.5B", label: "horas economizadas por empresas até 2025", source: "Demandsage, 2025" },
    { value: "87%", label: "dos usuários aprovam chatbots", source: "Ecommerce Bonsai, 2024" },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEmail("");
  };

  const { auth } = usePage<SharedData>().props;

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-black text-white' : 'bg-white text-black'} transition-colors duration-300`}>
      {/* Header */}
      <header className={`sticky top-0 z-50 ${isDarkMode ? 'bg-black border-white' : 'bg-white border-black'} border-b`}>
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">ChatBot Pro</h1>
          <div className="flex items-center gap-4">
            <Switch
              checked={isDarkMode}
              onCheckedChange={setIsDarkMode}
              aria-label="Toggle dark mode"
              className={`${isDarkMode ? 'bg-black' : 'bg-white'} border-2 ${isDarkMode ? 'border-white' : 'border-black'}`}
            />
            <Button variant="ghost" asChild className={`${isDarkMode ? 'text-white hover:bg-white/20' : 'text-black hover:bg-black/10'}`}>
              <a href="#features">Recursos</a>
            </Button>
            <Button variant="ghost" asChild className={`${isDarkMode ? 'text-white hover:bg-white/20' : 'text-black hover:bg-black/10'}`}>
              <a href="#stats">Estatísticas</a>
            </Button>
            <Button variant="ghost" asChild className={`${isDarkMode ? 'text-white hover:bg-white/20' : 'text-black hover:bg-black/10'}`}>
              <a href="#pricing">Preços</a>
            </Button>
            {auth.user ? (
              <Button asChild className={`${isDarkMode ? 'bg-white text-black hover:bg-white/80' : 'bg-black text-white hover:bg-black/80'}`}>
                <a href="/dashboard">Painel</a>
              </Button>
            ) : (
              <Button variant="outline" asChild className={`${isDarkMode ? 'border-white text-white hover:bg-white hover:text-black' : 'border-black text-white hover:bg-black hover:text-black'} border-2`}>
                <a href="/login">Login</a>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-4xl md:text-6xl font-bold mb-6"
        >
          Transforme Seu Negócio com Inteligência
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-xl mb-8 max-w-2xl mx-auto"
        >
          Automatize atendimento, engaje clientes e aumente vendas com o ChatBot Pro - 70% das conversas resolvidas sem humanos!
        </motion.p>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="flex justify-center gap-4"
        >
          <Button size="lg" className={`${isDarkMode ? 'bg-white text-black hover:bg-white/80' : 'bg-black text-white hover:bg-black/80'}`}>
            Teste Grátis por 14 Dias
          </Button>
          <Dialog>
            <DialogContent className={`${isDarkMode ? 'bg-black text-white border-white' : 'bg-white text-black border-black'}`}>
              <DialogHeader>
                <DialogTitle>ChatBot Pro em Ação</DialogTitle>
                <DialogDescription className={`${isDarkMode ? 'text-white/80' : 'text-black/80'}`}>
                  Descubra como nosso chatbot revoluciona o atendimento!
                </DialogDescription>
              </DialogHeader>
              <div className="mt-4">
                <div className={`${isDarkMode ? 'bg-white/10' : 'bg-black/10'} w-full h-64 rounded-lg flex items-center justify-center`}>
                  <p className={`${isDarkMode ? 'text-white' : 'text-black'}`}>Video Placeholder</p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </motion.div>
      </section>

      {/* Features Section */}
      <section id="features" className="container mx-auto px-4 py-20">
        <h3 className="text-3xl font-bold text-center mb-12">Por Que o ChatBot Pro?</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.2 }}
              viewport={{ once: true }}
            >
              <Card className={`${isDarkMode ? 'bg-black text-white border-white' : 'bg-white text-black border-black'} h-full hover:shadow-lg transition-shadow`}>
                <CardHeader>
                  <span className="text-4xl mb-2">{feature.icon}</span>
                  <CardTitle>{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>{feature.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Statistics Section */}
      <section id="stats" className={`${isDarkMode ? 'bg-black/90' : 'bg-white/90'} container mx-auto px-4 py-20`}>
        <h3 className="text-3xl font-bold text-center mb-12">Números que Comprovam o Sucesso</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: index * 0.2 }}
              viewport={{ once: true }}
            >
              <Card className={`${isDarkMode ? 'bg-black text-white border-white' : 'bg-white text-black border-black'} text-center`}>
                <CardHeader>
                  <CardTitle className="text-4xl font-bold">{stat.value}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>{stat.label}</p>
                  <p className="text-sm mt-2">Fonte: {stat.source}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
        <p className="text-center mt-8 max-w-2xl mx-auto">
          Chatbots estão revolucionando negócios: economize tempo, reduza custos e aumente a satisfação dos clientes. Junte-se às 987 milhões de pessoas que já usam IA conversacional!
        </p>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="container mx-auto px-4 py-20">
        <h3 className="text-3xl font-bold text-center mb-12">Planos para Todos os Negócios</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {['Básico', 'Pro', 'Enterprise'].map((plan, index) => (
            <motion.div
              key={plan}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: index * 0.2 }}
              viewport={{ once: true }}
            >
              <Card className={`${isDarkMode ? 'bg-black text-white border-white' : 'bg-white text-black border-black'} h-full ${plan === 'Pro' ? 'border-2' : ''}`}>
                <CardHeader>
                  <CardTitle>{plan}</CardTitle>
                  {plan === 'Pro' && <span className="text-sm">Mais Popular</span>}
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold mb-4">
                    {plan === 'Básico' ? '$19' : plan === 'Pro' ? '$49' : '$99'}
                    <span className="text-base font-normal">/mês</span>
                  </p>
                  <ul className="space-y-2">
                    <li>{plan === 'Básico' ? '100 conversas/mês' : plan === 'Pro' ? '500 conversas/mês' : 'Conversas ilimitadas'}</li>
                    <li>{plan === 'Básico' ? '1 integração' : 'Integrações ilimitadas'}</li>
                    <li>{plan === 'Enterprise' ? 'Suporte prioritário 24/7' : 'Suporte básico'}</li>
                  </ul>
                  <Button className={`w-full mt-6 ${isDarkMode ? 'bg-white text-black hover:bg-white/80' : 'bg-black text-white hover:bg-black/80'}`} variant={plan === 'Pro' ? 'default' : 'outline'}>
                    Escolher Plano
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section id="signup" className={`${isDarkMode ? 'bg-black/80' : 'bg-white/80'} container mx-auto px-4 py-20 text-center`}>
        <motion.h3
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-3xl font-bold mb-6"
        >
          Não Perca Mais Clientes
        </motion.h3>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          viewport={{ once: true }}
          className="text-xl mb-8 max-w-2xl mx-auto"
        >
          62% dos consumidores preferem chatbots a esperar por agentes. Comece agora e veja seus resultados decolarem!
        </motion.p>
        <motion.form
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          viewport={{ once: true }}
          onSubmit={handleSubmit}
          className="max-w-md mx-auto flex gap-4"
        >
          <div className="flex-1">
            <Label htmlFor="email" className="sr-only">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Digite seu email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={`${isDarkMode ? 'bg-black text-white border-white' : 'bg-white text-black border-black'} border-2`}
            />
          </div>
          <Button type="submit" className={`${isDarkMode ? 'bg-white text-black hover:bg-white/80' : 'bg-black text-white hover:bg-black/80'}`}>
            Teste Grátis
          </Button>
        </motion.form>
      </section>

      {/* Footer */}
      <footer className="border-t border-black py-6 text-center">
        <p>© 2025 ChatBot Pro. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}