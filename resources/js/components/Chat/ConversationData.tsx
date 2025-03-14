import { memo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface FAQ {
    id?: number;
    question: string;
    answer: string;
}

interface ConversationDataProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    faqs: FAQ[];
    userInfo?: {
        name: string;
        email?: string;
        location?: string;
        browser?: string;
        os?: string;
        lastActive?: string;
        conversationStarted?: string;
    };
    conversationId?: string;
    onDelete?: () => void;
    newMessage?: string;
    setNewMessage?: (message: string) => void;
}

const ConversationData = memo(({ isOpen, setIsOpen, faqs: propFaqs, userInfo, conversationId, onDelete, newMessage, setNewMessage }: ConversationDataProps) => {
    const [showConfirmEndChat, setShowConfirmEndChat] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [faqs, setFaqs] = useState<FAQ[]>(propFaqs);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddFaqModal, setShowAddFaqModal] = useState(false);
    const [showEditFaqModal, setShowEditFaqModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [currentFaq, setCurrentFaq] = useState<FAQ | null>(null);
    const [newFaq, setNewFaq] = useState<{question: string; answer: string}>({question: '', answer: ''});
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    useEffect(() => {
        fetchFaqs();
    }, []);
    
    const fetchFaqs = async () => {
        const cachedFaqs = localStorage.getItem('cachedFaqs');
        if (cachedFaqs) {
            try {
                const parsedFaqs = JSON.parse(cachedFaqs);
                setFaqs(parsedFaqs);
            } catch (e) {
                console.error('Erro ao analisar FAQs em cache:', e);
            }
        }
        
        try {
            const response = await axios.get('/api/chat/faqs');
            setFaqs(response.data);
            localStorage.setItem('cachedFaqs', JSON.stringify(response.data));
        } catch (error) {
            console.error('Error fetching FAQs:', error);
        }
    };

    const toggleOpen = () => {
        setIsOpen(!isOpen);
    };

    const addToMessageInput = (text: string) => {
        if (setNewMessage) {
            setNewMessage(text);
            toast({
                title: "Resposta adicionada",
                description: "Texto adicionado ao campo de mensagem",
            });
        }
    };

    const handleEndChat = async () => {
        if (!conversationId || isDeleting) return;
        setIsDeleting(true);
        try {
            const response = await axios.post('/api/chat/delete', {
                conversation_id: conversationId
            });

            if (response.status === 200) {
                setIsOpen(false);
                onDelete?.();
            }
        } catch (error) {
            console.error('Error deleting chat:', error);
            alert('Erro ao finalizar o chat. Por favor, tente novamente.');
        } finally {
            setIsDeleting(false);
            setShowConfirmEndChat(false);
        }
    };
    
    const handleDeleteFaq = async (id: number) => {
        try {
            await axios.delete(`/api/chat/faqs/${id}`);
            const updatedFaqs = faqs.filter(faq => faq.id !== id);
            setFaqs(updatedFaqs);
            localStorage.setItem('cachedFaqs', JSON.stringify(updatedFaqs));
            setShowDeleteConfirm(false);
            setCurrentFaq(null);
            toast({
                title: "FAQ excluído",
                description: "FAQ removido com sucesso",
            });
        } catch (error) {
            console.error('Error deleting FAQ:', error);
            toast({
                variant: "destructive",
                title: "Erro",
                description: "Não foi possível excluir o FAQ. Tente novamente.",
            });
        }
    };
    
    const confirmDeleteFaq = (faq: FAQ) => {
        setCurrentFaq(faq);
        setShowDeleteConfirm(true);
    };
    
    const handleEditFaq = (faq: FAQ) => {
        setCurrentFaq(faq);
        setNewFaq({
            question: faq.question,
            answer: faq.answer
        });
        setShowEditFaqModal(true);
    };
    
    const submitEditFaq = async () => {
        if (!currentFaq?.id || !newFaq.question || !newFaq.answer) {
            toast({
                variant: "destructive",
                title: "Campos obrigatórios",
                description: "Pergunta e resposta são obrigatórios.",
            });
            return;
        }
        
        setIsSubmitting(true);
        try {
            const response = await axios.put(`/api/chat/faqs/${currentFaq.id}`, newFaq);
            const updatedFaqs = faqs.map(faq => faq.id === currentFaq.id ? response.data : faq);
            setFaqs(updatedFaqs);
            localStorage.setItem('cachedFaqs', JSON.stringify(updatedFaqs));
            setNewFaq({ question: '', answer: '' });
            setShowEditFaqModal(false);
            setCurrentFaq(null);
            toast({
                title: "FAQ atualizado",
                description: "FAQ atualizado com sucesso.",
            });
        } catch (error) {
            console.error('Error updating FAQ:', error);
            toast({
                variant: "destructive",
                title: "Erro",
                description: "Não foi possível atualizar o FAQ. Tente novamente.",
            });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleAddFaq = async () => {
        if (!newFaq.question || !newFaq.answer) {
            toast({
                variant: "destructive",
                title: "Campos obrigatórios",
                description: "Pergunta e resposta são obrigatórios.",
            });
            return;
        }
        
        setIsSubmitting(true);
        try {
            const response = await axios.post('/api/chat/faqs', newFaq);
            const updatedFaqs = [...faqs, response.data];
            setFaqs(updatedFaqs);
            // Atualizar cache
            localStorage.setItem('cachedFaqs', JSON.stringify(updatedFaqs));
            setNewFaq({ question: '', answer: '' });
            setShowAddFaqModal(false);
            toast({
                title: "FAQ adicionado",
                description: "Novo FAQ adicionado com sucesso.",
            });
        } catch (error) {
            console.error('Error adding FAQ:', error);
            toast({
                variant: "destructive",
                title: "Erro",
                description: "Não foi possível adicionar o FAQ. Tente novamente.",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 320 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 320 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="h-full flex flex-col bg-card/95 backdrop-blur-sm border-l border-border/60 shadow-md"
        >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
                <CardTitle className="text-lg font-medium">Detalhes da Conversa</CardTitle>
                <Button
                    onClick={toggleOpen}
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    aria-label="Fechar painel"
                >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                </Button>
            </CardHeader>

            <div className="flex-1 overflow-y-auto p-4 space-y-5 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
                {userInfo && (
                    <div className="space-y-3">
                        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Informações do Usuário</h3>
                        <Card>
                            <CardContent className="p-3">
                                <dl className="space-y-3">
                                    <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 items-center">
                                        <dt className="flex items-center text-sm font-medium text-muted-foreground shrink-0">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                                                <circle cx="12" cy="7" r="4" />
                                            </svg>
                                            Nome:
                                        </dt>
                                        <dd className="text-sm font-medium text-foreground break-all overflow-hidden max-w-full">{userInfo.name}</dd>
                                    </div>
                                    {userInfo.email && (
                                        <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 items-center">
                                            <dt className="flex items-center text-sm font-medium text-muted-foreground shrink-0">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                                    <polyline points="22,6 12,13 2,6" />
                                                </svg>
                                                Email:
                                            </dt>
                                            <dd className="text-sm font-medium text-foreground break-all overflow-hidden max-w-full">{userInfo.email}</dd>
                                        </div>
                                    )}
                                    {/* Adicione outros campos do userInfo seguindo o mesmo padrão */}
                                </dl>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* FAQs */}
                <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">FAQ Rápido</h3>
                        <Button
                            onClick={() => setShowAddFaqModal(true)}
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-full bg-primary/10 hover:bg-primary/20 text-primary"
                            title="Adicionar novo FAQ"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                            </svg>
                        </Button>
                    </div>
                    
                    <div className="relative">
                        <Input
                            type="text"
                            placeholder="Pesquisar FAQs..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full h-8 text-sm"
                        />
                        {searchTerm && (
                            <Button
                                onClick={() => setSearchTerm('')}
                                variant="ghost"
                                size="icon"
                                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground hover:text-foreground"
                            >
                                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </Button>
                        )}
                    </div>
                    
                    <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
                        {faqs
                            .filter(faq => 
                                faq.question.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
                            )
                            .map((faq, index) => (
                            <Card key={faq.id || index} className="group hover:shadow-md transition-all">
                                <CardContent className="p-4 pb-2">
                                    <div className="flex justify-between items-start gap-2">
                                        <div className="flex-1">
                                            <div className="flex justify-between mb-1">
                                                <p className="text-sm font-medium text-foreground">{faq.question}</p>
                                                <div className="flex space-x-1">
                                                    <Button
                                                        onClick={() => handleEditFaq(faq)}
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 text-muted-foreground hover:text-primary"
                                                        title="Editar FAQ"
                                                    >
                                                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                                                        </svg>
                                                    </Button>
                                                    {faq.id && (
                                                        <Button
                                                            onClick={() => confirmDeleteFaq(faq)}
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                                            title="Excluir FAQ"
                                                        >
                                                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                                            </svg>
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                            <p className="text-sm text-muted-foreground leading-relaxed mb-3">{faq.answer}</p>
                                        </div>
                                    </div>
                                    <div className="flex justify-end">
                                        <Button
                                            onClick={() => addToMessageInput(faq.answer)}
                                            variant="ghost"
                                            size="sm"
                                            className="text-xs font-normal text-muted-foreground hover:text-foreground hover:bg-background/40 border border-border/30 shadow-sm"
                                        >
                                            <svg className="h-3.5 w-3.5 mr-1 text-primary/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                            </svg>
                                            Usar na mensagem
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                        
                        {faqs.filter(faq => 
                            faq.question.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
                        ).length === 0 && (
                            <div className="text-center py-3 text-sm text-muted-foreground">
                                Nenhum FAQ encontrado para <span className="font-medium">"{searchTerm}"</span>
                            </div>
                        )}
                    </div>
                </div>

                <Separator className="my-2" />
                
                {/* Botão de Finalizar */}
                <div className="pt-2">
                    <Button
                        onClick={() => setShowConfirmEndChat(true)}
                        variant="destructive"
                        className="w-full"
                    >
                        Finalizar Conversa
                    </Button>
                </div>
            </div>

            <AlertDialog open={showConfirmEndChat} onOpenChange={setShowConfirmEndChat}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Finalizar Conversa</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja encerrar permanentemente esta conversa? Todas as mensagens serão excluídas.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleEndChat}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Finalizando...
                                </>
                            ) : (
                                'Confirmar'
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
            <Dialog open={showAddFaqModal} onOpenChange={setShowAddFaqModal}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Adicionar novo FAQ</DialogTitle>
                        <DialogDescription>
                            Adicione uma pergunta e resposta para o FAQ rápido.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="question">Pergunta</Label>
                            <Input
                                id="question"
                                value={newFaq.question}
                                onChange={(e) => setNewFaq({...newFaq, question: e.target.value})}
                                placeholder="Digite a pergunta"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="answer">Resposta</Label>
                            <Textarea
                                id="answer"
                                value={newFaq.answer}
                                onChange={(e) => setNewFaq({...newFaq, answer: e.target.value})}
                                placeholder="Digite a resposta"
                                rows={4}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAddFaqModal(false)} disabled={isSubmitting}>Cancelar</Button>
                        <Button onClick={handleAddFaq} disabled={isSubmitting}>
                            {isSubmitting ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Salvando...
                                </>
                            ) : (
                                'Salvar'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            
            <Dialog open={showEditFaqModal} onOpenChange={setShowEditFaqModal}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Editar FAQ</DialogTitle>
                        <DialogDescription>
                            Edite a pergunta e resposta do FAQ.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="edit-question">Pergunta</Label>
                            <Input
                                id="edit-question"
                                value={newFaq.question}
                                onChange={(e) => setNewFaq({...newFaq, question: e.target.value})}
                                placeholder="Digite a pergunta"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-answer">Resposta</Label>
                            <Textarea
                                id="edit-answer"
                                value={newFaq.answer}
                                onChange={(e) => setNewFaq({...newFaq, answer: e.target.value})}
                                placeholder="Digite a resposta"
                                rows={4}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowEditFaqModal(false)} disabled={isSubmitting}>Cancelar</Button>
                        <Button onClick={submitEditFaq} disabled={isSubmitting}>
                            {isSubmitting ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Salvando...
                                </>
                            ) : (
                                'Salvar'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            
            <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir FAQ</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja excluir este FAQ? Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => currentFaq?.id && handleDeleteFaq(currentFaq.id)}
                            disabled={isSubmitting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isSubmitting ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Excluindo...
                                </>
                            ) : (
                                'Excluir'
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </motion.div>
    );
});

export default ConversationData;
